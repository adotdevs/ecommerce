"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  CatalogFilters,
  type CatalogFacets,
} from "@/components/storefront/catalog/CatalogFilters";
import { CatalogInfiniteGrid } from "@/components/storefront/catalog/CatalogInfiniteGrid";
import { EmptyProductsState } from "@/components/storefront/catalog/EmptyProductsState";
import type { CatalogPageConfig } from "@/lib/cms/catalog-pages";
import type { CatalogPageSlug } from "@/models/CatalogPage";
import type { ProductCardData } from "@/lib/catalog/product-card";

function highlightQuery(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (
    <>
      {before}
      <span className="catalog-heading__query">{match}</span>
      {after}
    </>
  );
}

interface CatalogListingProps {
  slug: CatalogPageSlug;
  content: CatalogPageConfig;
  products: ProductCardData[];
  total: number;
  facets: CatalogFacets;
  searchQuery?: string;
  page: number;
  pages: number;
  basePath: string;
  queryString?: string;
  pageSize?: number;
}

export function CatalogListing({
  slug,
  content,
  products,
  total,
  facets,
  searchQuery,
  page,
  pages,
  pageSize = slug === "bestsellers" ? 9 : 12,
}: CatalogListingProps) {
  const tCatalog = useTranslations("catalog");
  const tProducts = useTranslations("products");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isSearch = slug === "search" && Boolean(searchQuery);

  const title = isSearch
    ? tProducts("resultsFor", { query: searchQuery! })
    : content.title;

  const breadcrumbCurrent =
    slug === "search"
      ? tCatalog("breadcrumbSearch")
      : slug === "new-arrivals"
        ? tNav("newArrivals")
        : slug === "bestsellers"
          ? tNav("bestSellers")
          : slug === "deals"
            ? tNav("deals")
            : content.title || tNav("allProducts");

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) next.set("q", q);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams]);

  return (
    <div className="catalog-page">
      <div className="catalog-page__inner">
        <nav className="catalog-breadcrumb" aria-label={tCatalog("breadcrumbNav")}>
          <Link href="/">{tCatalog("breadcrumbHome")}</Link>
          <span className="catalog-breadcrumb__sep" aria-hidden>
            ›
          </span>
          <span className="catalog-breadcrumb__current">{breadcrumbCurrent}</span>
        </nav>

        <header className="catalog-heading">
          <h1 className="catalog-heading__title">
            {isSearch && searchQuery
              ? highlightQuery(title, searchQuery)
              : title}
          </h1>
          <p className="catalog-heading__count">
            {tProducts("found", { count: total })}
          </p>
          {content.subtitle && !isSearch && (
            <p className="catalog-heading__subtitle">{content.subtitle}</p>
          )}
        </header>

        <CatalogFilters facets={facets} total={total}>
          {products.length === 0 ? (
            <EmptyProductsState
              title={content.emptyTitle}
              subtitle={content.emptySubtitle}
              onClear={clearFilters}
            />
          ) : (
            <CatalogInfiniteGrid
              initialProducts={products}
              initialPage={page}
              pages={pages}
              total={total}
              preset={slug}
              pageSize={pageSize}
            />
          )}
        </CatalogFilters>
      </div>
    </div>
  );
}
