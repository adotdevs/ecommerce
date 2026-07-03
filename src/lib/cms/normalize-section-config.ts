/** Ensure all editor-visible text fields exist in config before save/translate */

const DEFAULT_HERO_STATS = [
  { value: "10K+", label: "Happy Customers" },
  { value: "500+", label: "Premium Products" },
  { value: "4.9", label: "Average Rating" },
];

export function normalizeSectionConfig(
  type: string,
  config: Record<string, unknown>
): Record<string, unknown> {
  const next = structuredClone(config);

  switch (type) {
    case "hero_slider": {
      if (!Array.isArray(next.stats) || next.stats.length === 0) {
        next.stats = DEFAULT_HERO_STATS;
      }
      break;
    }
    case "featured_products": {
      if (!next.selectionMode) {
        next.selectionMode =
          Array.isArray(next.productLinks) && next.productLinks.length > 0
            ? "manual"
            : "auto";
      }
      if (!Array.isArray(next.productLinks)) next.productLinks = [];
      break;
    }
    case "category_showcase": {
      if (!next.selectionMode) {
        next.selectionMode =
          Array.isArray(next.categoryLinks) && next.categoryLinks.length > 0
            ? "manual"
            : "auto";
      }
      if (!Array.isArray(next.categoryLinks)) next.categoryLinks = [];
      break;
    }
    case "promo_banner": {
      if (!Array.isArray(next.productLinks)) next.productLinks = [];
      break;
    }
  }

  return next;
}
