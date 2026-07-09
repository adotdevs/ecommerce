import type { CatalogPageSlug } from "@/models/CatalogPage";

export interface CatalogPageConfig {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  heroImage?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  seoTitle?: string;
  seoDescription?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export const CATALOG_PAGE_META: Record<
  CatalogPageSlug,
  { label: string; path: string; description: string }
> = {
  all: {
    label: "All Products",
    path: "/products",
    description: "Main catalog browse page",
  },
  "new-arrivals": {
    label: "New Arrivals",
    path: "/new-arrivals",
    description: "Latest products page",
  },
  bestsellers: {
    label: "Best Sellers",
    path: "/bestsellers",
    description: "Top-selling products page",
  },
  deals: {
    label: "Deals",
    path: "/deals",
    description: "Sale and discount deals page",
  },
  search: {
    label: "Search Results",
    path: "/products?q=",
    description: "Search results page copy",
  },
  categories: {
    label: "Categories",
    path: "/categories",
    description: "Categories directory page",
  },
};

export const DEFAULT_CATALOG_PAGES: Record<CatalogPageSlug, CatalogPageConfig> = {
  all: {
    eyebrow: "Shop",
    title: "All Products",
    subtitle: "Browse our full collection — filter by category, brand, and price.",
    badge: "Full catalog",
    emptyTitle: "No products found",
    emptySubtitle: "Try adjusting filters or clearing your search.",
    seoTitle: "All Products",
    seoDescription: "Browse our complete collection of premium products.",
    ctaLabel: "View deals",
    ctaHref: "/deals",
  },
  "new-arrivals": {
    eyebrow: "Just dropped",
    title: "New Arrivals",
    subtitle: "Fresh styles and latest additions — be the first to shop what’s new.",
    badge: "This week",
    emptyTitle: "No new arrivals yet",
    emptySubtitle: "Check back soon for the latest drops.",
    seoTitle: "New Arrivals",
    seoDescription: "Discover the newest products in our store.",
    ctaLabel: "Shop bestsellers",
    ctaHref: "/bestsellers",
  },
  bestsellers: {
    eyebrow: "Customer favorites",
    title: "Best Sellers",
    subtitle: "Top picks loved by shoppers — proven quality, high demand.",
    badge: "Top rated",
    emptyTitle: "No bestsellers yet",
    emptySubtitle: "Bestsellers will appear as customers shop.",
    seoTitle: "Best Sellers",
    seoDescription: "Shop our most popular best-selling products.",
    ctaLabel: "See new arrivals",
    ctaHref: "/new-arrivals",
  },
  deals: {
    eyebrow: "Limited time",
    title: "Deals & Offers",
    subtitle: "Save big on select items — exclusive discounts while stocks last.",
    badge: "On sale",
    emptyTitle: "No deals right now",
    emptySubtitle: "New offers are added regularly. Browse the full catalog meanwhile.",
    seoTitle: "Deals & Offers",
    seoDescription: "Shop discounted products and limited-time deals.",
    ctaLabel: "Browse all products",
    ctaHref: "/products",
  },
  search: {
    eyebrow: "Search",
    title: "Search results",
    subtitle: "Find exactly what you need with filters and sorting.",
    badge: "Results",
    emptyTitle: "No matches found",
    emptySubtitle: "Try a different keyword or broaden your filters.",
    seoTitle: "Search",
    seoDescription: "Search products across our store.",
  },
  categories: {
    eyebrow: "Browse",
    title: "Shop by Category",
    subtitle:
      "Explore curated collections — filter by brand, find what you love, and shop with confidence.",
    badge: "Collections",
    emptyTitle: "No categories found",
    emptySubtitle: "Try a different search or clear your filters.",
    seoTitle: "Shop by Category",
    seoDescription: "Browse all product categories and discover brands in each collection.",
    ctaLabel: "View all products",
    ctaHref: "/products",
  },
};
