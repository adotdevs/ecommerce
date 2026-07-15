import { PRODUCT_GRID_CLASS } from "@/lib/catalog/product-grid";
import { cn } from "@/components/ds/utils";

export function ProductSkeletonCard() {
  return (
    <div className="catalog-skeleton" aria-hidden>
      <div className="catalog-skeleton__media" />
      <div className="catalog-skeleton__line catalog-skeleton__line--short" />
      <div className="catalog-skeleton__line" />
      <div className="catalog-skeleton__line" />
      <div className="catalog-skeleton__line catalog-skeleton__line--cta" />
    </div>
  );
}

export function ProductSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className={cn(PRODUCT_GRID_CLASS)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeletonCard key={i} />
      ))}
    </div>
  );
}
