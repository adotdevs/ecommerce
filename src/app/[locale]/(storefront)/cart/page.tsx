"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { useFormattedPrice } from "@/hooks/use-formatted-price";
import { Button } from "@/components/ds/button";
import { Separator } from "@/components/ds/separator";

function CartSummaryRow({
  label,
  amountUsd,
  highlight,
}: {
  label: string;
  amountUsd: number;
  highlight?: boolean;
}) {
  const formatted = useFormattedPrice(amountUsd);
  return (
    <div
      className={`flex justify-between ${highlight ? "text-lg font-bold" : "text-sm"}`}
    >
      <span>{label}</span>
      <span>{formatted}</span>
    </div>
  );
}

export default function CartPage() {
  const t = useTranslations("cart");
  const tc = useTranslations("common");

  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const subtotalUsd = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const shippingUsd = subtotalUsd >= 100 ? 0 : 9.99;
  const taxUsd = subtotalUsd * 0.08;
  const totalUsd = subtotalUsd + shippingUsd + taxUsd;

  if (items.length === 0) {
    return (
      <div className="container-store py-16 text-center md:py-24">
        <h1 className="text-display-h3 text-foreground">{t("empty")}</h1>
        <p className="mt-3 text-body text-muted-foreground">{t("emptyDesc")}</p>
        <Button className="mt-8" size="lg" asChild>
          <Link href="/products">{t("continueShopping")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-store py-8 md:py-12">
      <h1 className="mb-8 text-display-h3 text-foreground">
        {t("title")} ({t("items", { count: itemCount })})
      </h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <CartLineItem
              key={`${item.productId}-${item.variantId}`}
              item={item}
              onUpdate={updateQuantity}
              onRemove={removeItem}
            />
          ))}
        </div>

        <div className="h-fit rounded-[var(--radius-md)] border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">{t("summary")}</h2>
          <Separator className="my-4" />
          <div className="space-y-2">
            <CartSummaryRow label={t("subtotal")} amountUsd={subtotalUsd} />
            <CartSummaryRow
              label={t("shipping")}
              amountUsd={shippingUsd}
            />
            <CartSummaryRow label={t("tax")} amountUsd={taxUsd} />
          </div>
          <Separator className="my-4" />
          <CartSummaryRow label={t("total")} amountUsd={totalUsd} highlight />
          <Button className="mt-6 w-full" size="lg" asChild>
            <Link href="/checkout">{t("checkout")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function CartLineItem({
  item,
  onUpdate,
  onRemove,
}: {
  item: {
    productId: string;
    variantId?: string;
    name: string;
    slug: string;
    image?: string;
    price: number;
    quantity: number;
  };
  onUpdate: (productId: string, quantity: number, variantId?: string) => void;
  onRemove: (productId: string, variantId?: string) => void;
}) {
  const lineTotal = useFormattedPrice(item.price * item.quantity);
  const unitPrice = useFormattedPrice(item.price);

  return (
    <div className="flex gap-4 rounded-[var(--radius-md)] border border-border bg-card p-4">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-secondary">
        {item.image && (
          <Image src={item.image} alt={item.name} fill className="object-cover" />
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <Link href={`/products/${item.slug}`} className="font-medium hover:underline">
            {item.name}
          </Link>
          <p className="text-sm text-muted-foreground">{unitPrice} each</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdate(item.productId, item.quantity - 1, item.variantId)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdate(item.productId, item.quantity + 1, item.variantId)}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8 text-destructive"
            onClick={() => onRemove(item.productId, item.variantId)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="text-right font-semibold">{lineTotal}</div>
    </div>
  );
}
