import { SEARCH_STOPWORDS, SEARCH_SYNONYMS } from "@/lib/search/config";

export interface NormalizedQuery {
  original: string;
  normalized: string;
  tokens: string[];
  meaningfulTokens: string[];
  hasAccessoryIntent: boolean;
  looksLikeSku: boolean;
  hasNonAscii: boolean;
}

export function tokenize(text: string): string[] {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 1);
}

export function singularize(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("ses") || token.endsWith("xes") || token.endsWith("zes")) {
    return token.slice(0, -2);
  }
  if (token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function pluralize(token: string): string {
  if (token.endsWith("s")) return token;
  if (token.endsWith("y") && token.length > 2) return `${token.slice(0, -1)}ies`;
  return `${token}s`;
}

export function tokenVariants(token: string): string[] {
  const base = singularize(token);
  const variants = new Set<string>([token, base, pluralize(base)]);
  for (const syn of SEARCH_SYNONYMS[token] ?? []) variants.add(syn);
  for (const syn of SEARCH_SYNONYMS[base] ?? []) variants.add(syn);
  return [...variants];
}

export function isStopword(token: string): boolean {
  return SEARCH_STOPWORDS.has(token);
}

export function isModelLike(token: string): boolean {
  return /\d/.test(token) || /^[a-z]\d/i.test(token);
}

const UNIT_MAP: Record<string, string> = {
  watt: "w",
  watts: "w",
  gb: "gb",
  tb: "tb",
  mb: "mb",
  inch: "inch",
  inches: "inch",
  in: "inch",
};

/** Collapse "20 watt" → "20w" so model/capacity tokens stay intact. */
export function collapseUnitTokens(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const next = tokens[i + 1];
    const unit = next ? UNIT_MAP[next] : undefined;
    if (unit && /^\d+$/.test(tokens[i])) {
      out.push(`${tokens[i]}${unit}`);
      i++;
      continue;
    }
    out.push(tokens[i]);
  }
  return out;
}

export function normalizeQuery(raw: string): NormalizedQuery {
  const original = raw.trim();
  const tokens = collapseUnitTokens(tokenize(original));
  const meaningfulTokens = tokens.filter((t) => !isStopword(t) && t.length >= 2);
  const normalized = meaningfulTokens.join(" ") || tokens.join(" ");

  return {
    original,
    normalized,
    tokens,
    meaningfulTokens: meaningfulTokens.length ? meaningfulTokens : tokens,
    hasAccessoryIntent: tokens.some((t) =>
      ["case", "cover", "charger", "cable", "protector", "adapter", "skin"].includes(
        singularize(t)
      )
    ),
    looksLikeSku: tokens.length === 1 && /[a-z0-9-]{4,}/i.test(tokens[0] ?? "") && /\d/.test(tokens[0] ?? ""),
    hasNonAscii: /[^\u0000-\u007f]/.test(original),
  };
}
