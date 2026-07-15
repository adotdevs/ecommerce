"use client";

import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useCallback } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import {
  CatalogFilters,
  type CatalogFacets,
} from "@/components/storefront/catalog/CatalogFilters";
import { CatalogInfiniteGrid } from "@/components/storefront/catalog/CatalogInfiniteGrid";
import { EmptyProductsState } from "@/components/storefront/catalog/EmptyProductsState";
import type { ProductCardData } from "@/lib/catalog/product-card";

interface CategoryProductsViewProps {
  category: {
    name: string;
    slug: string;
    description?: string;
    image?: string;
  };
  brands: { name: string; slug: string; logo?: string }[];
  products: ProductCardData[];
  total: number;
  facets: CatalogFacets;
  page: number;
  pages: number;
  labels: {
    home: string;
    categories: string;
    brandsInCategory: string;
    collection: string;
    allCategoriesCta: string;
  };
}

export function CategoryProductsView({
  category,
  brands,
  products,
  total,
  facets,
  page,
  pages,
  labels,
}: CategoryProductsViewProps) {
  const tProducts = useTranslations("products");
  const router = useRouter();
  const pathname = usePathname();

  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  return (
    <div className="catalog-page">
      <div className="catalog-page__inner">
        <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">{labels.home}</Link>
          <span className="catalog-breadcrumb__sep" aria-hidden>
            ›
          </span>
          <Link href="/categories">{labels.categories}</Link>
          <span className="catalog-breadcrumb__sep" aria-hidden>
            ›
          </span>
          <span className="catalog-breadcrumb__current">{category.name}</span>
        </nav>

        <header className="catalog-heading">
          {category.image && (
            <div className="relative mb-4 h-28 w-full overflow-hidden rounded-2xl border border-border md:h-36">
              <Image
                src={category.image}
                alt=""
                fill
                className="object-cover opacity-80"
                sizes="100vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
            </div>
          )}
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {labels.collection}
          </p>
          <h1 className="catalog-heading__title">{category.name}</h1>
          <p className="catalog-heading__count">
            {tProducts("found", { count: total })}
          </p>
          {category.description && (
            <p className="catalog-heading__subtitle">{category.description}</p>
          )}

          {brands.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {labels.brandsInCategory}
              </p>
              <div className="catalog-brand-chips">
                {brands.map((b) => (
                  <Link
                    key={b.slug}
                    href={`/categories/${category.slug}?brand=${encodeURIComponent(b.name)}`}
                    className="catalog-brand-chip"
                  >
                    {b.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.logo}
                        alt=""
                        className="h-4 w-4 rounded object-contain"
                      />
                    ) : null}
                    {b.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Link
            href="/categories"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            {labels.allCategoriesCta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </header>

        <CatalogFilters facets={facets} total={total} hideCategoryFilter>
          {products.length === 0 ? (
            <EmptyProductsState onClear={clearFilters} />
          ) : (
            <CatalogInfiniteGrid
              initialProducts={products}
              initialPage={page}
              pages={pages}
              total={total}
              preset="all"
              lockedCategory={category.name}
              pageSize={12}
            />
          )}
        </CatalogFilters>
      </div>
    </div>
  );
}
