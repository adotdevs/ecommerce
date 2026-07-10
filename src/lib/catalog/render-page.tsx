import type { Metadata } from "next";
import type { Locale } from "@/config/locales";
import type { CatalogPageSlug } from "@/models/CatalogPage";
import { getLocalizedCatalogPage } from "@/lib/cms/catalog-page-content";
import { queryCatalogProducts } from "@/lib/catalog/query";
import { CatalogListing } from "@/components/storefront/catalog/CatalogListing";
import { DEFAULT_CATALOG_PAGES } from "@/lib/cms/catalog-pages";

export type CatalogSearchParams = {
  q?: string;
  sort?: string;
  page?: string;
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  onSale?: string;
  featured?: string;
};

export async function buildCatalogMetadata(
  slug: CatalogPageSlug,
  locale: Locale
): Promise<Metadata> {
  const content = await getLocalizedCatalogPage(slug, locale);
  return {
    title: content.seoTitle || content.title || DEFAULT_CATALOG_PAGES[slug].seoTitle,
    description:
      content.seoDescription ||
      content.subtitle ||
      DEFAULT_CATALOG_PAGES[slug].seoDescription,
  };
}

export async function renderCatalogPage({
  slug,
  locale,
  searchParams,
  basePath,
}: {
  slug: CatalogPageSlug;
  locale: Locale;
  searchParams: CatalogSearchParams;
  basePath: string;
}) {
  const content = await getLocalizedCatalogPage(slug, locale);
  const page = parseInt(searchParams.page ?? "1", 10) || 1;

  const result = await queryCatalogProducts({
    preset: slug === "search" || slug === "all" ? slug : slug,
    page,
    limit: slug === "bestsellers" ? 9 : 12,
    q: searchParams.q,
    sort: searchParams.sort,
    category: searchParams.category,
    brand: searchParams.brand,
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
    onSale: searchParams.onSale === "1",
    featured: searchParams.featured === "1",
    locale,
  });

  const qs = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => {
    if (v && k !== "page") qs.set(k, v);
  });

  return (
    <CatalogListing
      slug={slug}
      content={content}
      products={result.products}
      total={result.total}
      facets={result.facets}
      searchQuery={searchParams.q}
      page={result.page}
      pages={result.pages}
      basePath={basePath}
      queryString={qs.toString()}
    />
  );
}
