"use client";

import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@heroui/react";
import { Link, useRouter } from "@/i18n/navigation";
import { useCartStore } from "@/stores/cart-store";
import { useCartHydrated } from "@/hooks/use-cart-hydrated";
import { useCartStockLimits } from "@/hooks/use-cart-stock-limits";
import { calculateCartTotals } from "@/lib/cart/display";
import { buildShippingOptions, cartAllItemsHaveFreeShipping } from "@/lib/checkout/shipping";
import { useDisplayPreferences } from "@/components/providers/DisplayPreferencesContext";
import { useShippingSettings } from "@/components/providers/ShippingSettingsContext";
import { useTaxRatePercent } from "@/components/providers/TaxRateContext";
import { calculatePromoDiscountUsd } from "@/lib/promo/validate";
import { CartItem } from "@/components/storefront/cart/CartItem";
import { CartPageSkeleton } from "@/components/storefront/cart/CartPageSkeleton";
import { EmptyCart } from "@/components/storefront/cart/EmptyCart";
import { FreeShippingProgress } from "@/components/storefront/cart/FreeShippingProgress";
import { OrderSummary } from "@/components/storefront/cart/OrderSummary";
import { getCartItemKey } from "@/lib/cart/display";

export default function CartPage() {
  const t = useTranslations("cart");
  const router = useRouter();
  const hydrated = useCartHydrated();
  useCartStockLimits(hydrated);

  const items = useCartStore((s) => s.items);
  const appliedPromo = useCartStore((s) => s.appliedPromo);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const { country } = useDisplayPreferences();
  const shippingSettings = useShippingSettings();
  const taxRatePercent = useTaxRatePercent();

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

  const { shippingUsd, taxUsd, totalUsd } = useMemo(() => {
    const allItemsHaveFreeShipping = cartAllItemsHaveFreeShipping(items);
    return calculateCartTotals(subtotalUsd, discountUsd, {
      ...buildShippingOptions(country, shippingSettings),
      allItemsHaveFreeShipping,
      taxRatePercent,
    });
  }, [subtotalUsd, discountUsd, country, shippingSettings, items, taxRatePercent]);

  const itemsSummary = useMemo(
    () =>
      items
        .map((item) => `${item.quantity}x ${item.name}`)
        .join("; ")
        .slice(0, 500),
    [items]
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

          <Button
            variant="outline"
            className="rounded-full"
            onPress={() => router.push("/products")}
          >
            <ArrowLeft />
            {t("continueShopping")}
          </Button>
        </div>

        <FreeShippingProgress
          subtotalUsd={subtotalUsd}
          allItemsHaveFreeShipping={cartAllItemsHaveFreeShipping(items)}
          className="mt-6"
        />

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
            itemsSummary={itemsSummary}
            promoCode={appliedPromo?.code}
          />
        </div>
      </div>
    </div>
  );
}
