"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, GitCompareArrows, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";
import { StarRating, getProductRating } from "@/components/storefront/products/StarRating";
import { useCartStore } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useCompareStore } from "@/stores/compare-store";
import { cn } from "@/components/ds/utils";

interface ProductCardProps {
  product: {
    _id: string;
    name: string;
    slug: string;
    pricing: { price: number; compareAtPrice?: number; currency?: string };
    media?: { url: string; alt?: string }[];
    brandName?: string;
    featured?: boolean;
    inventory?: { stock: number };
  };
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const t = useTranslations("common");
  const addItem = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isWishlisted = useWishlistStore((s) => s.hasItem(product._id));
  const toggleCompare = useCompareStore((s) => s.toggleProduct);
  const image = product.media?.[0];
  const onSale =
    product.pricing.compareAtPrice != null &&
    product.pricing.compareAtPrice > product.pricing.price;
  const outOfStock = product.inventory?.stock === 0;
  const { rating, count } = getProductRating(product._id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem({
      productId: product._id,
      name: product.name,
      slug: product.slug,
      image: image?.url,
      price: product.pricing.price,
      quantity: 1,
    });
  };

  return (
    <motion.article
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-card shadow-[var(--shadow-subtle)] transition-shadow duration-200 hover:shadow-[var(--shadow-card)]",
        className
      )}
    >
      <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
          {image ? (
            <Image
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(max-width:640px) 50vw, 25vw"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-small">
              —
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-col gap-1">
            {onSale && <Badge variant="destructive">{t("sale")}</Badge>}
            {product.featured && <Badge variant="default">{t("featured")}</Badge>}
          </div>

          <div className="absolute right-3 top-3 flex flex-col gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Button
              size="icon-sm"
              variant="secondary"
              className="bg-card/90 backdrop-blur-sm"
              onClick={(e) => {
                e.preventDefault();
                toggleWishlist({
                  productId: product._id,
                  name: product.name,
                  slug: product.slug,
                  image: image?.url,
                  price: product.pricing.price,
                });
              }}
              aria-label={t("addToCart")}
            >
              <Heart
                className={cn("h-4 w-4", isWishlisted && "fill-red-500 text-red-500")}
              />
            </Button>
            <Button
              size="icon-sm"
              variant="secondary"
              className="bg-card/90 backdrop-blur-sm"
              onClick={(e) => {
                e.preventDefault();
                toggleCompare(product._id);
              }}
            >
              <GitCompareArrows className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          {product.brandName && (
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {product.brandName}
            </p>
          )}
          <h3 className="line-clamp-2 text-small font-medium leading-snug text-foreground">
            {product.name}
          </h3>
          <StarRating rating={rating} count={count} />
          <div className="mt-auto flex items-baseline gap-2">
            <PriceDisplay amountUsd={product.pricing.price} className="text-body font-semibold" />
            {onSale && (
              <PriceDisplay
                amountUsd={product.pricing.compareAtPrice!}
                className="text-small text-muted-foreground line-through"
              />
            )}
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4">
        <Button
          size="md"
          variant="primary"
          className="w-full"
          onClick={handleAddToCart}
          disabled={outOfStock}
        >
          <ShoppingBag className="h-4 w-4" />
          {outOfStock ? t("outOfStock") : t("addToCart")}
        </Button>
      </div>
    </motion.article>
  );
}
