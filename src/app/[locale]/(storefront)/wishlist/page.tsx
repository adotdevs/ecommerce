"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Trash2, ShoppingCart } from "lucide-react";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useCartStore } from "@/stores/cart-store";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";
import { Button } from "@/components/ds/button";

export default function WishlistPage() {
  const t = useTranslations("wishlist");
  const tc = useTranslations("common");
  const { items, removeItem } = useWishlistStore();
  const addItem = useCartStore((s) => s.addItem);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("empty")}</h1>
        <p className="mt-2 text-muted-foreground">{t("emptyDesc")}</p>
        <Button className="mt-8 rounded-full" asChild>
          <Link href="/products">{tc("shopNow")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex gap-4 rounded-2xl border border-border/60 p-4"
          >
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
              {item.image && (
                <Image src={item.image} alt={item.name} fill className="object-cover" />
              )}
            </div>
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <Link href={`/products/${item.slug}`} className="font-medium hover:underline">
                  {item.name}
                </Link>
                <p className="mt-1">
                  <PriceDisplay amountUsd={item.price} />
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    addItem({
                      productId: item.productId,
                      name: item.name,
                      slug: item.slug,
                      image: item.image,
                      price: item.price,
                      quantity: 1,
                    });
                  }}
                >
                  <ShoppingCart className="mr-1 h-3 w-3" />
                  {t("moveToCart")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeItem(item.productId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
