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
const CACHE_TTL_MS = 60_000;

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

/** Read a recently cached AI enhancement without waiting on OpenAI. */
export function getCachedEnhancement(query: string): AiSearchEnhancement | null {
  const raw = query.trim();
  if (raw.length < 2) return null;

  const cached = queryCache.get(raw.toLowerCase());
  if (!cached || Date.now() - cached.at >= CACHE_TTL_MS) return null;
  return cached.data;
}

const inflight = new Map<string, Promise<AiSearchEnhancement>>();

/** Warm the AI enhancement cache without blocking the current request. */
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

/** Fast enhancement for live search: cached AI if ready, otherwise literal query. */
export function resolveSearchEnhancement(query: string): AiSearchEnhancement {
  const raw = query.trim();
  prefetchEnhancement(raw);
  return getCachedEnhancement(raw) ?? fallbackEnhancement(raw);
}

/** Use OpenAI to rewrite shopper queries into better product search terms. */
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

  try {
    const parsed = await openAiChatJson<{
      primaryQuery?: string;
      alternateQueries?: string[];
      categoryHints?: string[];
      brandHints?: string[];
    }>(
      `You improve e-commerce product search queries. Return JSON only:
{
  "primaryQuery": "best rewritten search phrase for matching products",
  "alternateQueries": ["synonym or related product term"] (2-5 concrete terms),
  "categoryHints": ["category if obvious"],
  "brandHints": ["brand if mentioned or strongly implied"]
}
Rules: fix typos, expand abbreviations, keep shopping intent. Never use em dashes or en dashes. If the query is already clear, keep primaryQuery close to the input. alternateQueries must help find relevant products.`,
      `Shopper search: ${raw}`,
      { temperature: 0.2 }
    );

    const primary = parsed?.primaryQuery?.trim();
    if (!parsed || !primary) return fallbackEnhancement(raw);

    const alternateQueries = [...new Set(
      (parsed.alternateQueries ?? [])
        .map((term) => String(term).trim())
        .filter((term) => term.length >= 2)
    )]
      .filter((term) => term.toLowerCase() !== primary.toLowerCase())
      .slice(0, 5);

    const result: AiSearchEnhancement = {
      originalQuery: raw,
      primaryQuery: primary,
      alternateQueries,
      categoryHints: (parsed.categoryHints ?? [])
        .map((hint) => String(hint).trim())
        .filter(Boolean)
        .slice(0, 3),
      brandHints: (parsed.brandHints ?? [])
        .map((hint) => String(hint).trim())
        .filter(Boolean)
        .slice(0, 3),
      source: "ai",
    };

    queryCache.set(cacheKey, { at: Date.now(), data: result });
    return result;
  } catch {
    return fallbackEnhancement(raw);
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
