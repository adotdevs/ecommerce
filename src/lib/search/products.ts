import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { Brand } from "@/models/Brand";
import { fuzzyMatchScore } from "@/lib/search/fuzzy";
import {
  getSearchQueriesForMatching,
  resolveSearchEnhancement,
  type AiSearchEnhancement,
} from "@/lib/search/ai-query";

export interface SearchFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
}

export type SearchSuggestionType = "product" | "category" | "brand";

export interface SearchSuggestion {
  type: SearchSuggestionType;
  id: string;
  name: string;
  slug: string;
  href: string;
  image?: string;
  price?: number;
  subtitle?: string;
}

export interface SearchSuggestionsResult {
  query: string;
  suggestions: SearchSuggestion[];
  products: SearchSuggestion[];
  categories: SearchSuggestion[];
  brands: SearchSuggestion[];
  source?: "ai" | "fallback";
  enhancedQuery?: string;
}

async function collectProductSuggestions(
  queries: string[],
  productLimit: number
): Promise<SearchSuggestion[]> {
  const products: SearchSuggestion[] = [];
  const seen = new Set<string>();

  for (const searchQuery of queries) {
    let batch = await regexSuggestProducts(searchQuery, productLimit);

    if (batch.length < productLimit) {
      try {
        const atlas = await atlasSuggestProducts(
          searchQuery,
          productLimit - batch.length
        );
        const atlasSeen = new Set(batch.map((p) => p.id));
        for (const item of atlas) {
          if (!atlasSeen.has(item.id)) {
            batch.push(item);
            atlasSeen.add(item.id);
          }
        }
      } catch {
        /* atlas unavailable */
      }
    }

    for (const item of batch) {
      if (!seen.has(item.id)) {
        products.push(item);
        seen.add(item.id);
      }
    }

    if (products.length >= productLimit) break;
  }

  return products.slice(0, productLimit);
}

async function collectCategorySuggestions(
  enhancement: AiSearchEnhancement,
  limit: number
): Promise<SearchSuggestion[]> {
  const queries = [
    enhancement.primaryQuery,
    ...enhancement.alternateQueries,
    ...enhancement.categoryHints,
  ];
  const categories: SearchSuggestion[] = [];
  const seen = new Set<string>();

  for (const searchQuery of queries) {
    const batch = await suggestCategories(searchQuery, limit);
    for (const item of batch) {
      if (!seen.has(item.id)) {
        categories.push(item);
        seen.add(item.id);
      }
    }
    if (categories.length >= limit) break;
  }

  return categories.slice(0, limit);
}

async function collectBrandSuggestions(
  enhancement: AiSearchEnhancement,
  limit: number
): Promise<SearchSuggestion[]> {
  const queries = [
    enhancement.primaryQuery,
    ...enhancement.alternateQueries,
    ...enhancement.brandHints,
  ];
  const brands: SearchSuggestion[] = [];
  const seen = new Set<string>();

  for (const searchQuery of queries) {
    const batch = await suggestBrands(searchQuery, limit);
    for (const item of batch) {
      if (!seen.has(item.id)) {
        brands.push(item);
        seen.add(item.id);
      }
    }
    if (brands.length >= limit) break;
  }

  return brands.slice(0, limit);
}

const PRODUCT_SEARCH_FIELDS = [
  "name",
  "slug",
  "sku",
  "brandName",
  "categoryNames",
  "tags",
  "shortDescription",
  "description",
  "seo.title",
  "media.alt",
] as const;

/** Split query into lowercase tokens (handles "head phone", "head-phone", etc.). */
export function tokenizeSearchQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 1);
}

function fieldMatchOr(fields: readonly string[], regex: RegExp) {
  return { $or: fields.map((field) => ({ [field]: regex })) };
}

/** Flexible match: every token anywhere, compact gaps, or flexible spacing. */
function buildFlexibleTextFilter(
  fields: readonly string[],
  query: string
): Record<string, unknown> | null {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return null;

  const clauses: Record<string, unknown>[] = [];

  if (tokens.length === 1) {
    clauses.push(fieldMatchOr(fields, new RegExp(escapeRegex(tokens[0]), "i")));
  } else {
    // "head" + "phone" both appear somewhere → matches "headphones"
    clauses.push({
      $and: tokens.map((token) =>
        fieldMatchOr(fields, new RegExp(escapeRegex(token), "i"))
      ),
    });
    // Optional characters between tokens: head.*phone
    clauses.push(
      fieldMatchOr(
        fields,
        new RegExp(tokens.map((t) => escapeRegex(t)).join(".*"), "i")
      )
    );
  }

  const phrase = textQuery(query);
  if (phrase.length >= 2) {
    // Flexible whitespace: "head phone" or "headphone"
    const spaced = new RegExp(
      escapeRegex(phrase).replace(/\s+/g, "\\s*"),
      "i"
    );
    clauses.push(fieldMatchOr(fields, spaced));
    // Also match with spaces removed in field via compact char pattern
    const nospace = phrase.replace(/\s+/g, "");
    if (nospace.length >= 2) {
      const chars = nospace.split("").map(escapeRegex).join(".*?");
      clauses.push(fieldMatchOr(fields, new RegExp(chars, "i")));
    }
  }

  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

/** Broad product text match for catalog listing queries. */
export function buildProductSearchFilter(query: string): Record<string, unknown> | null {
  return buildFlexibleTextFilter(PRODUCT_SEARCH_FIELDS, query);
}

/** Prefix / partial token match for typo tolerance (headphons → headphones). */
function buildPrefixTokenFilter(query: string): Record<string, unknown> | null {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return null;

  return {
    $and: tokens.map((token) => {
      const prefixLen = Math.max(2, Math.ceil(token.length * 0.6));
      const prefix = token.slice(0, prefixLen);
      return fieldMatchOr(
        PRODUCT_SEARCH_FIELDS,
        new RegExp(escapeRegex(prefix), "i")
      );
    }),
  };
}

function productSearchTexts(p: Record<string, unknown>): string[] {
  const media = Array.isArray(p.media) ? p.media : [];
  return [
    String(p.name ?? ""),
    String(p.slug ?? "").replace(/-/g, " "),
    String(p.sku ?? ""),
    String(p.brandName ?? ""),
    ...(Array.isArray(p.categoryNames) ? p.categoryNames.map(String) : []),
    ...(Array.isArray(p.tags) ? p.tags.map(String) : []),
    String(p.shortDescription ?? ""),
    String(p.description ?? ""),
    String((p.seo as { title?: string } | undefined)?.title ?? ""),
    ...media.map((m) => String((m as { alt?: string })?.alt ?? "")),
  ].filter(Boolean);
}

function rankProductMatch(p: Record<string, unknown>, query: string, tokens: string[]) {
  const name = String(p.name ?? "").toLowerCase();
  const blob = productSearchBlob(p);
  const q = query.trim().toLowerCase();
  const compactQ = q.replace(/\s+/g, "");

  let score = 0;
  if (name === q) score += 200;
  if (name.startsWith(tokens[0] ?? q)) score += 80;
  if (tokens.length > 1 && tokens.every((t) => name.includes(t))) score += 60;
  if (compactQ.length >= 2 && name.replace(/\s+/g, "").includes(compactQ)) score += 50;
  if (tokens.every((t) => blob.includes(t))) score += 40;
  if (blob.includes(q)) score += 30;
  if (p.featured) score += 5;

  const fuzzy = fuzzyMatchScore(q, productSearchTexts(p));
  if (fuzzy >= 0.92) score += 120;
  else if (fuzzy >= 0.8) score += 90;
  else if (fuzzy >= 0.65) score += 55;
  else if (fuzzy >= 0.5) score += 25;

  return score;
}

function mergeProducts(
  existing: Record<string, unknown>[],
  incoming: Record<string, unknown>[]
) {
  const seen = new Set(existing.map((p) => String(p._id)));
  const merged = [...existing];
  for (const p of incoming) {
    const id = String(p._id);
    if (!seen.has(id)) {
      merged.push(p);
      seen.add(id);
    }
  }
  return merged;
}

const DEEP_SELECT =
  "name slug sku pricing media brandName categoryNames tags shortDescription description seo featured inventory pricing createdAt";

async function collectDeepSearchCandidates(
  query: string,
  baseFilter: Record<string, unknown>
) {
  const q = query.trim();
  if (!q) return [];

  let candidates: Record<string, unknown>[] = [];

  const flexFilter = buildProductSearchFilter(q);
  if (flexFilter) {
    const flex = await Product.find({ ...baseFilter, ...flexFilter })
      .select(DEEP_SELECT)
      .limit(120)
      .lean();
    candidates = mergeProducts(candidates, flex as unknown as Record<string, unknown>[]);
  }

  try {
    const atlasPipeline = [
      {
        $search: {
          index: "products_search",
          compound: {
            should: [
              {
                text: {
                  query: q,
                  path: [
                    "name",
                    "description",
                    "shortDescription",
                    "tags",
                    "brandName",
                    "categoryNames",
                    "sku",
                  ],
                  fuzzy: { maxEdits: 2, prefixLength: 1 },
                },
              },
              {
                autocomplete: {
                  query: q,
                  path: "name",
                  fuzzy: { maxEdits: 2, prefixLength: 1 },
                },
              },
            ],
            filter: [{ equals: { path: "status", value: "published" } }],
            minimumShouldMatch: 1,
          },
        },
      },
      { $limit: 80 },
    ];
    const atlas = await Product.aggregate(atlasPipeline);
    candidates = mergeProducts(candidates, atlas as Record<string, unknown>[]);
  } catch {
    /* atlas unavailable */
  }

  const prefixFilter = buildPrefixTokenFilter(q);
  if (prefixFilter) {
    const prefix = await Product.find({ ...baseFilter, ...prefixFilter })
      .select(DEEP_SELECT)
      .limit(100)
      .lean();
    candidates = mergeProducts(candidates, prefix as unknown as Record<string, unknown>[]);
  }

  if (candidates.length < 30) {
    const broad = await Product.find(baseFilter).select(DEEP_SELECT).limit(350).lean();
    const tokens = tokenizeSearchQuery(q);
    const fuzzyHits = (broad as unknown as Record<string, unknown>[])
      .map((p) => ({
        p,
        score: rankProductMatch(p, q, tokens),
        fuzzy: fuzzyMatchScore(q, productSearchTexts(p)),
      }))
      .filter((x) => x.score >= 12 || x.fuzzy >= 0.5)
      .sort((a, b) => b.score + b.fuzzy * 100 - (a.score + a.fuzzy * 100))
      .map((x) => x.p);
    candidates = mergeProducts(candidates, fuzzyHits);
  }

  return candidates;
}

export interface DeepSearchResult {
  products: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  source?: "ai" | "fallback";
  enhancedQuery?: string;
}

function rankProductWithEnhancement(
  product: Record<string, unknown>,
  enhancement: AiSearchEnhancement,
  originalQuery: string
) {
  const primaryTokens = tokenizeSearchQuery(enhancement.primaryQuery);
  const originalTokens = tokenizeSearchQuery(originalQuery);

  let score = rankProductMatch(product, enhancement.primaryQuery, primaryTokens);
  score = Math.max(score, rankProductMatch(product, originalQuery, originalTokens));

  for (const alt of enhancement.alternateQueries) {
    score = Math.max(
      score,
      Math.floor(rankProductMatch(product, alt, tokenizeSearchQuery(alt)) * 0.9)
    );
  }

  return score;
}

/** Deep relevance-ranked product search with typo tolerance. */
export async function deepSearchProducts(
  query: string,
  baseFilter: Record<string, unknown>,
  page = 1,
  limit = 12
): Promise<DeepSearchResult> {
  const q = query.trim();
  if (!q) {
    return {
      products: [],
      total: 0,
      page,
      limit,
      pages: 1,
      source: "fallback",
    };
  }

  const enhancement = resolveSearchEnhancement(q);
  const searchQueries = getSearchQueriesForMatching(enhancement);

  let candidates: Record<string, unknown>[] = [];
  for (const searchQuery of searchQueries) {
    const batch = await collectDeepSearchCandidates(searchQuery, baseFilter);
    candidates = mergeProducts(candidates, batch);
  }

  const ranked = candidates
    .map((p) => ({
      p,
      score: rankProductWithEnhancement(p, enhancement, q),
    }))
    .filter((x) => x.score >= 8)
    .sort((a, b) => b.score - a.score);

  const total = ranked.length;
  const skip = (page - 1) * limit;
  const products = ranked.slice(skip, skip + limit).map((x) => x.p);

  return {
    products,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    source: enhancement.source,
    enhancedQuery:
      enhancement.source === "ai" ? enhancement.primaryQuery : undefined,
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function productSearchBlob(p: Record<string, unknown>) {
  const media = Array.isArray(p.media) ? p.media : [];
  const alts = media
    .map((m) => (m as { alt?: string })?.alt)
    .filter(Boolean)
    .join(" ");
  return [
    p.name,
    p.slug,
    p.sku,
    p.brandName,
    ...(Array.isArray(p.categoryNames) ? p.categoryNames : []),
    ...(Array.isArray(p.tags) ? p.tags : []),
    p.shortDescription,
    p.description,
    (p.seo as { title?: string } | undefined)?.title,
    alts,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Safe token string for MongoDB $text (strips operators). */
function textQuery(query: string) {
  return query
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productSubtitle(p: {
  brandName?: string;
  categoryNames?: string[];
  shortDescription?: string;
}) {
  const parts = [p.brandName, p.categoryNames?.[0]].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return p.shortDescription?.slice(0, 72);
}

function mapProductSuggestion(p: Record<string, unknown>): SearchSuggestion {
  const pricing = (p.pricing as { price?: number } | undefined) ?? {};
  const media = Array.isArray(p.media) ? p.media : [];
  const firstMedia = media[0] as { url?: string } | undefined;
  const slug = String(p.slug ?? "");

  return {
    type: "product",
    id: String(p._id ?? slug),
    name: String(p.name ?? ""),
    slug,
    href: `/products/${slug}`,
    image: firstMedia?.url ? String(firstMedia.url) : undefined,
    price: pricing.price != null ? Number(pricing.price) : undefined,
    subtitle: productSubtitle({
      brandName: p.brandName ? String(p.brandName) : undefined,
      categoryNames: Array.isArray(p.categoryNames)
        ? p.categoryNames.map(String)
        : undefined,
      shortDescription: p.shortDescription ? String(p.shortDescription) : undefined,
    }),
  };
}

async function atlasSuggestProducts(query: string, limit: number) {
  const pipeline = [
    {
      $search: {
        index: "products_search",
        compound: {
          should: [
            {
              autocomplete: {
                query,
                path: "name",
                fuzzy: { maxEdits: 1, prefixLength: 1 },
              },
            },
            {
              text: {
                query,
                path: [
                  "name",
                  "description",
                  "shortDescription",
                  "tags",
                  "brandName",
                  "categoryNames",
                  "sku",
                ],
                fuzzy: { maxEdits: 1 },
              },
            },
          ],
          filter: [{ equals: { path: "status", value: "published" } }],
          minimumShouldMatch: 1,
        },
      },
    },
    { $limit: limit },
    {
      $project: {
        name: 1,
        slug: 1,
        pricing: 1,
        media: 1,
        brandName: 1,
        categoryNames: 1,
        shortDescription: 1,
        score: { $meta: "searchScore" },
      },
    },
  ];

  const rows = await Product.aggregate(pipeline);
  return rows.map((p) => mapProductSuggestion(p as Record<string, unknown>));
}

async function regexSuggestProducts(query: string, limit: number) {
  const searchFilter = buildProductSearchFilter(query);
  if (!searchFilter) return [];

  const tokens = tokenizeSearchQuery(query);
  const fetchLimit = Math.min(limit * 4, 40);

  let products = await Product.find({
    status: "published",
    ...searchFilter,
  })
    .select(
      "name slug sku pricing media brandName categoryNames tags shortDescription description seo featured"
    )
    .limit(fetchLimit)
    .lean();

  products = products
    .map((p) => ({
      p,
      score: rankProductMatch(p as unknown as Record<string, unknown>, query, tokens),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => p)
    .slice(0, limit);

  if (products.length === 0) {
    const prefixFilter = buildPrefixTokenFilter(query);
    if (prefixFilter) {
      const prefixHits = await Product.find({
        status: "published",
        ...prefixFilter,
      })
        .select(
          "name slug sku pricing media brandName categoryNames tags shortDescription description seo featured"
        )
        .limit(fetchLimit)
        .lean();
      products = prefixHits
        .map((p) => ({
          p,
          score: rankProductMatch(p as unknown as Record<string, unknown>, query, tokens),
        }))
        .sort((a, b) => b.score - a.score)
        .map(({ p }) => p)
        .slice(0, limit);
    }
  }

  if (products.length === 0) {
    const tq = textQuery(query);
    if (tq.length >= 2) {
      try {
        products = await Product.find(
          { status: "published", $text: { $search: tq } },
          { score: { $meta: "textScore" } }
        )
          .select(
            "name slug pricing media brandName categoryNames shortDescription description featured"
          )
          .sort({ score: { $meta: "textScore" } })
          .limit(limit)
          .lean();
      } catch {
        /* text index may be missing on fresh DB */
      }
    }
  }

  return products.map((p) =>
    mapProductSuggestion(p as unknown as Record<string, unknown>)
  );
}

async function suggestCategories(query: string, limit: number) {
  const searchFilter = buildFlexibleTextFilter(
    ["name", "slug", "description"],
    query
  );
  if (!searchFilter) return [];

  const categories = await Category.find(searchFilter)
    .select("name slug image description")
    .sort({ sortOrder: 1, name: 1 })
    .limit(limit)
    .lean();

  return categories.map((c) => ({
    type: "category" as const,
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    href: `/categories/${c.slug}`,
    image: c.image,
    subtitle: c.description?.slice(0, 72),
  }));
}

async function suggestBrands(query: string, limit: number) {
  const searchFilter = buildFlexibleTextFilter(
    ["name", "slug", "description"],
    query
  );
  if (!searchFilter) return [];

  const brands = await Brand.find(searchFilter)
    .select("name slug logo description")
    .sort({ name: 1 })
    .limit(limit)
    .lean();

  return brands.map((b) => ({
    type: "brand" as const,
    id: String(b._id),
    name: b.name,
    slug: b.slug,
    href: `/products?brand=${encodeURIComponent(b.name)}`,
    image: b.logo,
    subtitle: b.description?.slice(0, 72),
  }));
}

export async function searchSuggestions(
  query: string,
  opts?: { limit?: number; productLimit?: number }
): Promise<SearchSuggestionsResult> {
  const q = query.trim();
  const productLimit = opts?.productLimit ?? opts?.limit ?? 6;
  const categoryLimit = 3;
  const brandLimit = 3;

  if (q.length < 2) {
    return {
      query: q,
      suggestions: [],
      products: [],
      categories: [],
      brands: [],
      source: "fallback",
    };
  }

  const enhancement = resolveSearchEnhancement(q);
  const searchQueries = getSearchQueriesForMatching(enhancement);

  const [products, categories, brands] = await Promise.all([
    collectProductSuggestions(searchQueries, productLimit),
    collectCategorySuggestions(enhancement, categoryLimit),
    collectBrandSuggestions(enhancement, brandLimit),
  ]);

  const suggestions = [...products, ...categories, ...brands];

  return {
    query: q,
    suggestions,
    products,
    categories,
    brands,
    source: enhancement.source,
    enhancedQuery:
      enhancement.source === "ai" ? enhancement.primaryQuery : undefined,
  };
}

export async function searchProducts(
  query: string,
  filters: SearchFilters = {},
  page = 1,
  limit = 20
) {
  const enhancement = query.trim() ? resolveSearchEnhancement(query) : null;
  const effectiveQuery = enhancement?.primaryQuery ?? query;

  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = { status: "published" };

  if (filters.category) {
    filter.categoryNames = filters.category;
  }
  if (filters.brand) {
    filter.brandName = filters.brand;
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    filter["pricing.price"] = {};
    if (filters.minPrice !== undefined) {
      (filter["pricing.price"] as Record<string, number>).$gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      (filter["pricing.price"] as Record<string, number>).$lte = filters.maxPrice;
    }
  }

  const searchQueries = enhancement
    ? getSearchQueriesForMatching(enhancement)
    : [effectiveQuery];

  let products: Record<string, unknown>[] = [];
  const seen = new Set<string>();

  for (const searchQuery of searchQueries) {
    const searchFilter = buildProductSearchFilter(searchQuery);
    const queryFilter = searchFilter ? { ...filter, ...searchFilter } : filter;
    const batch = await Product.find(queryFilter)
      .sort({ featured: -1, createdAt: -1 })
      .limit(limit * 2)
      .lean();

    for (const product of batch) {
      const id = String(product._id);
      if (!seen.has(id)) {
        products.push(product as unknown as Record<string, unknown>);
        seen.add(id);
      }
    }
  }

  const total = products.length;
  products = products.slice(skip, skip + limit);

  return { products, total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

export function buildAtlasSearchPipeline(
  query: string,
  filters: SearchFilters = {},
  page = 1,
  limit = 20
) {
  const must: Record<string, unknown>[] = [];

  if (query.trim()) {
    must.push({
      text: {
        query,
        path: [
          "name",
          "description",
          "shortDescription",
          "tags",
          "brandName",
          "categoryNames",
          "sku",
        ],
        fuzzy: { maxEdits: 1 },
      },
    });
  }

  const filter: Record<string, unknown>[] = [
    { equals: { path: "status", value: "published" } },
  ];

  if (filters.category) {
    filter.push({ text: { query: filters.category, path: "categoryNames" } });
  }
  if (filters.brand) {
    filter.push({ text: { query: filters.brand, path: "brandName" } });
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const range: Record<string, number> = {};
    if (filters.minPrice !== undefined) range.gte = filters.minPrice;
    if (filters.maxPrice !== undefined) range.lte = filters.maxPrice;
    filter.push({ range: { path: "pricing.price", ...range } });
  }

  const skip = (page - 1) * limit;

  return [
    {
      $search: {
        index: "products_search",
        compound: {
          must: must.length ? must : [{ exists: { path: "name" } }],
          filter,
        },
      },
    },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        name: 1,
        slug: 1,
        pricing: 1,
        media: 1,
        brandName: 1,
        categoryNames: 1,
        score: { $meta: "searchScore" },
      },
    },
  ];
}

export async function atlasSearchProducts(
  query: string,
  filters: SearchFilters = {},
  page = 1,
  limit = 20
) {
  const enhancement = query.trim() ? resolveSearchEnhancement(query) : null;
  const effectiveQuery = enhancement?.primaryQuery ?? query;

  try {
    const pipeline = buildAtlasSearchPipeline(effectiveQuery, filters, page, limit);
    const products = await Product.aggregate(pipeline);
    return { products, total: products.length, page, limit, source: "atlas" as const };
  } catch {
    return searchProducts(query, filters, page, limit);
  }
}
