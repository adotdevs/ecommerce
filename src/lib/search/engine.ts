import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { Brand } from "@/models/Brand";
import { MAX_CANDIDATES } from "@/lib/search/config";
import {
  isModelLike,
  isStopword,
  normalizeQuery,
  tokenVariants,
} from "@/lib/search/normalize";
import { rankProducts, wordMatchesToken } from "@/lib/search/relevance";
import { correctQueryTokens } from "@/lib/search/vocabulary";
import {
  resolveSearchEnhancement,
  resolveSearchEnhancementAsync,
  type AiSearchEnhancement,
} from "@/lib/search/ai-query";

const SELECT =
  "name slug sku pricing media brandName categoryNames tags shortDescription featured onSale flashSale isNewArrival freeShipping rating inventory createdAt variants variantOptions specifications highlights";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fieldClause(term: string): Record<string, unknown> {
  const re = new RegExp(`(?:^|[\\s\\-_/])${escapeRegex(term)}`, "i");
  return {
    $or: [
      { name: re },
      { slug: re },
      { brandName: re },
      { categoryNames: re },
      { tags: re },
      { sku: new RegExp(`^${escapeRegex(term)}`, "i") },
    ],
  };
}

function usableVariants(token: string): string[] {
  return [
    ...new Set(tokenVariants(token).map((t) => t.trim().toLowerCase())),
  ].filter((t) => (t.length >= 3 || isModelLike(t)) && !isStopword(t));
}

/** Structured-field lexical filter. Description is never queried. */
function lexicalFilter(tokens: string[]): Record<string, unknown> | null {
  const groups = tokens.map(usableVariants).filter((group) => group.length > 0);
  if (!groups.length) return null;

  const orGroup = (group: string[]) =>
    group.length === 1
      ? fieldClause(group[0])
      : { $or: group.map((term) => fieldClause(term)) };

  if (groups.length === 1) return orGroup(groups[0]);
  return { $and: groups.map(orGroup) };
}

function prefixFilter(token: string): Record<string, unknown> | null {
  if (token.length < 2 || isStopword(token)) return null;
  const re = new RegExp(`(?:^|[\\s\\-_/])${escapeRegex(token)}`, "i");
  return { $or: [{ name: re }, { brandName: re }, { slug: re }, { tags: re }] };
}

async function findByFilter(
  filter: Record<string, unknown> | null,
  baseFilter: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  if (!filter) return [];
  const docs = await Product.find({ ...baseFilter, ...filter })
    .select(SELECT)
    .limit(MAX_CANDIDATES)
    .lean();
  return docs as unknown as Record<string, unknown>[];
}

async function fetchCandidates(
  tokens: string[],
  baseFilter: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  return findByFilter(lexicalFilter(tokens), baseFilter);
}

function mergeUnique(
  existing: Record<string, unknown>[],
  incoming: Record<string, unknown>[]
) {
  const seen = new Set(existing.map((p) => String(p._id)));
  const out = [...existing];
  for (const p of incoming) {
    const id = String(p._id);
    if (!seen.has(id)) {
      out.push(p);
      seen.add(id);
    }
  }
  return out;
}

function enhancementQueries(enhancement: AiSearchEnhancement): string[] {
  return [
    ...new Set(
      [enhancement.primaryQuery, ...enhancement.alternateQueries]
        .map((q) => q.trim())
        .filter((q) => q.length >= 2)
    ),
  ].slice(0, 4);
}

function applyExcludeTerms(
  ranked: ReturnType<typeof rankProducts>,
  enhancement: AiSearchEnhancement,
  queryTokens: string[]
) {
  const excludes = (enhancement.excludeTerms ?? []).filter((t) => t.length >= 4);
  if (!excludes.length) return ranked;

  return ranked.filter((row) => {
    const bag = [
      String(row.product.name ?? ""),
      String(row.product.brandName ?? ""),
      ...(Array.isArray(row.product.categoryNames) ? row.product.categoryNames : []),
    ]
      .join(" ")
      .toLowerCase()
      .split(/[\s\-_\/]+/)
      .filter((w) => w.length >= 3);

    const excluded = excludes.some((ex) =>
      bag.some((word) => wordMatchesToken(ex, String(word)))
    );
    if (!excluded) return true;
    return row.hit.signals.titleTokens >= queryTokens.length;
  });
}

export interface EngineResult {
  products: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  source: "ai" | "fallback";
  enhancedQuery?: string;
  correctedQuery?: string;
}

export async function executeProductSearch(
  rawQuery: string,
  baseFilter: Record<string, unknown>,
  page = 1,
  limit = 12,
  opts?: { allowAi?: boolean }
): Promise<EngineResult> {
  const allowAi = opts?.allowAi !== false;
  const q = rawQuery.trim();
  if (q.length < 2) {
    return {
      products: [],
      total: 0,
      page,
      limit,
      pages: 1,
      source: "fallback",
    };
  }

  const parsed = normalizeQuery(q);
  const corrected = await correctQueryTokens(parsed.meaningfulTokens);
  const correctedQuery = corrected.join(" ");

  let candidates = mergeUnique(
    await fetchCandidates(parsed.meaningfulTokens, baseFilter),
    await fetchCandidates(corrected, baseFilter)
  );

  if (!candidates.length) {
    const longest = [...parsed.meaningfulTokens, ...corrected].sort(
      (a, b) => b.length - a.length
    )[0];
    if (longest && longest.length >= 4) {
      candidates = await findByFilter(
        prefixFilter(longest.slice(0, Math.min(longest.length, 5))),
        baseFilter
      );
    } else if (longest && longest.length >= 2) {
      candidates = await findByFilter(prefixFilter(longest), baseFilter);
    }
  }

  let enhancement = resolveSearchEnhancement(q);
  if (enhancement.source === "ai") {
    for (const extra of enhancementQueries(enhancement)) {
      const tokens = normalizeQuery(extra).meaningfulTokens;
      candidates = mergeUnique(
        candidates,
        await fetchCandidates(tokens, baseFilter)
      );
    }
  }

  let ranked = rankProducts(candidates, correctedQuery || q);
  if (correctedQuery && correctedQuery !== parsed.normalized) {
    const extra = rankProducts(candidates, q);
    const seen = new Set(ranked.map((r) => String(r.product._id)));
    for (const row of extra) {
      if (!seen.has(String(row.product._id))) ranked.push(row);
    }
    ranked.sort((a, b) => b.hit.score - a.hit.score);
  }

  const needsAi =
    allowAi && (parsed.hasNonAscii || ranked.length === 0);
  if (needsAi) {
    enhancement = await resolveSearchEnhancementAsync(q);
    if (enhancement.source === "ai") {
      for (const extra of enhancementQueries(enhancement)) {
        const tokens = normalizeQuery(extra).meaningfulTokens;
        candidates = mergeUnique(
          candidates,
          await fetchCandidates(tokens, baseFilter)
        );
      }
      ranked = rankProducts(
        candidates,
        enhancement.primaryQuery || correctedQuery || q
      );
      ranked = applyExcludeTerms(
        ranked,
        enhancement,
        normalizeQuery(enhancement.primaryQuery || q).meaningfulTokens
      );
    }
  }

  if (process.env.SEARCH_DEBUG === "1") {
    console.info(
      "[search]",
      JSON.stringify({
        q,
        correctedQuery,
        candidates: candidates.length,
        kept: ranked.length,
        top: ranked.slice(0, 5).map((r) => ({
          name: r.product.name,
          score: Number(r.hit.score.toFixed(3)),
          coverage: r.hit.coverage,
          signals: r.hit.signals,
        })),
      })
    );
  }

  const total = ranked.length;
  const skip = (page - 1) * limit;
  const pageRows = ranked.slice(skip, skip + limit);

  const enhanced =
    enhancement.source === "ai" &&
    enhancement.primaryQuery.toLowerCase() !== q.toLowerCase()
      ? enhancement.primaryQuery
      : correctedQuery !== parsed.normalized
        ? correctedQuery
        : undefined;

  return {
    products: pageRows.map((r) => r.product),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    source: enhancement.source,
    enhancedQuery: enhanced,
    correctedQuery:
      correctedQuery !== parsed.normalized ? correctedQuery : undefined,
  };
}

export async function suggestFromEngine(query: string, productLimit: number) {
  const result = await executeProductSearch(
    query,
    { status: "published" },
    1,
    productLimit,
    { allowAi: false }
  );

  const products = result.products.map((p) => ({
    type: "product" as const,
    id: String(p._id),
    name: String(p.name ?? ""),
    slug: String(p.slug ?? ""),
    href: `/products/${p.slug}`,
    image: Array.isArray(p.media)
      ? String((p.media[0] as { url?: string } | undefined)?.url ?? "")
      : undefined,
    price: (p.pricing as { price?: number } | undefined)?.price,
    subtitle: String(p.brandName ?? ""),
  }));

  const tokens = normalizeQuery(query).meaningfulTokens;
  const term = tokens[0] ?? query;
  const re = new RegExp(`(?:^|[\\s\\-_/])${escapeRegex(term)}`, "i");

  const [categories, brands] = await Promise.all([
    term.length >= 2
      ? Category.find({ $or: [{ name: re }, { slug: re }] })
          .select("name slug image")
          .limit(3)
          .lean()
      : [],
    term.length >= 2
      ? Brand.find({ $or: [{ name: re }, { slug: re }] })
          .select("name slug logo")
          .limit(3)
          .lean()
      : [],
  ]);

  return {
    products,
    categories: categories.map((c) => ({
      type: "category" as const,
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      href: `/categories/${c.slug}`,
      image: c.image,
    })),
    brands: brands.map((b) => ({
      type: "brand" as const,
      id: String(b._id),
      name: b.name,
      slug: b.slug,
      href: `/products?brand=${encodeURIComponent(b.name)}`,
      image: b.logo,
    })),
    source: result.source,
    enhancedQuery: result.enhancedQuery,
  };
}
