"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { RemoteImage } from "@/components/storefront/RemoteImage";
import { ShoppingBag, Check } from "lucide-react";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";
import { StarRating } from "@/components/storefront/products/StarRating";
import { VariantQuickAddModal } from "@/components/storefront/products/VariantQuickAddModal";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ds/utils";
import type { ProductCardData } from "@/lib/catalog/product-card";
import { isProductCardInStock } from "@/lib/catalog/product-card";

interface ProductSliderCardProps {
  product: ProductCardData;
  showNewBadge?: boolean;
  className?: string;
}

export function ProductSliderCard({
  product,
  showNewBadge = false,
  className,
}: ProductSliderCardProps) {
  const t = useTranslations("common");
  const { addToCart, justAdded } = useAddToCart();
  const image = product.media?.[0];
  const outOfStock = !isProductCardInStock(product);
  const rating = product.rating?.average ?? 0;
  const reviewCount = product.rating?.count ?? 0;
  const [variantModalOpen, setVariantModalOpen] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || justAdded) return;
    if (product.hasVariants) {
      setVariantModalOpen(true);
      return;
    }
    addToCart({
      productId: product._id,
      name: product.name,
      slug: product.slug,
      image: image?.url,
      price: product.pricing.price,
      quantity: 1,
      maxQuantity: product.inventory?.stock,
    });
  };

  const displayNew =
    showNewBadge || Boolean(product.isNewArrival);

  return (
    <article
      className={cn(
        "store-slider-card group flex w-[11.5rem] shrink-0 flex-col sm:w-[12.75rem] md:w-[13.5rem]",
        className
      )}
    >
      <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
        <div className="store-slider-card__media relative">
          {image ? (
            <RemoteImage
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              className="object-contain p-2.5 transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="220px"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">—</div>
          )}
          {displayNew && (
            <Badge className="absolute left-2 top-2 text-[10px] uppercase tracking-wide">
              New
            </Badge>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 px-1 pt-3">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">
            {product.name}
          </h3>
          {reviewCount > 0 && (
            <StarRating rating={rating} count={reviewCount} className="scale-90 origin-left" />
          )}
          <div className="mt-auto flex items-center justify-between gap-2">
            <PriceDisplay amountUsd={product.pricing.price} className="text-sm font-bold" />
            <Button
              size="icon-sm"
              variant="secondary"
              className="h-8 w-8 shrink-0 rounded-full border border-border bg-background"
              onClick={handleAdd}
              disabled={outOfStock || justAdded}
              aria-label={t("addToCart")}
            >
              {justAdded ? (
                <Check className="h-3.5 w-3.5 text-brand-accent" />
              ) : (
                <ShoppingBag className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </Link>
      {product.hasVariants && (
        <VariantQuickAddModal
          product={product}
          open={variantModalOpen}
          onOpenChange={setVariantModalOpen}
        />
      )}
    </article>
  );
}
