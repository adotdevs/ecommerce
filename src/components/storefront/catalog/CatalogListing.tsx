import { Link } from "@/i18n/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ds/button";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import {
  CatalogFilters,
  type CatalogFacets,
} from "@/components/storefront/catalog/CatalogFilters";
import type { CatalogPageConfig } from "@/lib/cms/catalog-pages";
import type { CatalogPageSlug } from "@/models/CatalogPage";
import type { ProductCardData } from "@/lib/catalog/product-card";
import { CatalogSearchBar } from "@/components/storefront/search/CatalogSearchBar";
import { cn } from "@/components/ds/utils";
import { PRODUCT_GRID_CLASS } from "@/lib/catalog/product-grid";

type Accent = "indigo" | "emerald" | "amber" | "rose" | "sky";

const THEMES: Record<
  CatalogPageSlug,
  {
    accent: Accent;
    hero: string;
    badge: string;
    glow: string;
  }
> = {
  all: {
    accent: "indigo",
    hero: "from-indigo-500/15 via-background to-background",
    badge: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
    glow: "bg-indigo-500/20",
  },
  "new-arrivals": {
    accent: "sky",
    hero: "from-sky-500/20 via-cyan-500/5 to-background",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    glow: "bg-sky-500/25",
  },
  bestsellers: {
    accent: "amber",
    hero: "from-amber-500/20 via-orange-500/5 to-background",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    glow: "bg-amber-500/25",
  },
  deals: {
    accent: "rose",
    hero: "from-rose-500/20 via-red-500/5 to-background",
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    glow: "bg-rose-500/25",
  },
  search: {
    accent: "emerald",
    hero: "from-emerald-500/15 via-background to-background",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    glow: "bg-emerald-500/20",
  },
  categories: {
    accent: "indigo",
    hero: "from-indigo-500/15 via-background to-background",
    badge: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
    glow: "bg-indigo-500/20",
  },
};

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
  basePath,
  queryString = "",
}: CatalogListingProps) {
  const theme = THEMES[slug];
  const title =
    slug === "search" && searchQuery
      ? `${content.title}: “${searchQuery}”`
      : content.title;

  return (
    <div className="pb-16 md:pb-20">
      <section className={cn("relative border-b border-border bg-gradient-to-br", theme.hero)}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className={cn(
              "absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl",
              theme.glow
            )}
          />
        </div>
        <div className="container-store relative z-10 overflow-visible py-10 md:py-14">
          <div className="max-w-2xl">
            {(content.eyebrow || content.badge) && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {content.eyebrow && (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {content.eyebrow}
                  </span>
                )}
                {content.badge && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                      theme.badge
                    )}
                  >
                    <Sparkles className="h-3 w-3" />
                    {content.badge}
                  </span>
                )}
              </div>
            )}
            <h1 className="text-[clamp(1.85rem,4vw,2.75rem)] font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {content.subtitle && (
              <p className="mt-3 max-w-xl text-body text-muted-foreground">
                {content.subtitle}
              </p>
            )}
            <CatalogSearchBar
              initialQuery={searchQuery ?? ""}
              className="relative z-20 mt-6 max-w-xl"
            />
            {content.ctaLabel && content.ctaHref && (
              <Button asChild className="mt-6" variant="outline">
                <Link href={content.ctaHref}>
                  {content.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="container-store pt-8 md:pt-10">
        <CatalogFilters facets={facets} total={total} accent={theme.accent}>
          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
              <p className="text-lg font-semibold text-foreground">
                {content.emptyTitle ?? "No products found"}
              </p>
              <p className="mt-2 text-body text-muted-foreground">
                {content.emptySubtitle ?? "Try adjusting your filters."}
              </p>
              <Button asChild className="mt-6" variant="outline">
                <Link href="/products">Browse all products</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className={PRODUCT_GRID_CLASS}>
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {pages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  {Array.from({ length: pages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 2)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev != null && p - prev > 1;
                      const qs = new URLSearchParams(queryString);
                      qs.set("page", String(p));
                      const href = `${basePath}?${qs.toString()}`;
                      return (
                        <span key={p} className="flex items-center gap-2">
                          {showEllipsis && (
                            <span className="text-muted-foreground">…</span>
                          )}
                          <Link
                            href={href}
                            className={cn(
                              "flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-small font-medium transition",
                              p === page
                                ? "border-primary bg-primary text-white"
                                : "border-border bg-card text-foreground hover:bg-secondary"
                            )}
                          >
                            {p}
                          </Link>
                        </span>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </CatalogFilters>
      </div>
    </div>
  );
}
