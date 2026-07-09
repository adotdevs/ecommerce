"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  ArrowUpDown,
  Tag,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { cn } from "@/components/ds/utils";

export interface CatalogFacetOption {
  name: string;
  slug: string;
}

export interface CatalogFacets {
  categories: CatalogFacetOption[];
  brands: CatalogFacetOption[];
  priceRange: { min: number; max: number };
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "bestsellers", label: "Best sellers" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "deals", label: "Biggest discounts" },
  { value: "featured", label: "Featured" },
] as const;

interface CatalogFiltersProps {
  facets: CatalogFacets;
  total: number;
  accent?: "indigo" | "emerald" | "amber" | "rose" | "sky";
  children: React.ReactNode;
  /** Hide category list when already scoped to one category */
  hideCategoryFilter?: boolean;
}

export function CatalogFilters({
  facets,
  total,
  accent = "indigo",
  children,
  hideCategoryFilter = false,
}: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const current = useMemo(
    () => ({
      category: searchParams.get("category") ?? "",
      brand: searchParams.get("brand") ?? "",
      minPrice: searchParams.get("minPrice") ?? "",
      maxPrice: searchParams.get("maxPrice") ?? "",
      onSale: searchParams.get("onSale") === "1",
      featured: searchParams.get("featured") === "1",
      sort: searchParams.get("sort") ?? "newest",
      q: searchParams.get("q") ?? "",
    }),
    [searchParams]
  );

  const [minPrice, setMinPrice] = useState(current.minPrice);
  const [maxPrice, setMaxPrice] = useState(current.maxPrice);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (value == null || value === "") next.delete(key);
        else next.set(key, value);
      });
      next.delete("page");
      startTransition(() => {
        const qs = next.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams]
  );

  const clearAll = () => {
    const next = new URLSearchParams();
    if (current.q) next.set("q", current.q);
    startTransition(() => {
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
    setMinPrice("");
    setMaxPrice("");
  };

  const activeCount = [
    current.category,
    current.brand,
    current.minPrice,
    current.maxPrice,
    current.onSale,
    current.featured,
  ].filter(Boolean).length;

  const accentRing = {
    indigo: "focus-visible:ring-indigo-500",
    emerald: "focus-visible:ring-emerald-500",
    amber: "focus-visible:ring-amber-500",
    rose: "focus-visible:ring-rose-500",
    sky: "focus-visible:ring-sky-500",
  }[accent];

  const accentChip = {
    indigo: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    sky: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  }[accent];

  return (
    <div className={cn("space-y-4", pending && "opacity-80")}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-muted-foreground">
          <span className="font-semibold text-foreground">{total}</span> products
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className={`ml-1 rounded-full px-1.5 text-[11px] ${accentChip}`}>
                {activeCount}
              </span>
            )}
          </Button>
          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={current.sort}
              onChange={(e) => updateParams({ sort: e.target.value })}
              className={cn(
                "h-9 appearance-none rounded-[var(--radius-sm)] border border-border bg-card pl-9 pr-8 text-small text-foreground",
                accentRing
              )}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Active chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {current.category && (
            <button
              type="button"
              onClick={() => updateParams({ category: null })}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${accentChip}`}
            >
              {current.category} <X className="h-3 w-3" />
            </button>
          )}
          {current.brand && (
            <button
              type="button"
              onClick={() => updateParams({ brand: null })}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${accentChip}`}
            >
              {current.brand} <X className="h-3 w-3" />
            </button>
          )}
          {(current.minPrice || current.maxPrice) && (
            <button
              type="button"
              onClick={() => {
                setMinPrice("");
                setMaxPrice("");
                updateParams({ minPrice: null, maxPrice: null });
              }}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${accentChip}`}
            >
              ${current.minPrice || facets.priceRange.min}–$
              {current.maxPrice || facets.priceRange.max} <X className="h-3 w-3" />
            </button>
          )}
          {current.onSale && (
            <button
              type="button"
              onClick={() => updateParams({ onSale: null })}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${accentChip}`}
            >
              On sale <X className="h-3 w-3" />
            </button>
          )}
          {current.featured && (
            <button
              type="button"
              onClick={() => updateParams({ featured: null })}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${accentChip}`}
            >
              Featured <X className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={clearAll}
            className="text-[12px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar filters */}
        <aside
          className={cn(
            "space-y-5 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-subtle)]",
            open ? "block" : "hidden lg:block"
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
              Quick
            </Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  updateParams({ onSale: current.onSale ? null : "1" })
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                  current.onSale
                    ? accentChip
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
              >
                <Tag className="h-3 w-3" /> On sale
              </button>
              <button
                type="button"
                onClick={() =>
                  updateParams({ featured: current.featured ? null : "1" })
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                  current.featured
                    ? accentChip
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
              >
                <Sparkles className="h-3 w-3" /> Featured
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Price
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                inputMode="decimal"
                placeholder={`Min ${facets.priceRange.min}`}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                onBlur={() => updateParams({ minPrice: minPrice || null })}
                className="h-9"
              />
              <Input
                type="number"
                inputMode="decimal"
                placeholder={`Max ${facets.priceRange.max}`}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                onBlur={() => updateParams({ maxPrice: maxPrice || null })}
                className="h-9"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() =>
                updateParams({
                  minPrice: minPrice || null,
                  maxPrice: maxPrice || null,
                })
              }
            >
              Apply price
            </Button>
          </div>

          {!hideCategoryFilter && (
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Category
              </Label>
              <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                <FilterOption
                  active={!current.category}
                  label="All categories"
                  onClick={() => updateParams({ category: null })}
                  accent={accent}
                />
                {facets.categories.map((c) => (
                  <FilterOption
                    key={c.slug}
                    active={current.category === c.name}
                    label={c.name}
                    onClick={() =>
                      updateParams({
                        category: current.category === c.name ? null : c.name,
                      })
                    }
                    accent={accent}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Brand
            </Label>
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
              <FilterOption
                active={!current.brand}
                label="All brands"
                onClick={() => updateParams({ brand: null })}
                accent={accent}
              />
              {facets.brands.map((b) => (
                <FilterOption
                  key={b.slug}
                  active={current.brand === b.name}
                  label={b.name}
                  onClick={() =>
                    updateParams({
                      brand: current.brand === b.name ? null : b.name,
                    })
                  }
                  accent={accent}
                />
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

function FilterOption({
  active,
  label,
  onClick,
  accent,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[13px] transition",
        active
          ? "bg-secondary font-medium text-foreground"
          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "mr-2 h-1.5 w-1.5 rounded-full",
          active
            ? accent === "emerald"
              ? "bg-emerald-500"
              : accent === "amber"
                ? "bg-amber-500"
                : accent === "rose"
                  ? "bg-rose-500"
                  : accent === "sky"
                    ? "bg-sky-500"
                    : "bg-indigo-500"
            : "bg-border"
        )}
      />
      {label}
    </button>
  );
}
