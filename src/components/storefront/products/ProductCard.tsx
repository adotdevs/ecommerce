"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RemoteImage } from "@/components/storefront/RemoteImage";
import {
  Heart,
  GitCompareArrows,
  ShoppingBag,
  Check,
  Eye,
} from "lucide-react";
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
  const tProducts = useTranslations("products");
  const tCatalog = useTranslations("catalog");
  const mounted = useClientMounted();
  const { addToCart, justAdded } = useAddToCart();
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isWishlistedRaw = useWishlistStore((s) => s.hasItem(product._id));
  const isWishlisted = mounted && isWishlistedRaw;
  const toggleCompare = useCompareStore((s) => s.toggleProduct);
  const isComparedRaw = useCompareStore((s) => s.hasProduct(product._id));
  const isCompared = mounted && isComparedRaw;
  const image = product.media?.[0];
  const onSale =
    Boolean(product.onSale) &&
    product.pricing.compareAtPrice != null &&
    product.pricing.compareAtPrice > product.pricing.price;
  const discountPercent =
    onSale && product.pricing.compareAtPrice
      ? Math.round(
          ((product.pricing.compareAtPrice - product.pricing.price) /
            product.pricing.compareAtPrice) *
            100
        )
      : 0;
  const outOfStock = !isProductCardInStock(product);
  const stock = product.inventory?.stock ?? 0;
  const showLowStock = isLowStock(stock);
  const rating = product.rating?.average ?? 0;
  const reviewCount = product.rating?.count ?? 0;
  const topRated = rating >= 4.5 && reviewCount > 0;
  const [variantModalOpen, setVariantModalOpen] = useState(false);

  const subtitleParts = [
    product.categoryNames?.[0],
    product.brandName,
  ].filter(Boolean);

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

  const badge = onSale
    ? { className: "catalog-badge--sale", label: t("sale") }
    : product.featured
      ? { className: "catalog-badge--best", label: tProducts("bestSeller") }
      : topRated
        ? { className: "catalog-badge--rated", label: tProducts("topRated") }
        : product.isNewArrival
          ? { className: "catalog-badge--new", label: tProducts("newArrival") }
          : null;

  return (
    <article className={cn("catalog-product-card group", className)}>
      <div className="catalog-product-card__media">
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0 z-[1]"
          aria-label={product.name}
        >
          {image ? (
            <RemoteImage
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              className="object-contain transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-small">
              —
            </div>
          )}
        </Link>

        {badge && (
          <div className="catalog-product-card__badge">
            <span className={cn("catalog-badge", badge.className)}>
              {badge.label}
            </span>
          </div>
        )}

        <button
          type="button"
          className={cn(
            "catalog-product-card__wish",
            isWishlisted && "catalog-product-card__wish--active"
          )}
          onClick={handleWishlist}
          aria-label={tCatalog("wishlist")}
        >
          <Heart
            className={cn("h-4 w-4", isWishlisted && "fill-current")}
          />
        </button>

        <div className="catalog-product-card__actions">
          <Link
            href={`/products/${product.slug}`}
            className="catalog-product-card__action"
            aria-label={tProducts("quickView")}
            onClick={(e) => e.stopPropagation()}
          >
            <Eye className="h-4 w-4" />
          </Link>
          <button
            type="button"
            className={cn(
              "catalog-product-card__action",
              isCompared && "bg-primary text-white border-primary"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleCompare(product._id);
            }}
            aria-label={tCatalog("compare")}
          >
            <GitCompareArrows className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="catalog-product-card__action"
            onClick={handleQuickAdd}
            disabled={!outOfStock && justAdded}
            aria-label={t("addToCart")}
          >
            {justAdded ? (
              <Check className="h-4 w-4" />
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="catalog-product-card__body">
        {(rating > 0 || reviewCount > 0) && (
          <div className="catalog-product-card__rating">
            <StarRating rating={rating} count={reviewCount} />
          </div>
        )}

        <Link href={`/products/${product.slug}`}>
          <h3 className="catalog-product-card__name">{product.name}</h3>
        </Link>

        {subtitleParts.length > 0 && (
          <p className="catalog-product-card__meta">
            {subtitleParts.join(" • ")}
          </p>
        )}

        <div className="catalog-product-card__price-row">
          <PriceDisplay
            amountUsd={product.pricing.price}
            className="text-base font-bold text-foreground"
          />
          {onSale && (
            <>
              <PriceDisplay
                amountUsd={product.pricing.compareAtPrice!}
                className="text-small text-muted-foreground line-through"
              />
              {discountPercent > 0 && (
                <span className="catalog-product-card__discount">
                  {tProducts("percentOff", { percent: discountPercent })}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="catalog-product-card__footer">
        {showLowStock && !product.hasVariants && !outOfStock && (
          <div className="mb-2 flex justify-center">
            <LowStockHint count={stock} className="text-xs" />
          </div>
        )}
        {product.hasVariants ? (
          <>
            <button
              type="button"
              className={cn(
                "catalog-product-card__cta",
                justAdded && "catalog-product-card__cta--success"
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
                <>
                  <Heart className="h-4 w-4" />
                  {t("addToWishlist")}
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  {t("addToCart")}
                </>
              )}
            </button>
            <VariantQuickAddModal
              product={product}
              open={variantModalOpen}
              onOpenChange={setVariantModalOpen}
            />
          </>
        ) : (
          <button
            type="button"
            className={cn(
              "catalog-product-card__cta",
              justAdded && "catalog-product-card__cta--success"
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
              <>
                <Heart className="h-4 w-4" />
                {t("addToWishlist")}
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                {t("addToCart")}
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
}
