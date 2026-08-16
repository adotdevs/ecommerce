"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Card } from "@heroui/react";
import { Link } from "@/i18n/navigation";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";
import { QuantitySelector } from "@/components/storefront/cart/QuantitySelector";
import { splitCartItemName } from "@/lib/cart/display";
import type { CartItem as CartItemType } from "@/types";

interface CartItemProps {
  item: CartItemType;
  onUpdate: (productId: string, quantity: number, variantId?: string) => void;
  onRemove: (productId: string, variantId?: string) => void;
}

export function CartItem({ item, onUpdate, onRemove }: CartItemProps) {
  const t = useTranslations("cart");
  const tc = useTranslations("common");
  const { title, variant } = splitCartItemName(item.name);

  return (
    <Card className="group p-4 transition-all duration-200 hover:border-primary/20 md:p-5">
      <div className="flex gap-4 md:gap-5">
        <Link
          href={`/products/${item.slug}`}
          className="product-line-thumb product-line-thumb--md relative h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-md)] product-media-surface md:h-28 md:w-28"
        >
          {item.image ? (
            <Image
              src={item.image}
              alt={title}
              fill
              className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="112px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              {tc("loading")}
            </div>
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/products/${item.slug}`}
                className="line-clamp-2 text-body font-semibold text-foreground transition-colors hover:text-primary"
              >
                {title}
              </Link>
              {variant && (
                <p className="mt-1 text-small text-muted-foreground">{variant}</p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <PriceDisplay
                amountUsd={item.price * item.quantity}
                className="text-body font-bold text-foreground"
              />
              <p className="mt-1 text-[12px] text-muted-foreground">
                <PriceDisplay amountUsd={item.price} className="inline" /> {t("each")}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <QuantitySelector
              quantity={item.quantity}
              max={item.maxQuantity}
              onDecrease={() =>
                onUpdate(item.productId, item.quantity - 1, item.variantId)
              }
              onIncrease={() =>
                onUpdate(item.productId, item.quantity + 1, item.variantId)
              }
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              isIconOnly
              className="border-border text-muted-foreground hover:border-destructive/30 hover:text-destructive"
              onPress={() => onRemove(item.productId, item.variantId)}
              aria-label={t("removeItem")}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
