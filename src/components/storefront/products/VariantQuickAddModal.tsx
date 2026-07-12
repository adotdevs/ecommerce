"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Check, ShoppingBag, Sparkles } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalTitle,
} from "@/components/ds/modal";
import { Button } from "@/components/ds/button";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";
import { ProductVariantSelector } from "@/components/storefront/products/ProductVariantSelector";
import { LowStockHint } from "@/components/storefront/products/LowStockHint";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { isLowStock } from "@/lib/inventory/stock";
import type { ProductCardData } from "@/lib/catalog/product-card";
import type { ProductVariantInput } from "@/lib/catalog/variant-options";
import { cn } from "@/components/ds/utils";

interface VariantQuickAddModalProps {
  product: ProductCardData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VariantQuickAddModal({
  product,
  open,
  onOpenChange,
}: VariantQuickAddModalProps) {
  const t = useTranslations("common");
  const tp = useTranslations("products");
  const { addToCart, justAdded } = useAddToCart();
  const [selectedVariant, setSelectedVariant] = useState<
    ProductVariantInput | undefined
  >();

  const handleVariantChange = useCallback(
    (variant: ProductVariantInput | undefined) => {
      setSelectedVariant(variant);
    },
    []
  );

  const image = product.media?.[0];
  const price = selectedVariant?.price ?? product.pricing.price;
  const compareAt =
    selectedVariant?.compareAtPrice ?? product.pricing.compareAtPrice;
  const onSale = compareAt != null && compareAt > price;
  const stock = selectedVariant?.stock ?? 0;
  const inStock = stock > 0;
  const showLowStock = isLowStock(stock);

  const handleAddToCart = async () => {
    if (!selectedVariant || !inStock || justAdded) return;
    const ok = await addToCart({
      productId: product._id,
      variantId: selectedVariant.id,
      name: `${product.name} — ${selectedVariant.name}`,
      slug: product.slug,
      image: image?.url,
      price: selectedVariant.price,
      quantity: 1,
      maxQuantity: selectedVariant.stock,
    });
    if (ok) onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-[420px] gap-0 overflow-hidden border-border/80 p-0 shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/12 via-card to-brand-accent/8 px-6 pb-5 pt-6">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-brand-accent/10 blur-2xl"
            aria-hidden
          />

          <div className="relative flex gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-white/20 bg-white shadow-[var(--shadow-card)]">
              {image ? (
                <Image
                  src={image.url}
                  alt={image.alt ?? product.name}
                  fill
                  className="object-contain p-1.5"
                  sizes="96px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  —
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              {product.brandName && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {product.brandName}
                </p>
              )}
              <ModalTitle className="line-clamp-2 text-left text-base font-semibold leading-snug">
                {product.name}
              </ModalTitle>
              <ModalDescription className="mt-1 flex items-center gap-1.5 text-left text-[12px]">
                <Sparkles className="h-3 w-3 text-primary" />
                {tp("selectOptions")}
              </ModalDescription>

              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                <PriceDisplay
                  amountUsd={price}
                  className="text-lg font-bold text-foreground"
                />
                {onSale && (
                  <PriceDisplay
                    amountUsd={compareAt!}
                    className="text-small text-muted-foreground line-through"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          {open && product.variants && product.variantOptions && (
            <ProductVariantSelector
              key={`${product._id}-${open}`}
              variantOptions={product.variantOptions}
              variants={product.variants}
              onVariantChange={handleVariantChange}
            />
          )}

          {selectedVariant && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border/80 bg-secondary/40 px-3 py-2.5">
              <p className="text-[12px] font-medium text-foreground">
                {selectedVariant.name}
              </p>
              {inStock ? (
                showLowStock ? (
                  <LowStockHint count={stock} className="text-[11px] px-2 py-1" />
                ) : (
                  <span className="text-[11px] font-medium text-brand-accent">
                    {t("inStock")}
                  </span>
                )
              ) : (
                <span className="text-[11px] font-medium text-destructive">
                  {t("outOfStock")}
                </span>
              )}
            </div>
          )}

          <Button
            size="lg"
            className={cn(
              "w-full rounded-full",
              justAdded && "bg-brand-accent text-white hover:bg-brand-accent",
              showLowStock && !justAdded && "h-auto min-h-12 py-2.5"
            )}
            variant={justAdded ? "accent" : "primary"}
            onClick={handleAddToCart}
            disabled={!selectedVariant || !inStock || justAdded}
          >
            {justAdded ? (
              <>
                <Check className="h-4 w-4" />
                {t("addedToCart")}
              </>
            ) : (
              <span className="flex flex-col items-center gap-0.5">
                <span className="inline-flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  {t("addToCart")}
                </span>
                {showLowStock && inStock && (
                  <LowStockHint count={stock} compact className="text-white/90" />
                )}
              </span>
            )}
          </Button>

          <p className="text-center">
            <Link
              href={`/products/${product.slug}`}
              className="text-[12px] font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
              onClick={() => onOpenChange(false)}
            >
              {tp("viewDetails")}
            </Link>
          </p>
        </div>
      </ModalContent>
    </Modal>
  );
}
