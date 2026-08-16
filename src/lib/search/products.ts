import { executeProductSearch, suggestFromEngine } from "@/lib/search/engine";
import { tokenize } from "@/lib/search/normalize";

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

export interface DeepSearchResult {
  products: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  source?: "ai" | "fallback";
  enhancedQuery?: string;
  correctedQuery?: string;
}

export function tokenizeSearchQuery(query: string): string[] {
  return tokenize(query);
}

function filtersToMongo(filters: SearchFilters = {}): Record<string, unknown> {
  const filter: Record<string, unknown> = { status: "published" };
  if (filters.category) filter.categoryNames = filters.category;
  if (filters.brand) filter.brandName = filters.brand;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const price: Record<string, number> = {};
    if (filters.minPrice !== undefined) price.$gte = filters.minPrice;
    if (filters.maxPrice !== undefined) price.$lte = filters.maxPrice;
    filter["pricing.price"] = price;
  }
  return filter;
}

/** Relevance-ranked catalog search. Description / Atlas / popular fallbacks are not used. */
export async function deepSearchProducts(
  query: string,
  baseFilter: Record<string, unknown>,
  page = 1,
  limit = 12
): Promise<DeepSearchResult> {
  return executeProductSearch(query, baseFilter, page, limit, { allowAi: true });
}

export async function searchSuggestions(
  query: string,
  opts?: { limit?: number; productLimit?: number }
): Promise<SearchSuggestionsResult> {
  const q = query.trim();
  const productLimit = opts?.productLimit ?? opts?.limit ?? 6;

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

  const result = await suggestFromEngine(q, productLimit);
  const suggestions = [
    ...result.products,
    ...result.categories,
    ...result.brands,
  ];

  return {
    query: q,
    suggestions,
    products: result.products,
    categories: result.categories,
    brands: result.brands,
    source: result.source,
    enhancedQuery: result.enhancedQuery,
  };
}

export async function searchProducts(
  query: string,
  filters: SearchFilters = {},
  page = 1,
  limit = 20
) {
  return executeProductSearch(query, filtersToMongo(filters), page, limit, {
    allowAi: true,
  });
}

/** @deprecated Atlas fuzzy search is not used for customer results. */
export async function atlasSearchProducts(
  query: string,
  filters: SearchFilters = {},
  page = 1,
  limit = 20
) {
  return searchProducts(query, filters, page, limit);
}
