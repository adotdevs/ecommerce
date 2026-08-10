"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ds/button";
import { Separator } from "@/components/ds/separator";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";
import { PaymentMethodBadges } from "@/components/storefront/cart/PaymentMethodBadges";
import { CartSupportCard } from "@/components/storefront/cart/CartSupportCard";
import { PromoCodeInput } from "@/components/storefront/cart/PromoCodeInput";
import { useFormattedPrice } from "@/hooks/use-formatted-price";
import { cn } from "@/components/ds/utils";

interface OrderSummaryProps {
  itemCount: number;
  subtotalUsd: number;
  shippingUsd: number;
  taxUsd: number;
  discountUsd?: number;
  totalUsd: number;
  itemsSummary: string;
  promoCode?: string;
  className?: string;
}

function SummaryRow({
  label,
  amountUsd,
  highlight,
  accent,
  freeLabel,
}: {
  label: string;
  amountUsd: number;
  highlight?: boolean;
  accent?: boolean;
  freeLabel?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        highlight ? "text-body font-bold text-foreground" : "text-small text-muted-foreground"
      )}
    >
      <span className={highlight ? "text-foreground" : undefined}>{label}</span>
      {freeLabel && amountUsd === 0 ? (
        <span className={cn(highlight && "text-display-h3 font-bold", "text-brand-accent")}>
          {freeLabel}
        </span>
      ) : (
        <PriceDisplay
          amountUsd={amountUsd}
          className={cn(
            highlight && "text-display-h3 font-bold",
            accent && "text-brand-accent"
          )}
        />
      )}
    </div>
  );
}

export function OrderSummary({
  itemCount,
  subtotalUsd,
  shippingUsd,
  taxUsd,
  discountUsd = 0,
  totalUsd,
  itemsSummary,
  promoCode,
  className,
}: OrderSummaryProps) {
  const t = useTranslations("cart");
  const tc = useTranslations("common");
  const router = useRouter();
  const subtotalFmt = useFormattedPrice(subtotalUsd);
  const shippingFmt = useFormattedPrice(shippingUsd);
  const taxFmt = useFormattedPrice(taxUsd);
  const discountFmt = useFormattedPrice(discountUsd);
  const totalFmt = useFormattedPrice(totalUsd);

  const handleCheckout = () => {
    fetch("/api/v1/cart/checkout-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemCount,
        itemsSummary,
        subtotalDisplay: subtotalFmt,
        shippingDisplay: shippingFmt,
        taxDisplay: taxFmt,
        discountDisplay: discountUsd > 0 ? `-${discountFmt}` : undefined,
        totalDisplay: totalFmt,
        promoCode,
        path: `${window.location.pathname}${window.location.search}`,
      }),
      keepalive: true,
    }).catch(() => {
      // Silent — notification should never block checkout.
    });

    router.push("/checkout");
  };

  return (
    <aside
      className={cn(
        "h-fit rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-[var(--shadow-card)] md:p-6 lg:sticky lg:top-24",
        className
      )}
    >
      <h2 className="text-body font-bold text-foreground">{t("summary")}</h2>

      <div className="mt-5 space-y-3">
        <SummaryRow
          label={t("subtotalItems", { count: itemCount })}
          amountUsd={subtotalUsd}
        />
        <SummaryRow
          label={t("shipping")}
          amountUsd={shippingUsd}
          freeLabel={tc("free")}
        />
        {discountUsd > 0 && (
          <SummaryRow
            label={t("discount")}
            amountUsd={-discountUsd}
            accent
          />
        )}
        <SummaryRow label={t("tax")} amountUsd={taxUsd} />
      </div>

      <Separator className="my-5" />

      <SummaryRow label={t("total")} amountUsd={totalUsd} highlight />

      {discountUsd > 0 && (
        <p className="mt-3 rounded-[var(--radius-sm)] bg-brand-accent/10 px-3 py-2 text-center text-[12px] font-medium text-brand-accent">
          {t("savedOnOrder")}{" "}
          <PriceDisplay amountUsd={discountUsd} className="inline font-semibold" />
        </p>
      )}

      <div className="mt-5">
        <PromoCodeInput subtotalUsd={subtotalUsd} />
      </div>

      <Button
        className="mt-5 w-full max-md:h-12 max-md:min-h-[48px] max-md:rounded-full"
        size="lg"
        onClick={handleCheckout}
      >
        <Lock className="h-4 w-4" />
        {t("checkout")}
      </Button>

      <div className="mt-5 border-t border-border pt-5">
        <p className="text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("weAccept")}
        </p>
        <PaymentMethodBadges className="mt-3" />
      </div>

      <CartSupportCard className="mt-4" />
    </aside>
  );
}
