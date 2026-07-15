"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RemoteImage } from "@/components/storefront/RemoteImage";
import { motion } from "framer-motion";
import { Heart, GitCompareArrows, ShoppingBag, Check } from "lucide-react";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";
import { StarRating } from "@/components/storefront/products/StarRating";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useCompareStore } from "@/stores/compare-store";
import { cn } from "@/components/ds/utils";
import { LowStockHint } from "@/components/storefront/products/LowStockHint";
import { VariantQuickAddModal } from "@/components/storefront/products/VariantQuickAddModal";
import { isLowStock } from "@/lib/inventory/stock";
import type { ProductCardData } from "@/lib/catalog/product-card";
import { isProductCardInStock } from "@/lib/catalog/product-card";

interface ProductCardProps {
  product: ProductCardData;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const t = useTranslations("common");
  const mounted = useClientMounted();
  const { addToCart, justAdded } = useAddToCart();
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isWishlistedRaw = useWishlistStore((s) => s.hasItem(product._id));
  const isWishlisted = mounted && isWishlistedRaw;
  const toggleCompare = useCompareStore((s) => s.toggleProduct);
  const image = product.media?.[0];
  const onSale =
    Boolean(product.onSale) &&
    product.pricing.compareAtPrice != null &&
    product.pricing.compareAtPrice > product.pricing.price;
  const outOfStock = !isProductCardInStock(product);
  const stock = product.inventory?.stock ?? 0;
  const showLowStock = isLowStock(stock);
  const rating = product.rating?.average ?? 0;
  const reviewCount = product.rating?.count ?? 0;
  const [variantModalOpen, setVariantModalOpen] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || justAdded) return;
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

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist({
      productId: product._id,
      name: product.name,
      slug: product.slug,
      image: image?.url,
      price: product.pricing.price,
    });
  };

  const handleVariantAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) {
      handleWishlist(e);
      return;
    }
    setVariantModalOpen(true);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    if (product.hasVariants) {
      handleVariantAdd(e);
      return;
    }
    if (outOfStock) {
      handleWishlist(e);
      return;
    }
    handleAddToCart(e);
  };

  return (
    <motion.article
      initial={false}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-card shadow-[var(--shadow-subtle)] transition-all duration-300 hover:border-primary/25 hover:shadow-[var(--shadow-card)]",
        className
      )}
    >
      <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
        <div className="store-product-media">
          {image ? (
            <RemoteImage
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-small">
              —
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-col gap-1">
            {product.featured && !onSale && (
              <Badge variant="default" className="text-[10px]">
                {t("featured")}
              </Badge>
            )}
            {onSale && (
              <Badge variant="destructive" className="text-[10px]">
                {t("sale")}
              </Badge>
            )}
          </div>

          <div className="absolute right-3 top-3 flex flex-col gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Button
              size="icon-sm"
              variant="secondary"
              className="bg-card/95 backdrop-blur-sm shadow-sm"
              onClick={handleWishlist}
              aria-label={t("addToCart")}
            >
              <Heart
                className={cn("h-4 w-4", isWishlisted && "fill-red-500 text-red-500")}
              />
            </Button>
            <Button
              size="icon-sm"
              variant="secondary"
              className="bg-card/95 backdrop-blur-sm shadow-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleCompare(product._id);
              }}
              aria-label="Compare"
            >
              <GitCompareArrows className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4 pt-3">
          {product.brandName && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {product.brandName}
            </p>
          )}
          <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-foreground">
            {product.name}
          </h3>
          {reviewCount > 0 && (
            <StarRating rating={rating} count={reviewCount} />
          )}
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <div className="flex min-w-0 flex-wrap items-baseline gap-2">
              <PriceDisplay amountUsd={product.pricing.price} className="text-base font-bold" />
              {onSale && (
                <PriceDisplay
                  amountUsd={product.pricing.compareAtPrice!}
                  className="text-small text-muted-foreground line-through"
                />
              )}
            </div>
            <Button
              size="icon-sm"
              variant="secondary"
              className="shrink-0 rounded-full border border-border bg-background shadow-sm"
              onClick={handleQuickAdd}
              disabled={!outOfStock && justAdded}
              aria-label={t("addToCart")}
            >
              {justAdded ? (
                <Check className="h-4 w-4 text-brand-accent" />
              ) : (
                <ShoppingBag className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4">
        {showLowStock && !product.hasVariants && (
          <div className="mb-2 flex justify-center">
            <LowStockHint count={stock} className="text-xs" />
          </div>
        )}
        {product.hasVariants ? (
          <>
            <Button
              size="md"
              variant={justAdded ? "accent" : "primary"}
              className={cn(
                "w-full rounded-full",
                justAdded && "bg-brand-accent text-white hover:bg-brand-accent"
              )}
              onClick={handleVariantAdd}
              disabled={!outOfStock && justAdded}
            >
              {justAdded ? (
                <>
                  <Check className="h-4 w-4" />
                  {t("addedToCart")}
                </>
              ) : outOfStock ? (
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="h-4 w-4" />
                  {t("addToWishlist")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4" />
                  {t("addToCart")}
                </span>
              )}
            </Button>
            <VariantQuickAddModal
              product={product}
              open={variantModalOpen}
              onOpenChange={setVariantModalOpen}
            />
          </>
        ) : (
          <Button
            size="md"
            variant={justAdded ? "accent" : "primary"}
            className={cn(
              "w-full rounded-full",
              justAdded && "bg-brand-accent text-white hover:bg-brand-accent",
              showLowStock && !justAdded && "h-auto min-h-10 py-2"
            )}
            onClick={outOfStock ? handleWishlist : handleAddToCart}
            disabled={!outOfStock && justAdded}
          >
            {justAdded ? (
              <>
                <Check className="h-4 w-4" />
                {t("addedToCart")}
              </>
            ) : outOfStock ? (
              <span className="inline-flex items-center gap-1.5">
                <Heart className="h-4 w-4" />
                {t("addToWishlist")}
              </span>
            ) : (
              <span className="flex flex-col items-center gap-0.5">
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4" />
                  {t("addToCart")}
                </span>
                {showLowStock && (
                  <LowStockHint count={stock} compact className="text-white/90" />
                )}
              </span>
            )}
          </Button>
        )}
      </div>
    </motion.article>
  );
}
