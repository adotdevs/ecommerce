"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useTranslations } from "next-intl";
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
import { Input } from "@/components/ds/input";
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

const SORT_VALUES = [
  "newest",
  "bestsellers",
  "price-asc",
  "price-desc",
  "deals",
  "featured",
] as const;

type SortValue = (typeof SORT_VALUES)[number];

type OpenMenu =
  | "category"
  | "price"
  | "brand"
  | "rating"
  | "availability"
  | "sort"
  | null;

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
  children,
  hideCategoryFilter = false,
}: CatalogFiltersProps) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const current = useMemo(
    () => ({
      category: searchParams.get("category") ?? "",
      brand: searchParams.get("brand") ?? "",
      minPrice: searchParams.get("minPrice") ?? "",
      maxPrice: searchParams.get("maxPrice") ?? "",
      onSale: searchParams.get("onSale") === "1",
      featured: searchParams.get("featured") === "1",
      sort: (searchParams.get("sort") as SortValue) || "newest",
      q: searchParams.get("q") ?? "",
      minRating: searchParams.get("minRating") ?? "",
      availability: searchParams.get("availability") ?? "",
    }),
    [searchParams]
  );

  const [minPrice, setMinPrice] = useState(current.minPrice);
  const [maxPrice, setMaxPrice] = useState(current.maxPrice);

  useEffect(() => {
    const header = document.getElementById("site-header");
    const sync = () => {
      const h = header?.offsetHeight ?? 72;
      document.documentElement.style.setProperty("--site-header-height", `${h}px`);
    };
    sync();
    const ro = header ? new ResizeObserver(sync) : null;
    if (header && ro) ro.observe(header);
    window.addEventListener("resize", sync);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  useEffect(() => {
    setMinPrice(current.minPrice);
    setMaxPrice(current.maxPrice);
  }, [current.minPrice, current.maxPrice]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

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
      setOpenMenu(null);
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
    setDrawerOpen(false);
    setOpenMenu(null);
  };

  const activeCount = [
    current.category,
    current.brand,
    current.minPrice,
    current.maxPrice,
    current.onSale,
    current.featured,
    current.minRating,
    current.availability,
  ].filter(Boolean).length;

  const sortLabel = (value: string) => {
    switch (value) {
      case "bestsellers":
        return t("sortBestsellers");
      case "price-asc":
        return t("sortPriceAsc");
      case "price-desc":
        return t("sortPriceDesc");
      case "deals":
        return t("sortDeals");
      case "featured":
        return t("sortFeatured");
      default:
        return t("sortNewest");
    }
  };

  const applyPrice = () => {
    updateParams({
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
    });
  };

  const toggleMenu = (menu: OpenMenu) => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  return (
    <div className={cn(pending && "catalog-filter-bar--pending")}>
      <div
        ref={barRef}
        className="catalog-filter-bar"
        role="toolbar"
        aria-label={t("filters")}
      >
        <button
          type="button"
          className={cn(
            "catalog-filter-pill catalog-filter-pill--all catalog-filter-mobile-only",
            activeCount > 0 && "catalog-filter-pill--active"
          )}
          onClick={() => setDrawerOpen(true)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t("allFilters")}
          {activeCount > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary">
              {activeCount}
            </span>
          )}
        </button>

        <button
          type="button"
          className={cn(
            "catalog-filter-pill catalog-filter-pill--all catalog-filter-desktop-only",
            activeCount > 0 && "catalog-filter-pill--active",
            openMenu === null && drawerOpen && "catalog-filter-pill--active"
          )}
          onClick={() => setDrawerOpen(true)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t("allFilters")}
          {activeCount > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary">
              {activeCount}
            </span>
          )}
        </button>

        {!hideCategoryFilter && (
          <FilterDropdown
            className="catalog-filter-desktop-only"
            label={t("category")}
            active={Boolean(current.category)}
            open={openMenu === "category"}
            onToggle={() => toggleMenu("category")}
          >
            <button
              type="button"
              className={cn(
                "catalog-filter-option",
                !current.category && "catalog-filter-option--active"
              )}
              onClick={() => updateParams({ category: null })}
            >
              {!current.category && <Check className="h-3.5 w-3.5" />}
              {t("allCategories")}
            </button>
            {facets.categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                className={cn(
                  "catalog-filter-option",
                  current.category === c.name && "catalog-filter-option--active"
                )}
                onClick={() =>
                  updateParams({
                    category: current.category === c.name ? null : c.name,
                  })
                }
              >
                {current.category === c.name && <Check className="h-3.5 w-3.5" />}
                {c.name}
              </button>
            ))}
          </FilterDropdown>
        )}

        <FilterDropdown
          className="catalog-filter-desktop-only"
          label={t("price")}
          active={Boolean(current.minPrice || current.maxPrice)}
          open={openMenu === "price"}
          onToggle={() => toggleMenu("price")}
        >
          <div className="catalog-filter-menu--price space-y-3 p-1">
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                inputMode="decimal"
                placeholder={`${t("minPrice")} ${facets.priceRange.min}`}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="h-9"
              />
              <Input
                type="number"
                inputMode="decimal"
                placeholder={`${t("maxPrice")} ${facets.priceRange.max}`}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="h-9"
              />
            </div>
            <button
              type="button"
              className="catalog-product-card__cta h-9 text-sm"
              onClick={applyPrice}
            >
              {t("applyPrice")}
            </button>
          </div>
        </FilterDropdown>

        <FilterDropdown
          className="catalog-filter-desktop-only"
          label={t("brand")}
          active={Boolean(current.brand)}
          open={openMenu === "brand"}
          onToggle={() => toggleMenu("brand")}
        >
          <button
            type="button"
            className={cn(
              "catalog-filter-option",
              !current.brand && "catalog-filter-option--active"
            )}
            onClick={() => updateParams({ brand: null })}
          >
            {!current.brand && <Check className="h-3.5 w-3.5" />}
            {t("allBrands")}
          </button>
          {facets.brands.map((b) => (
            <button
              key={b.slug}
              type="button"
              className={cn(
                "catalog-filter-option",
                current.brand === b.name && "catalog-filter-option--active"
              )}
              onClick={() =>
                updateParams({
                  brand: current.brand === b.name ? null : b.name,
                })
              }
            >
              {current.brand === b.name && <Check className="h-3.5 w-3.5" />}
              {b.name}
            </button>
          ))}
        </FilterDropdown>

        <FilterDropdown
          className="catalog-filter-desktop-only"
          label={t("rating")}
          active={Boolean(current.minRating)}
          open={openMenu === "rating"}
          onToggle={() => toggleMenu("rating")}
        >
          <button
            type="button"
            className={cn(
              "catalog-filter-option",
              !current.minRating && "catalog-filter-option--active"
            )}
            onClick={() => updateParams({ minRating: null })}
          >
            {!current.minRating && <Check className="h-3.5 w-3.5" />}
            {t("allRatings")}
          </button>
          {[4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              type="button"
              className={cn(
                "catalog-filter-option",
                current.minRating === String(rating) &&
                  "catalog-filter-option--active"
              )}
              onClick={() =>
                updateParams({
                  minRating:
                    current.minRating === String(rating) ? null : String(rating),
                })
              }
            >
              {current.minRating === String(rating) && (
                <Check className="h-3.5 w-3.5" />
              )}
              {t("ratingAndUp", { rating })}
            </button>
          ))}
        </FilterDropdown>

        <FilterDropdown
          className="catalog-filter-desktop-only"
          label={t("availability")}
          active={Boolean(current.availability)}
          open={openMenu === "availability"}
          onToggle={() => toggleMenu("availability")}
        >
          {(
            [
              ["", t("availabilityAll")],
              ["in-stock", t("availabilityInStock")],
              ["out-of-stock", t("availabilityOutOfStock")],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value || "all"}
              type="button"
              className={cn(
                "catalog-filter-option",
                current.availability === value && "catalog-filter-option--active"
              )}
              onClick={() => updateParams({ availability: value || null })}
            >
              {current.availability === value && <Check className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </FilterDropdown>

        <div className="catalog-filter-toggle catalog-filter-desktop-only">
          <span>{t("onSale")}</span>
          <button
            type="button"
            className="catalog-switch"
            data-on={current.onSale ? "true" : "false"}
            aria-pressed={current.onSale}
            aria-label={t("onSale")}
            onClick={() =>
              updateParams({ onSale: current.onSale ? null : "1" })
            }
          >
            <span className="catalog-switch__thumb" />
          </button>
        </div>

        <div className="catalog-filter-sort">
          <span className="catalog-filter-sort__label">{t("sortBy")}:</span>
          <FilterDropdown
            label={sortLabel(current.sort)}
            active={false}
            open={openMenu === "sort"}
            onToggle={() => toggleMenu("sort")}
            align="right"
          >
            {SORT_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "catalog-filter-option",
                  current.sort === value && "catalog-filter-option--active"
                )}
                onClick={() => updateParams({ sort: value })}
              >
                {current.sort === value && <Check className="h-3.5 w-3.5" />}
                {sortLabel(value)}
              </button>
            ))}
          </FilterDropdown>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="catalog-filter-chips">
          {current.category && (
            <button
              type="button"
              className="catalog-chip"
              onClick={() => updateParams({ category: null })}
            >
              {current.category} <X className="h-3 w-3" />
            </button>
          )}
          {current.brand && (
            <button
              type="button"
              className="catalog-chip"
              onClick={() => updateParams({ brand: null })}
            >
              {current.brand} <X className="h-3 w-3" />
            </button>
          )}
          {(current.minPrice || current.maxPrice) && (
            <button
              type="button"
              className="catalog-chip"
              onClick={() => {
                setMinPrice("");
                setMaxPrice("");
                updateParams({ minPrice: null, maxPrice: null });
              }}
            >
              {current.minPrice || facets.priceRange.min}–{current.maxPrice || facets.priceRange.max}{" "}
              <X className="h-3 w-3" />
            </button>
          )}
          {current.minRating && (
            <button
              type="button"
              className="catalog-chip"
              onClick={() => updateParams({ minRating: null })}
            >
              {t("ratingAndUp", { rating: current.minRating })}{" "}
              <X className="h-3 w-3" />
            </button>
          )}
          {current.availability && (
            <button
              type="button"
              className="catalog-chip"
              onClick={() => updateParams({ availability: null })}
            >
              {current.availability === "in-stock"
                ? t("availabilityInStock")
                : t("availabilityOutOfStock")}{" "}
              <X className="h-3 w-3" />
            </button>
          )}
          {current.onSale && (
            <button
              type="button"
              className="catalog-chip"
              onClick={() => updateParams({ onSale: null })}
            >
              {t("onSale")} <X className="h-3 w-3" />
            </button>
          )}
          {current.featured && (
            <button
              type="button"
              className="catalog-chip"
              onClick={() => updateParams({ featured: null })}
            >
              {t("featured")} <X className="h-3 w-3" />
            </button>
          )}
          <button type="button" className="catalog-chip__clear" onClick={clearAll}>
            {t("clearAll")}
          </button>
        </div>
      )}

      <div className="min-w-0" aria-busy={pending} data-total={total}>
        {children}
      </div>

      {drawerOpen && (
        <>
          <button
            type="button"
            className="catalog-drawer-backdrop"
            aria-label={t("closeFilters")}
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="catalog-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t("filters")}
          >
            <div className="catalog-drawer__header">
              <h2 className="catalog-drawer__title">{t("filters")}</h2>
              <button
                type="button"
                className="catalog-filter-pill"
                onClick={() => setDrawerOpen(false)}
                aria-label={t("closeFilters")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="catalog-drawer__body">
              <MobileFilterSection title={t("onSale")}>
                <div className="catalog-filter-toggle">
                  <span>{t("onSale")}</span>
                  <button
                    type="button"
                    className="catalog-switch"
                    data-on={current.onSale ? "true" : "false"}
                    aria-pressed={current.onSale}
                    onClick={() =>
                      updateParams({ onSale: current.onSale ? null : "1" })
                    }
                  >
                    <span className="catalog-switch__thumb" />
                  </button>
                </div>
              </MobileFilterSection>

              <MobileFilterSection title={t("price")}>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder={`${t("minPrice")} ${facets.priceRange.min}`}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="h-10"
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder={`${t("maxPrice")} ${facets.priceRange.max}`}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="h-10"
                  />
                </div>
                <button
                  type="button"
                  className="mt-2 w-full rounded-lg border border-border bg-secondary py-2 text-sm font-medium"
                  onClick={applyPrice}
                >
                  {t("applyPrice")}
                </button>
              </MobileFilterSection>

              {!hideCategoryFilter && (
                <MobileFilterSection title={t("category")}>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    <button
                      type="button"
                      className={cn(
                        "catalog-filter-option",
                        !current.category && "catalog-filter-option--active"
                      )}
                      onClick={() => updateParams({ category: null })}
                    >
                      {t("allCategories")}
                    </button>
                    {facets.categories.map((c) => (
                      <button
                        key={c.slug}
                        type="button"
                        className={cn(
                          "catalog-filter-option",
                          current.category === c.name &&
                            "catalog-filter-option--active"
                        )}
                        onClick={() =>
                          updateParams({
                            category:
                              current.category === c.name ? null : c.name,
                          })
                        }
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </MobileFilterSection>
              )}

              <MobileFilterSection title={t("brand")}>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  <button
                    type="button"
                    className={cn(
                      "catalog-filter-option",
                      !current.brand && "catalog-filter-option--active"
                    )}
                    onClick={() => updateParams({ brand: null })}
                  >
                    {t("allBrands")}
                  </button>
                  {facets.brands.map((b) => (
                    <button
                      key={b.slug}
                      type="button"
                      className={cn(
                        "catalog-filter-option",
                        current.brand === b.name &&
                          "catalog-filter-option--active"
                      )}
                      onClick={() =>
                        updateParams({
                          brand: current.brand === b.name ? null : b.name,
                        })
                      }
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </MobileFilterSection>

              <MobileFilterSection title={t("rating")}>
                <button
                  type="button"
                  className={cn(
                    "catalog-filter-option",
                    !current.minRating && "catalog-filter-option--active"
                  )}
                  onClick={() => updateParams({ minRating: null })}
                >
                  {t("allRatings")}
                </button>
                {[4, 3, 2, 1].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={cn(
                      "catalog-filter-option",
                      current.minRating === String(rating) &&
                        "catalog-filter-option--active"
                    )}
                    onClick={() =>
                      updateParams({
                        minRating:
                          current.minRating === String(rating)
                            ? null
                            : String(rating),
                      })
                    }
                  >
                    {t("ratingAndUp", { rating })}
                  </button>
                ))}
              </MobileFilterSection>

              <MobileFilterSection title={t("availability")}>
                {(
                  [
                    ["", t("availabilityAll")],
                    ["in-stock", t("availabilityInStock")],
                    ["out-of-stock", t("availabilityOutOfStock")],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value || "all"}
                    type="button"
                    className={cn(
                      "catalog-filter-option",
                      current.availability === value &&
                        "catalog-filter-option--active"
                    )}
                    onClick={() =>
                      updateParams({ availability: value || null })
                    }
                  >
                    {label}
                  </button>
                ))}
              </MobileFilterSection>

              <MobileFilterSection title={t("featured")}>
                <div className="catalog-filter-toggle">
                  <span>{t("featured")}</span>
                  <button
                    type="button"
                    className="catalog-switch"
                    data-on={current.featured ? "true" : "false"}
                    aria-pressed={current.featured}
                    onClick={() =>
                      updateParams({ featured: current.featured ? null : "1" })
                    }
                  >
                    <span className="catalog-switch__thumb" />
                  </button>
                </div>
              </MobileFilterSection>
            </div>
            <div className="catalog-drawer__footer">
              <button
                type="button"
                className="catalog-drawer__clear"
                onClick={clearAll}
              >
                {t("clearFilters")}
              </button>
              <button
                type="button"
                className="catalog-drawer__apply"
                onClick={() => setDrawerOpen(false)}
              >
                {t("applyFilters")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FilterDropdown({
  label,
  active,
  open,
  onToggle,
  children,
  className,
  align = "left",
}: {
  label: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("catalog-filter-dropdown", className)}>
      <button
        type="button"
        className={cn(
          "catalog-filter-pill",
          (active || open) && "catalog-filter-pill--active"
        )}
        aria-expanded={open}
        onClick={onToggle}
      >
        {label}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div
          className={cn(
            "catalog-filter-menu",
            align === "right" && "left-auto right-0"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MobileFilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}
