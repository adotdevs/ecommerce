"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Package,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import type { CatalogPageConfig } from "@/lib/cms/catalog-pages";
import type { CategoryDirectoryItem } from "@/lib/catalog/categories-directory";
import { cn } from "@/components/ds/utils";
import {
  fadeUp,
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "@/components/storefront/homepage/motion";

interface BrandOption {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  categoryIds: string[];
}

interface CategoriesDirectoryProps {
  content: CatalogPageConfig;
  categories: CategoryDirectoryItem[];
  brands: BrandOption[];
  total: number;
}

const SORT_OPTIONS = [
  { value: "featured", label: "Featured order" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "products", label: "Most products" },
] as const;

export function CategoriesDirectory({
  content,
  categories,
  brands,
  total,
}: CategoriesDirectoryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftQ, setDraftQ] = useState(searchParams.get("q") ?? "");

  const current = useMemo(
    () => ({
      q: searchParams.get("q") ?? "",
      brand: searchParams.get("brand") ?? "",
      sort: searchParams.get("sort") ?? "featured",
    }),
    [searchParams]
  );

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([k, v]) => {
      if (!v) next.delete(k);
      else next.set(k, v);
    });
    startTransition(() => {
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const clearAll = () => {
    setDraftQ("");
    startTransition(() => router.push(pathname));
  };

  const activeCount = [current.q, current.brand].filter(Boolean).length;

  const brandsForFilter = current.brand
    ? brands
    : brands.filter((b) =>
        categories.some((c) => c.brands.some((cb) => cb._id === b._id))
      );

  return (
    <div className="pb-16 md:pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        {content.heroImage ? (
          <div className="absolute inset-0">
            <Image
              src={content.heroImage}
              alt=""
              fill
              className="object-cover opacity-30 dark:opacity-25"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/70" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-background to-secondary dark:from-primary/18 dark:via-background dark:to-secondary/40" />
        )}
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-muted-foreground/10 blur-3xl" />

        <div className="container-store relative py-12 md:py-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="max-w-2xl"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {content.eyebrow && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {content.eyebrow}
                </span>
              )}
              {content.badge && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  <Sparkles className="h-3 w-3" />
                  {content.badge}
                </span>
              )}
            </div>
            <h1 className="text-[clamp(1.9rem,4vw,2.85rem)] font-bold tracking-tight text-foreground">
              {content.title}
            </h1>
            {content.subtitle && (
              <p className="mt-3 max-w-xl text-body text-muted-foreground">
                {content.subtitle}
              </p>
            )}
            <form
              className="mt-7 flex max-w-lg gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                updateParams({ q: draftQ.trim() || null });
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={draftQ}
                  onChange={(e) => setDraftQ(e.target.value)}
                  placeholder="Search categories or brands…"
                  className="h-11 pl-10"
                />
              </div>
              <Button type="submit" size="lg" className="h-11 shrink-0">
                Search
              </Button>
            </form>
            {content.ctaLabel && content.ctaHref && (
              <Button asChild variant="outline" className="mt-5">
                <Link href={content.ctaHref}>
                  {content.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </motion.div>
        </div>
      </section>

      <div className={cn("container-store pt-8 md:pt-10", pending && "opacity-80")}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-small text-muted-foreground">
            <span className="font-semibold text-foreground">{total}</span> categories
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[11px] text-primary">
                  {activeCount}
                </span>
              )}
            </Button>
            <div className="relative">
              <select
                value={current.sort}
                onChange={(e) => updateParams({ sort: e.target.value })}
                className="h-9 appearance-none rounded-[var(--radius-sm)] border border-border bg-card py-0 pl-3 pr-8 text-small text-foreground"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        {activeCount > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {current.q && (
              <button
                type="button"
                onClick={() => {
                  setDraftQ("");
                  updateParams({ q: null });
                }}
                className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
              >
                “{current.q}” <X className="h-3 w-3" />
              </button>
            )}
            {current.brand && (
              <button
                type="button"
                onClick={() => updateParams({ brand: null })}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground"
              >
                {current.brand} <X className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={clearAll}
              className="text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
          <aside
            className={cn(
              "h-fit space-y-5 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-subtle)]",
              filtersOpen ? "block" : "hidden lg:block"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-small font-semibold text-foreground">Filters</p>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[12px] text-muted-foreground hover:text-foreground"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Brands
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Brands are linked to categories — pick one to see matching collections.
              </p>
              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => updateParams({ brand: null })}
                  className={cn(
                    "flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[13px] transition",
                    !current.brand
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-secondary/70"
                  )}
                >
                  All brands
                </button>
                {brandsForFilter.map((b) => (
                  <button
                    key={b._id}
                    type="button"
                    onClick={() =>
                      updateParams({
                        brand: current.brand === b.name ? null : b.name,
                      })
                    }
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition",
                      current.brand === b.name
                        ? "bg-secondary font-medium text-foreground"
                        : "text-muted-foreground hover:bg-secondary/70"
                    )}
                  >
                    {b.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.logo} alt="" className="h-5 w-5 rounded object-contain" />
                    ) : (
                      <Tag className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    )}
                    <span className="truncate">{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div>
            {categories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
                <p className="text-lg font-semibold text-foreground">
                  {content.emptyTitle ?? "No categories found"}
                </p>
                <p className="mt-2 text-body text-muted-foreground">
                  {content.emptySubtitle ?? "Try adjusting your filters."}
                </p>
                <Button type="button" variant="outline" className="mt-6" onClick={clearAll}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              >
                {categories.map((cat) => (
                  <motion.div key={cat._id} variants={staggerItem}>
                    <Link
                      href={`/categories/${cat.slug}`}
                      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[var(--shadow-subtle)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[var(--shadow-card)]"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
                        {cat.image ? (
                          <Image
                            src={cat.image}
                            alt={cat.name}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                            sizes="(max-width:768px) 100vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/15 to-secondary text-3xl font-bold text-primary/35">
                            {cat.name.charAt(0)}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                          <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                            {cat.name}
                          </h2>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
                            <Package className="h-3 w-3" />
                            {cat.productCount}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col gap-3 p-4">
                        {cat.description && (
                          <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                            {cat.description}
                          </p>
                        )}

                        {cat.brands.length > 0 ? (
                          <div className="mt-auto">
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              Brands
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {cat.brands.slice(0, 4).map((b) => (
                                <span
                                  key={b._id}
                                  className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-[11px] text-foreground"
                                >
                                  {b.logo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={b.logo}
                                      alt=""
                                      className="h-3.5 w-3.5 rounded-sm object-contain"
                                    />
                                  ) : null}
                                  {b.name}
                                </span>
                              ))}
                              {cat.brands.length > 4 && (
                                <span className="rounded-md px-2 py-0.5 text-[11px] text-muted-foreground">
                                  +{cat.brands.length - 4}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="mt-auto text-[12px] text-muted-foreground">
                            No brands linked yet
                          </p>
                        )}

                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-primary opacity-0 transition group-hover:opacity-100">
                          Explore collection <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
