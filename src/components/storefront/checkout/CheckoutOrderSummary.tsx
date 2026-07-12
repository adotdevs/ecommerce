"use client";

import Image from "next/image";
import { Shield, Headphones, RotateCcw, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ds/button";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";
import { PaymentMethodBadges } from "@/components/storefront/cart/PaymentMethodBadges";
import { splitCartItemName, getCartItemKey } from "@/lib/cart/display";
import { cn } from "@/components/ds/utils";
import type { CartItem } from "@/types";

interface CheckoutOrderSummaryProps {
  items: CartItem[];
  itemCount: number;
  subtotalUsd: number;
  shippingUsd: number;
  taxUsd: number;
  discountUsd?: number;
  totalUsd: number;
  className?: string;
}

function SummaryLine({
  label,
  amountUsd,
  bold,
  accent,
  freeLabel,
}: {
  label: string;
  amountUsd: number;
  bold?: boolean;
  accent?: boolean;
  freeLabel?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 text-sm",
        bold ? "text-base font-bold text-foreground" : "text-muted-foreground"
      )}
    >
      <span className={bold ? "text-foreground" : undefined}>{label}</span>
      {freeLabel && amountUsd === 0 ? (
        <span className="font-semibold text-brand-accent">{freeLabel}</span>
      ) : (
        <PriceDisplay
          amountUsd={amountUsd}
          className={cn(
            bold && "text-lg font-bold",
            accent && "font-semibold text-brand-accent"
          )}
        />
      )}
    </div>
  );
}

function CheckoutLineItem({ item }: { item: CartItem }) {
  const { title, variant } = splitCartItemName(item.name);
  const lineTotal = item.price * item.quantity;

  return (
    <div className="flex gap-3 py-3">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary">
        {item.image ? (
          <Image
            src={item.image}
            alt={title}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
            —
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium text-foreground">{title}</p>
        {variant && (
          <p className="mt-0.5 text-xs text-muted-foreground">{variant}</p>
        )}
        <PriceDisplay
          amountUsd={item.price}
          className="mt-1 text-xs text-muted-foreground"
        />
      </div>
      <div className="shrink-0 text-right">
        <span className="text-xs text-muted-foreground">×{item.quantity}</span>
        <PriceDisplay
          amountUsd={lineTotal}
          className="mt-1 block text-sm font-semibold text-foreground"
        />
      </div>
    </div>
  );
}

export function CheckoutOrderSummary({
  items,
  itemCount,
  subtotalUsd,
  shippingUsd,
  taxUsd,
  discountUsd = 0,
  totalUsd,
  className,
}: CheckoutOrderSummaryProps) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const tc = useTranslations("common");

  return (
    <aside className={cn("space-y-4", className)}>
      <div className="rounded-[20px] border border-border bg-card p-5 shadow-[var(--shadow-subtle)] lg:sticky lg:top-24 lg:rounded-[22px] lg:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-foreground">{t("orderSummary")}</h2>
          <span className="text-xs text-muted-foreground">
            {tCart("items", { count: itemCount })}
          </span>
        </div>

        <div className="mt-4 divide-y divide-border">
          {items.map((item) => (
            <CheckoutLineItem key={getCartItemKey(item)} item={item} />
          ))}
        </div>

        <div className="mt-4 space-y-2.5 border-t border-border pt-4">
          <SummaryLine label={tCart("subtotal")} amountUsd={subtotalUsd} />
          <SummaryLine
            label={tCart("shipping")}
            amountUsd={shippingUsd}
            freeLabel={tc("free")}
          />
          {discountUsd > 0 && (
            <SummaryLine
              label={tCart("discount")}
              amountUsd={-discountUsd}
              accent
            />
          )}
          <SummaryLine label={tCart("tax")} amountUsd={taxUsd} />
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <SummaryLine label={tCart("total")} amountUsd={totalUsd} bold />
        </div>

        {discountUsd > 0 && (
          <div className="mt-4 rounded-xl bg-brand-accent/10 px-4 py-3 text-center text-sm font-medium text-brand-accent">
            {t("savingBox")}{" "}
            <PriceDisplay amountUsd={discountUsd} className="inline font-bold" />
          </div>
        )}

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
          <TrustMini icon={Lock} label={t("trustSecure")} />
          <TrustMini icon={RotateCcw} label={t("trustReturns")} />
          <TrustMini icon={Headphones} label={t("trustSupport")} />
        </div>
      </div>

      <WeAcceptCard />
      <NeedHelpCard />
      <ShopConfidenceCard />
    </aside>
  );
}

function TrustMini({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-[10px] leading-tight text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function WeAcceptCard() {
  const t = useTranslations("cart");
  return (
    <div className="rounded-[18px] border border-border bg-card p-4 shadow-[var(--shadow-subtle)]">
      <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("weAccept")}
      </p>
      <PaymentMethodBadges className="mt-3" />
    </div>
  );
}

function NeedHelpCard() {
  const t = useTranslations("cart");
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-secondary/40 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{t("needHelp")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("supportDesc")}</p>
        <Button variant="outline" size="sm" className="mt-2 h-8 rounded-full" asChild>
          <Link href="/pages/contact">{t("contactSupport")}</Link>
        </Button>
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Headphones className="h-5 w-5" />
      </div>
    </div>
  );
}

function ShopConfidenceCard() {
  const t = useTranslations("checkout");
  return (
    <div className="flex gap-3 rounded-[18px] border border-border bg-card p-4 shadow-[var(--shadow-subtle)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Shield className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          {t("shopConfidence")}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("shopConfidenceDesc")}
        </p>
      </div>
    </div>
  );
}
