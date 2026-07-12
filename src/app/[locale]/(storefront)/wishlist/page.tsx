"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Trash2, ShoppingCart, Check, ExternalLink } from "lucide-react";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { useWishlistAvailability } from "@/hooks/use-wishlist-availability";
import { useCartHydrated } from "@/hooks/use-cart-hydrated";
import { useWishlistHydrated } from "@/hooks/use-wishlist-hydrated";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";
import { Button } from "@/components/ds/button";
import { Badge } from "@/components/ds/badge";
import { PRODUCT_GRID_CLASS } from "@/lib/catalog/product-grid";

export default function WishlistPage() {
  const t = useTranslations("wishlist");
  const tc = useTranslations("common");
  const { items, removeItem } = useWishlistStore();
  const { addToCart } = useAddToCart();
  const hydrated = useWishlistHydrated();
  const cartHydrated = useCartHydrated();
  const productIds = useMemo(
    () => items.map((item) => item.productId),
    [items]
  );
  const availability = useWishlistAvailability(productIds, cartHydrated);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (!addedId) return;
    const tmr = setTimeout(() => setAddedId(null), 1800);
    return () => clearTimeout(tmr);
  }, [addedId]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-muted" />
        <div className={PRODUCT_GRID_CLASS}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

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
      <div className={PRODUCT_GRID_CLASS}>
        {items.map((item) => {
          const isAdded = addedId === item.productId;
          const stock = availability.get(item.productId);
          const stockKnown = availability.size > 0;
          const inStock = stock?.inStock ?? false;
          const hasVariants = stock?.hasVariants ?? false;
          const canQuickAdd = stock?.canQuickAdd ?? false;

          return (
            <div
              key={item.productId}
              className="flex gap-4 rounded-2xl border border-border/60 p-4"
            >
              <Link
                href={`/products/${item.slug}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted"
              >
                {item.image && (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                )}
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/products/${item.slug}`}
                      className="font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    {!inStock && (
                      <Badge variant="destructive" className="text-[10px]">
                        {tc("outOfStock")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1">
                    <PriceDisplay amountUsd={item.price} />
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!stockKnown ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled
                    >
                      {tc("loading")}
                    </Button>
                  ) : canQuickAdd && inStock ? (
                    <Button
                      size="sm"
                      variant={isAdded ? "accent" : "outline"}
                      className="rounded-full"
                      onClick={async () => {
                        if (isAdded) return;
                        const ok = await addToCart({
                          productId: item.productId,
                          name: item.name,
                          slug: item.slug,
                          image: item.image,
                          price: item.price,
                          quantity: 1,
                          maxQuantity: stock?.maxQuantity,
                        });
                        if (ok) setAddedId(item.productId);
                      }}
                    >
                      {isAdded ? (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          {tc("addedToCart")}
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-1 h-3 w-3" />
                          {t("moveToCart")}
                        </>
                      )}
                    </Button>
                  ) : inStock && hasVariants ? (
                    <Button size="sm" variant="outline" className="rounded-full" asChild>
                      <Link href={`/products/${item.slug}`}>
                        <ExternalLink className="mr-1 h-3 w-3" />
                        {tc("chooseOptions")}
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="rounded-full" asChild>
                      <Link href={`/products/${item.slug}`}>
                        <ExternalLink className="mr-1 h-3 w-3" />
                        {t("viewProduct")}
                      </Link>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeItem(item.productId)}
                    aria-label={t("remove")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
