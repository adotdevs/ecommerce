"use client";

import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Separator } from "@/components/ds/separator";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";
import { PaymentMethodBadges } from "@/components/storefront/cart/PaymentMethodBadges";
import { CartSupportCard } from "@/components/storefront/cart/CartSupportCard";
import { cn } from "@/components/ds/utils";

interface OrderSummaryProps {
  itemCount: number;
  subtotalUsd: number;
  shippingUsd: number;
  taxUsd: number;
  discountUsd?: number;
  totalUsd: number;
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
  className,
}: OrderSummaryProps) {
  const t = useTranslations("cart");
  const tc = useTranslations("common");
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  const handleApplyPromo = () => {
    const code = promoCode.trim();
    if (!code) return;
    setAppliedPromo(code);
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
        <SummaryRow label={t("tax")} amountUsd={taxUsd} />
        {discountUsd > 0 && (
          <SummaryRow
            label={t("discount")}
            amountUsd={-discountUsd}
            accent
          />
        )}
      </div>

      <Separator className="my-5" />

      <SummaryRow label={t("total")} amountUsd={totalUsd} highlight />

      {discountUsd > 0 && (
        <p className="mt-3 rounded-[var(--radius-sm)] bg-brand-accent/10 px-3 py-2 text-center text-[12px] font-medium text-brand-accent">
          {t("savedOnOrder")}{" "}
          <PriceDisplay amountUsd={discountUsd} className="inline font-semibold" />
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-[var(--radius-md)] border border-border">
        <button
          type="button"
          onClick={() => setPromoOpen((open) => !open)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-small font-medium text-foreground transition-colors hover:bg-secondary/60"
        >
          <span>{t("promoCode")}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              promoOpen && "rotate-180"
            )}
          />
        </button>

        {promoOpen && (
          <div className="border-t border-border px-4 py-4">
            <div className="flex gap-2">
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder={t("promoPlaceholder")}
                className="h-10"
              />
              <Button
                type="button"
                variant="primary"
                className="shrink-0"
                onClick={handleApplyPromo}
              >
                {t("applyPromo")}
              </Button>
            </div>
            {appliedPromo && (
              <p className="mt-2 text-[12px] text-muted-foreground">
                {t("promoApplied", { code: appliedPromo })}
              </p>
            )}
          </div>
        )}
      </div>

      <Button className="mt-5 w-full max-md:h-12 max-md:min-h-[48px] max-md:rounded-full" size="lg" asChild>
        <Link href="/checkout">
          <Lock className="h-4 w-4" />
          {t("checkout")}
        </Link>
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
