"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import { ProductSkeletonGrid } from "@/components/storefront/catalog/ProductSkeletonCard";
import { PRODUCT_GRID_CLASS } from "@/lib/catalog/product-grid";
import type { ProductCardData } from "@/lib/catalog/product-card";
import type { CatalogPageSlug } from "@/models/CatalogPage";
import { cn } from "@/components/ds/utils";

interface CatalogInfiniteGridProps {
  initialProducts: ProductCardData[];
  initialPage: number;
  pages: number;
  total: number;
  preset: CatalogPageSlug;
  /** Forced category name (category detail pages) */
  lockedCategory?: string;
  pageSize?: number;
}

export function CatalogInfiniteGrid({
  initialProducts,
  initialPage,
  pages,
  total,
  preset,
  lockedCategory,
  pageSize = 12,
}: CatalogInfiniteGridProps) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialPage < pages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const filterKey = searchParams.toString();

  useEffect(() => {
    setProducts(initialProducts);
    setPage(initialPage);
    setHasMore(initialPage < pages);
    setError(false);
    loadingRef.current = false;
  }, [initialProducts, initialPage, pages, filterKey, lockedCategory]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError(false);

    const nextPage = page + 1;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    params.set("limit", String(pageSize));
    params.set("preset", preset);
    params.set("locale", locale);
    if (lockedCategory) params.set("category", lockedCategory);

    try {
      const res = await fetch(`/api/v1/catalog/products?${params.toString()}`);
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      const nextProducts = (json?.data?.products ?? []) as ProductCardData[];
      const pagination = json?.data?.pagination as
        | { page: number; pages: number; total: number }
        | undefined;

      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p._id));
        const unique = nextProducts.filter((p) => !seen.has(p._id));
        return [...prev, ...unique];
      });
      setPage(pagination?.page ?? nextPage);
      setHasMore(
        pagination
          ? pagination.page < pagination.pages
          : nextProducts.length >= pageSize
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [
    hasMore,
    locale,
    lockedCategory,
    page,
    pageSize,
    preset,
    searchParams,
  ]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "320px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, products.length]);

  if (products.length === 0 && total === 0) {
    return null;
  }

  return (
    <div>
      <div className={cn(PRODUCT_GRID_CLASS)}>
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>

      <div ref={sentinelRef} className="catalog-infinite" aria-live="polite">
        {loading && (
          <>
          {/* // donot remove or uncomment it */}

            {/* <div className="catalog-infinite__spinner" />
            <p className="catalog-infinite__label">{t("loadingProducts")}</p> */}
            <div className="mt-4 w-full">
              <ProductSkeletonGrid count={4} />
            </div>
          </>
        )}
        {!loading && hasMore && (
          <p className="catalog-infinite__label">{t("loadMore")}</p>
        )}
        {!loading && !hasMore && products.length > 0 && (
          <p className="catalog-infinite__label">{t("noMoreProducts")}</p>
        )}
        {error && (
          <button
            type="button"
            className="catalog-empty__cta"
            onClick={() => void loadMore()}
          >
            {t("loadMore")}
          </button>
        )}
      </div>
    </div>
  );
}
