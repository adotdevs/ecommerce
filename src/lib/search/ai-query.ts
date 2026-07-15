import { openAiChatJson, isOpenAiConfigured } from "@/lib/ai/openai-client";

export interface AiSearchEnhancement {
  originalQuery: string;
  primaryQuery: string;
  alternateQueries: string[];
  categoryHints: string[];
  brandHints: string[];
  source: "ai" | "fallback";
}

const queryCache = new Map<string, { at: number; data: AiSearchEnhancement }>();
/** Long TTL so repeated typos / related searches reuse one rewrite. */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const inflight = new Map<string, Promise<AiSearchEnhancement>>();

function fallbackEnhancement(query: string): AiSearchEnhancement {
  const raw = query.trim();
  return {
    originalQuery: raw,
    primaryQuery: raw,
    alternateQueries: [],
    categoryHints: [],
    brandHints: [],
    source: "fallback",
  };
}

/** Read a recently cached AI enhancement without calling OpenAI. */
export function getCachedEnhancement(query: string): AiSearchEnhancement | null {
  const raw = query.trim();
  if (raw.length < 2) return null;

  const cached = queryCache.get(raw.toLowerCase());
  if (!cached || Date.now() - cached.at >= CACHE_TTL_MS) return null;
  return cached.data;
}

/**
 * Non-blocking: returns cache or literal query.
 * Does NOT call OpenAI (saves tokens on autocomplete keystrokes).
 */
export function resolveSearchEnhancement(query: string): AiSearchEnhancement {
  const raw = query.trim();
  return getCachedEnhancement(raw) ?? fallbackEnhancement(raw);
}

/**
 * Await AI rewrite once when local matchers need help (typos / related intent).
 * Dedupes concurrent calls for the same query.
 */
export async function resolveSearchEnhancementAsync(
  query: string,
  opts?: { force?: boolean }
): Promise<AiSearchEnhancement> {
  const raw = query.trim();
  if (raw.length < 2) return fallbackEnhancement(raw);

  const cached = getCachedEnhancement(raw);
  if (cached && (!opts?.force || cached.source === "ai")) return cached;

  if (!isOpenAiConfigured()) return fallbackEnhancement(raw);

  return enhanceSearchQuery(raw);
}

/** @deprecated Prefer resolveSearchEnhancement (no prefetch) to avoid token waste. */
export function prefetchEnhancement(query: string): void {
  const raw = query.trim();
  if (raw.length < 2 || !isOpenAiConfigured()) return;
  if (getCachedEnhancement(raw)) return;

  const key = raw.toLowerCase();
  if (inflight.has(key)) return;

  const promise = enhanceSearchQuery(raw).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  void promise;
}

/** Use OpenAI to fix typos and expand related product terms — minimal tokens. */
export async function enhanceSearchQuery(
  query: string
): Promise<AiSearchEnhancement> {
  const raw = query.trim();
  if (raw.length < 2) return fallbackEnhancement(raw);
  if (!isOpenAiConfigured()) return fallbackEnhancement(raw);

  const cacheKey = raw.toLowerCase();
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  const existing = inflight.get(cacheKey);
  if (existing) return existing;

  const promise = (async (): Promise<AiSearchEnhancement> => {
    try {
      const parsed = await openAiChatJson<{
        primaryQuery?: string;
        alternateQueries?: string[];
        categoryHints?: string[];
        brandHints?: string[];
      }>(
        // Keep system prompt short to save tokens.
        `Fix e-commerce search typos and return JSON:
{"primaryQuery":"corrected product phrase","alternateQueries":["related term"],"categoryHints":[],"brandHints":[]}
Rules: fix spelling, expand abbreviations, keep shopping intent. Max 3 alternates. No dashes.`,
        raw,
        { temperature: 0, maxTokens: 120 }
      );

      const primary = parsed?.primaryQuery?.trim();
      if (!parsed || !primary) return fallbackEnhancement(raw);

      const alternateQueries = [
        ...new Set(
          (parsed.alternateQueries ?? [])
            .map((term) => String(term).trim())
            .filter((term) => term.length >= 2)
        ),
      ]
        .filter((term) => term.toLowerCase() !== primary.toLowerCase())
        .slice(0, 3);

      const result: AiSearchEnhancement = {
        originalQuery: raw,
        primaryQuery: primary,
        alternateQueries,
        categoryHints: (parsed.categoryHints ?? [])
          .map((hint) => String(hint).trim())
          .filter(Boolean)
          .slice(0, 2),
        brandHints: (parsed.brandHints ?? [])
          .map((hint) => String(hint).trim())
          .filter(Boolean)
          .slice(0, 2),
        source: "ai",
      };

      queryCache.set(cacheKey, { at: Date.now(), data: result });
      return result;
    } catch {
      return fallbackEnhancement(raw);
    }
  })();

  inflight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(cacheKey);
  }
}

/** Distinct query strings to run through the existing search matchers. */
export function getSearchQueriesForMatching(
  enhancement: AiSearchEnhancement
): string[] {
  return [
    ...new Set(
      [
        enhancement.primaryQuery,
        ...enhancement.alternateQueries,
        enhancement.originalQuery,
      ]
        .map((q) => q.trim())
        .filter((q) => q.length >= 2)
    ),
  ];
}

/** Lowercase terms for simple client-side / directory filters. */
export function getSearchTermsForFilter(
  enhancement: AiSearchEnhancement
): string[] {
  return [
    ...new Set(
      [
        ...getSearchQueriesForMatching(enhancement),
        ...enhancement.categoryHints,
        ...enhancement.brandHints,
      ]
        .map((term) => term.trim().toLowerCase())
        .filter((term) => term.length >= 2)
    ),
  ];
}
