"use client";

import { Check, Package, Truck, Home, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ds/button";
import { useFormattedPrice } from "@/hooks/use-formatted-price";
import { getPaymentLabelKey } from "@/lib/checkout/utils";
import type { PlacedOrderResult } from "@/lib/checkout/types";

interface SuccessOrderProps {
  order: PlacedOrderResult;
}

export function SuccessOrder({ order }: SuccessOrderProps) {
  const t = useTranslations("checkout");
  const to = useTranslations("order");
  const totalFmt = useFormattedPrice(order.total);
  const orderDate = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="relative mx-auto max-w-3xl px-4 py-10 md:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand-accent/15 to-transparent dark:from-brand-accent/10" />

      <div className="relative text-center">
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <span className="absolute -left-2 top-2 h-2 w-2 rounded-full bg-brand-accent/60" />
          <span className="absolute -right-1 top-6 h-2.5 w-2.5 rounded-full bg-brand-accent/40" />
          <span className="absolute bottom-1 left-4 h-1.5 w-1.5 rounded-full bg-primary/50" />
          <span className="absolute bottom-3 right-3 h-2 w-2 rounded-full bg-brand-accent/50" />
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-accent shadow-[0_12px_32px_rgba(34,197,94,0.35)]">
            <Check className="h-10 w-10 text-white" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {t("successTitle")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("successSubtitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("successEmail", { email: order.email })}
        </p>
      </div>

      <div className="relative mt-8 rounded-[22px] border border-border bg-card p-5 shadow-[var(--shadow-card)] md:p-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <DetailBlock label={t("orderNumber")} value={order.orderNumber} />
          <DetailBlock label={t("orderDate")} value={orderDate} />
          <DetailBlock label={t("totalAmount")} value={totalFmt} />
          <DetailBlock
            label={t("reviewPaymentMethod")}
            value={
              <span className="inline-flex items-center gap-2">
                {order.paymentMethod === "card" && (
                  <span className="relative inline-block h-4 w-7">
                    <Image
                      src="/payments/visa.svg"
                      alt=""
                      fill
                      className="object-contain"
                      sizes="28px"
                    />
                  </span>
                )}
                {t(`paymentMethods.${getPaymentLabelKey(order.paymentMethod)}`)}
              </span>
            }
          />
        </div>
      </div>

      <div className="relative mt-6 rounded-[22px] border border-border bg-card p-5 shadow-[var(--shadow-subtle)] md:p-6">
        <h2 className="text-center text-lg font-bold text-foreground">
          {t("whatHappensNext")}
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <NextStep
            icon={Package}
            title={t("nextConfirmed")}
            desc={t("nextConfirmedDesc")}
          />
          <NextStep
            icon={Truck}
            title={t("nextShipped")}
            desc={t("nextShippedDesc")}
            showArrow
          />
          <NextStep
            icon={Home}
            title={t("nextDelivered")}
            desc={t("nextDeliveredDesc")}
          />
        </div>
      </div>

      <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button
          size="lg"
          className="h-12 min-w-[200px] rounded-[14px] bg-gradient-to-r from-[#5b4df5] to-primary font-semibold"
          asChild
        >
          <Link href="/account">{t("viewMyOrder")}</Link>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 min-w-[200px] rounded-[14px]"
          asChild
        >
          <Link href="/products">{to("continueShopping")}</Link>
        </Button>
      </div>
    </div>
  );
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-foreground md:text-base">
        {value}
      </p>
    </div>
  );
}

function NextStep({
  icon: Icon,
  title,
  desc,
  showArrow,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  showArrow?: boolean;
}) {
  return (
    <div className="relative text-center">
      {showArrow && (
        <ArrowRight className="absolute -left-3 top-6 hidden h-4 w-4 text-border md:block lg:-left-5" />
      )}
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
