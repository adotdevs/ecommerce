import { levenshtein } from "@/lib/search/fuzzy";
import {
  ACCESSORY_TERMS,
  MIN_RELEVANCE_SCORE,
  MIN_TOKEN_COVERAGE_MULTI,
  MIN_TOKEN_COVERAGE_SINGLE,
  SEARCH_WEIGHTS,
} from "@/lib/search/config";
import {
  isModelLike,
  normalizeQuery,
  singularize,
  tokenVariants,
  type NormalizedQuery,
} from "@/lib/search/normalize";

export interface SearchSignals {
  exactSku: number;
  exactTitle: number;
  titlePhrase: number;
  titleTokens: number;
  brandTokens: number;
  categoryTokens: number;
  tagTokens: number;
  skuTokens: number;
  tokenCoverage: number;
  accessoryPenalty: number;
}

export interface RankedHit {
  score: number;
  coverage: number;
  signals: SearchSignals;
}

function words(value: unknown): string[] {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

function fieldWords(product: Record<string, unknown>) {
  const specs = Array.isArray(product.specifications)
    ? product.specifications.flatMap((row) => {
        const spec = row as { key?: string; value?: string };
        return words(`${spec.key ?? ""} ${spec.value ?? ""}`);
      })
    : [];
  const highlights = Array.isArray(product.highlights)
    ? product.highlights.flatMap((h) => words(h))
    : [];

  return {
    title: words(product.name),
    brand: words(product.brandName),
    category: (Array.isArray(product.categoryNames) ? product.categoryNames : [])
      .flatMap((c) => words(c)),
    tags: (Array.isArray(product.tags) ? product.tags : []).flatMap((t) => words(t)),
    attrs: [...specs, ...highlights],
    sku: String(product.sku ?? "").toLowerCase(),
    slug: words(String(product.slug ?? "").replace(/-/g, " ")),
  };
}

/** Safe word match — no substring-in-description, no 3-letter prefix into "top load". */
export function wordMatchesToken(token: string, word: string): boolean {
  if (!token || !word) return false;
  const t = token.toLowerCase();
  const w = word.toLowerCase();
  if (w === t) return true;
  if (singularize(w) === singularize(t)) return true;

  if (isModelLike(t)) {
    return w === t || w.startsWith(t) || t.startsWith(w);
  }

  if (t.length >= 3 && w.startsWith(t)) return true;
  if (t.length >= 5 && w.length >= 5 && t.startsWith(w)) return true;

  // Compound apparel: tshirt ↔ shirt
  if (
    t.length >= 4 &&
    w.length - t.length <= 2 &&
    w.length > t.length &&
    w.endsWith(t)
  ) {
    return true;
  }

  if (t.length >= 5 && Math.abs(w.length - t.length) <= 2) {
    const d = levenshtein(t, w);
    if (d === 1) return true;
    if (t.length >= 6 && d === 2) return true;
  }

  return false;
}

function anyWordMatch(token: string, list: string[]): boolean {
  const variants = tokenVariants(token);
  return list.some((word) => variants.some((v) => wordMatchesToken(v, word)));
}

function looksLikeAccessory(fields: ReturnType<typeof fieldWords>): boolean {
  const bag = [...fields.title, ...fields.category, ...fields.tags];
  return bag.some((w) => ACCESSORY_TERMS.includes(w as (typeof ACCESSORY_TERMS)[number]));
}

export function scoreProductAgainstQuery(
  product: Record<string, unknown>,
  query: NormalizedQuery
): RankedHit | null {
  const fields = fieldWords(product);
  const titleText = String(product.name ?? "").toLowerCase();
  const q = query.normalized;
  const tokens = query.meaningfulTokens;
  if (!tokens.length) return null;

  if (fields.sku && (fields.sku === q.replace(/\s+/g, "") || fields.sku === query.original.toLowerCase())) {
    return {
      score: SEARCH_WEIGHTS.exactSku,
      coverage: 1,
      signals: {
        exactSku: 1,
        exactTitle: 0,
        titlePhrase: 0,
        titleTokens: 0,
        brandTokens: 0,
        categoryTokens: 0,
        tagTokens: 0,
        skuTokens: 1,
        tokenCoverage: 1,
        accessoryPenalty: 0,
      },
    };
  }

  let titleHits = 0;
  let brandHits = 0;
  let categoryHits = 0;
  let tagHits = 0;
  let skuHits = 0;
  let matched = 0;

  for (const token of tokens) {
    const inTitle = anyWordMatch(token, fields.title) || anyWordMatch(token, fields.slug);
    const inBrand = anyWordMatch(token, fields.brand);
    const inCat = anyWordMatch(token, fields.category);
    const inTag = anyWordMatch(token, fields.tags);
    const inAttr = anyWordMatch(token, fields.attrs);
    const inSku = fields.sku.includes(token);

    if (inTitle) titleHits++;
    if (inBrand) brandHits++;
    if (inCat) categoryHits++;
    if (inTag) tagHits++;
    if (inSku) skuHits++;

    if (inTitle || inBrand || inCat || inTag || inSku || inAttr) matched++;
  }

  const coverage = matched / tokens.length;
  const minCoverage =
    tokens.length === 1 ? MIN_TOKEN_COVERAGE_SINGLE : MIN_TOKEN_COVERAGE_MULTI;

  if (coverage < minCoverage) return null;
  if (titleHits + brandHits + categoryHits + skuHits === 0) return null;
  if (
    tokens.length === 1 &&
    tokens[0].length <= 3 &&
    titleHits + brandHits + skuHits === 0
  ) {
    return null;
  }

  const exactTitle = titleText === q || titleText === query.original.toLowerCase() ? 1 : 0;
  const titlePhrase = q.length >= 4 && titleText.includes(q) ? 1 : 0;

  let score =
    exactTitle * SEARCH_WEIGHTS.exactTitle +
    titlePhrase * SEARCH_WEIGHTS.titlePhrase +
    (titleHits / tokens.length) * SEARCH_WEIGHTS.titleToken * tokens.length +
    (brandHits / tokens.length) * SEARCH_WEIGHTS.brandToken * tokens.length +
    (categoryHits / tokens.length) * SEARCH_WEIGHTS.categoryToken * tokens.length +
    (tagHits / tokens.length) * SEARCH_WEIGHTS.tagToken * tokens.length +
    (skuHits / tokens.length) * SEARCH_WEIGHTS.skuToken * tokens.length +
    coverage * 0.2;

  if (product.featured) score += SEARCH_WEIGHTS.featuredBonus;

  let accessoryPenalty = 0;
  if (!query.hasAccessoryIntent && looksLikeAccessory(fields)) {
    accessoryPenalty = 0.55;
    score *= 1 - accessoryPenalty;
  }

  if (score < MIN_RELEVANCE_SCORE) return null;

  return {
    score,
    coverage,
    signals: {
      exactSku: 0,
      exactTitle,
      titlePhrase,
      titleTokens: titleHits,
      brandTokens: brandHits,
      categoryTokens: categoryHits,
      tagTokens: tagHits,
      skuTokens: skuHits,
      tokenCoverage: coverage,
      accessoryPenalty,
    },
  };
}

export function rankProducts(
  products: Record<string, unknown>[],
  rawQuery: string
): { product: Record<string, unknown>; hit: RankedHit }[] {
  const query = normalizeQuery(rawQuery);
  const ranked: { product: Record<string, unknown>; hit: RankedHit }[] = [];

  for (const product of products) {
    const hit = scoreProductAgainstQuery(product, query);
    if (hit) ranked.push({ product, hit });
  }

  ranked.sort((a, b) => {
    if (b.hit.score !== a.hit.score) return b.hit.score - a.hit.score;
    if (b.hit.coverage !== a.hit.coverage) return b.hit.coverage - a.hit.coverage;
    if (b.hit.signals.titleTokens !== a.hit.signals.titleTokens) {
      return b.hit.signals.titleTokens - a.hit.signals.titleTokens;
    }
    return a.hit.signals.accessoryPenalty - b.hit.signals.accessoryPenalty;
  });
  return ranked;
}

export { normalizeQuery };
