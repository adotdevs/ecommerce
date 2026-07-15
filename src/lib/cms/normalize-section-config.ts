/** Ensure all editor-visible text fields exist in config before save/translate */

export function normalizeSectionConfig(
  type: string,
  config: Record<string, unknown>
): Record<string, unknown> {
  const next = structuredClone(config);

  switch (type) {
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
    case "flash_sale": {
      if (!next.selectionMode) {
        next.selectionMode =
          Array.isArray(next.productLinks) && next.productLinks.length > 0
            ? "manual"
            : "auto";
      }
      if (!Array.isArray(next.productLinks)) next.productLinks = [];
      if (next.limit == null) next.limit = 4;
      break;
    }
    case "product_slider": {
      if (!next.preset) next.preset = "bestsellers";
      if (!next.selectionMode) {
        next.selectionMode =
          Array.isArray(next.productLinks) && next.productLinks.length > 0
            ? "manual"
            : "auto";
      }
      if (!Array.isArray(next.productLinks)) next.productLinks = [];
      if (next.limit == null) next.limit = 8;
      break;
    }
    case "promo_grid": {
      if (!Array.isArray(next.tiles)) next.tiles = [];
      break;
    }
    case "brand_strip": {
      break;
    }
  }

  return next;
}
