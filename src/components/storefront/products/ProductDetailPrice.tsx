"use client";

import { useTranslations } from "next-intl";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";
import { Badge } from "@/components/ds/badge";

interface ProductDetailPriceProps {
  price: number;
  compareAtPrice?: number;
}

export function ProductDetailPrice({ price, compareAtPrice }: ProductDetailPriceProps) {
  const t = useTranslations("common");
  const onSale = compareAtPrice != null && compareAtPrice > price;

  return (
    <div className="flex items-center gap-3">
      <PriceDisplay amountUsd={price} className="text-display-h3 font-bold" />
      {onSale && (
        <>
          <PriceDisplay
            amountUsd={compareAtPrice}
            className="text-body text-muted-foreground line-through"
          />
          <Badge variant="destructive">{t("sale")}</Badge>
        </>
      )}
    </div>
  );
}
