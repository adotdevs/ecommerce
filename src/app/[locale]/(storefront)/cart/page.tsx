"use client";

import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCartStore } from "@/stores/cart-store";
import { useCartHydrated } from "@/hooks/use-cart-hydrated";
import { useCartStockLimits } from "@/hooks/use-cart-stock-limits";
import { calculateCartTotals } from "@/lib/cart/display";
import { calculatePromoDiscountUsd } from "@/lib/promo/validate";
import { Button } from "@/components/ds/button";
import { CartItem } from "@/components/storefront/cart/CartItem";
import { CartPageSkeleton } from "@/components/storefront/cart/CartPageSkeleton";
import { EmptyCart } from "@/components/storefront/cart/EmptyCart";
import { FreeShippingProgress } from "@/components/storefront/cart/FreeShippingProgress";
import { OrderSummary } from "@/components/storefront/cart/OrderSummary";
import { getCartItemKey } from "@/lib/cart/display";

export default function CartPage() {
  const t = useTranslations("cart");
  const hydrated = useCartHydrated();
  useCartStockLimits(hydrated);

  const items = useCartStore((s) => s.items);
  const appliedPromo = useCartStore((s) => s.appliedPromo);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotalUsd = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const discountUsd = useMemo(
    () =>
      appliedPromo
        ? calculatePromoDiscountUsd(subtotalUsd, appliedPromo.percentOff)
        : 0,
    [appliedPromo, subtotalUsd]
  );

  const { shippingUsd, taxUsd, totalUsd } = useMemo(
    () => calculateCartTotals(subtotalUsd, discountUsd),
    [subtotalUsd, discountUsd]
  );

  if (!hydrated) {
    return <CartPageSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="bg-secondary/30">
        <EmptyCart />
      </div>
    );
  }

  return (
    <div className="bg-secondary/30">
      <div className="container-store py-8 md:py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-display-h2 text-foreground">{t("title")}</h1>
            <nav
              aria-label="Breadcrumb"
              className="mt-2 flex items-center gap-2 text-small text-muted-foreground"
            >
              <Link href="/" className="transition-colors hover:text-foreground">
                {t("breadcrumbHome")}
              </Link>
              <span aria-hidden>/</span>
              <span className="text-foreground">{t("breadcrumbCart")}</span>
            </nav>
          </div>

          <Button variant="outline" className="rounded-full" asChild>
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
              {t("continueShopping")}
            </Link>
          </Button>
        </div>

        <FreeShippingProgress subtotalUsd={subtotalUsd} className="mt-6" />

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map((item) => (
              <CartItem
                key={getCartItemKey(item)}
                item={item}
                onUpdate={updateQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>

          <OrderSummary
            itemCount={itemCount}
            subtotalUsd={subtotalUsd}
            shippingUsd={shippingUsd}
            taxUsd={taxUsd}
            discountUsd={discountUsd}
            totalUsd={totalUsd}
          />
        </div>
      </div>
    </div>
  );
}
