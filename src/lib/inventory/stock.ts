export interface StockLineInput {
  productId: string;
  variantId?: string;
}

export interface StockLineResult {
  productId: string;
  variantId?: string;
  available: number;
  maxQuantity: number;
  valid: boolean;
  hasVariants: boolean;
  inStock: boolean;
  canQuickAdd: boolean;
}

export type ProductStockDoc = {
  status: "draft" | "published" | "archived";
  variants?: {
    id: string;
    stock: number;
  }[];
  inventory?: {
    stock: number;
    trackInventory?: boolean;
  };
};

export const LOW_STOCK_THRESHOLD = 5;

export function productHasAnyStock(product: ProductStockDoc): boolean {
  if (product.status !== "published") return false;
  if (product.inventory?.trackInventory === false) return true;
  if (product.variants?.length) {
    return product.variants.some((v) => (Number(v.stock) || 0) > 0);
  }
  return (Number(product.inventory?.stock) || 0) > 0;
}

export function isLowStock(
  available: number,
  threshold = LOW_STOCK_THRESHOLD
): boolean {
  return available > 0 && available <= threshold;
}

export function resolveAvailableStock(
  product: ProductStockDoc,
  variantId?: string
): number {
  if (product.status !== "published") return 0;
  if (product.inventory?.trackInventory === false) {
    return Number.MAX_SAFE_INTEGER;
  }

  if (product.variants?.length) {
    if (!variantId) return 0;
    const variant = product.variants.find((v) => v.id === variantId);
    return Math.max(0, Number(variant?.stock) || 0);
  }

  return Math.max(0, Number(product.inventory?.stock) || 0);
}

export function cartLineRequiresVariant(
  product: ProductStockDoc,
  variantId?: string
): boolean {
  return Boolean(product.variants?.length) && !variantId;
}

export function isCartLineValid(
  product: ProductStockDoc | undefined,
  variantId?: string
): boolean {
  if (!product) return false;
  return !cartLineRequiresVariant(product, variantId);
}

export function resolveStockLimits(
  products: Array<{ _id: { toString(): string } } & ProductStockDoc>,
  lines: StockLineInput[]
): StockLineResult[] {
  const byId = new Map(products.map((p) => [String(p._id), p]));

  return lines.map((line) => {
    const product = byId.get(line.productId);
    const valid = isCartLineValid(product, line.variantId);
    const hasVariants = Boolean(product?.variants?.length);
    const inStock = product ? productHasAnyStock(product) : false;
    const available =
      product && valid ? resolveAvailableStock(product, line.variantId) : 0;
    const canQuickAdd = Boolean(product && valid && !hasVariants && available > 0);
    return {
      productId: line.productId,
      variantId: line.variantId,
      available,
      maxQuantity: available,
      valid,
      hasVariants,
      inStock,
      canQuickAdd,
    };
  });
}

const RESTOCK_STATUSES = new Set(["cancelled", "refunded"]);

export function shouldRestockOnStatusChange(
  previousStatus: string,
  nextStatus: string
): boolean {
  return (
    RESTOCK_STATUSES.has(nextStatus) && !RESTOCK_STATUSES.has(previousStatus)
  );
}
