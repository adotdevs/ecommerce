"use client";

import { Check, Package, Truck, Home, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ds/button";
import { cn } from "@/components/ds/utils";
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

  const paymentLabel = t(
    `paymentMethods.${getPaymentLabelKey(order.paymentMethod)}`
  );

  return (
    <section className="relative left-1/2 -ml-[50vw] w-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-120px] h-[480px] w-[min(100%,900px)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.14)_0%,transparent_68%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.07)_0%,transparent_68%)]" />
        <div className="absolute right-[10%] top-32 h-2 w-2 rounded-full bg-brand-accent/30" />
        <div className="absolute left-[12%] top-48 h-1.5 w-1.5 rounded-full bg-primary/25" />
        <div className="absolute right-[18%] top-56 h-1.5 w-1.5 rounded-full bg-brand-accent/20" />
      </div>

      <div className="relative mx-auto min-h-[calc(100dvh-5rem)] max-w-2xl px-4 py-12 md:py-16">
        <div className="text-center">
          <div className="relative mx-auto mb-7 flex h-[88px] w-[88px] items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-brand-accent/15" />
            <span className="absolute inset-2 rounded-full bg-brand-accent/10" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-accent text-white shadow-[0_10px_30px_rgba(34,197,94,0.28)]">
              <Check className="h-8 w-8" strokeWidth={2.5} />
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[2rem]">
            {t("successTitle")}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
            {t("successSubtitle")}
          </p>

          <div className="mx-auto mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm shadow-[var(--shadow-subtle)]">
            <Mail className="h-4 w-4 shrink-0 text-brand-accent" />
            <span className="truncate text-foreground">
              {t("successEmail", { email: order.email })}
            </span>
          </div>
        </div>

        <div className="mt-10 overflow-hidden rounded-[20px] border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            <DetailLabel className="border-b border-r border-border lg:border-r">
              {t("orderNumber")}
            </DetailLabel>
            <DetailLabel className="border-b border-border lg:border-r">
              {t("orderDate")}
            </DetailLabel>
            <DetailLabel className="border-b border-r border-border lg:border-r">
              {t("totalAmount")}
            </DetailLabel>
            <DetailLabel className="border-b border-border">
              {t("reviewPaymentMethod")}
            </DetailLabel>

            <DetailValue className="border-r border-border lg:border-r">
              <span className="font-mono text-[13px] tracking-tight">
                {order.orderNumber}
              </span>
            </DetailValue>
            <DetailValue className="border-r border-border lg:border-r">
              {orderDate}
            </DetailValue>
            <DetailValue
              className="border-r border-border text-brand-accent lg:border-r"
            >
              {totalFmt}
            </DetailValue>
            <DetailValue>
              <span className="inline-flex items-center gap-2">
                {order.paymentMethod === "card" && (
                  <span className="relative inline-block h-4 w-7 shrink-0">
                    <Image
                      src="/payments/visa.svg"
                      alt=""
                      fill
                      className="object-contain"
                      sizes="28px"
                    />
                  </span>
                )}
                <span>{paymentLabel}</span>
              </span>
            </DetailValue>
          </div>
        </div>

        <div className="mt-6 rounded-[20px] border border-border bg-card p-6 shadow-[var(--shadow-subtle)] md:p-8">
          <h2 className="text-center text-lg font-bold text-foreground">
            {t("whatHappensNext")}
          </h2>

          <div className="relative mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
            <div
              aria-hidden
              className="absolute left-[16.67%] right-[16.67%] top-6 hidden h-px bg-border md:block"
            />
            <NextStep
              icon={Package}
              title={t("nextConfirmed")}
              desc={t("nextConfirmedDesc")}
              active
            />
            <NextStep
              icon={Truck}
              title={t("nextShipped")}
              desc={t("nextShippedDesc")}
            />
            <NextStep
              icon={Home}
              title={t("nextDelivered")}
              desc={t("nextDeliveredDesc")}
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
          <Button
            size="lg"
            className="h-12 flex-1 rounded-[14px] bg-gradient-to-r from-[#5b4df5] to-primary font-semibold text-white shadow-[0_8px_20px_rgba(79,70,229,0.25)] hover:text-white sm:max-w-[220px]"
            asChild
          >
            <Link href="/account" className="text-white hover:text-white">
              {t("viewMyOrder")}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 flex-1 rounded-[14px] border-border bg-card sm:max-w-[220px]"
            asChild
          >
            <Link href="/products">{to("continueShopping")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function DetailLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:px-5 lg:text-left",
        className
      )}
    >
      {children}
    </div>
  );
}

function DetailValue({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[72px] items-start px-4 py-4 text-center text-sm font-bold leading-snug text-foreground lg:min-h-[76px] lg:px-5 lg:text-left md:text-[15px]",
        className
      )}
    >
      <div className="w-full">{children}</div>
    </div>
  );
}

function NextStep({
  icon: Icon,
  title,
  desc,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  active?: boolean;
}) {
  return (
    <div className="relative z-[1] flex flex-col items-center text-center">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full border-2 bg-card",
          active
            ? "border-brand-accent text-brand-accent shadow-[0_0_0_4px_rgba(34,197,94,0.12)]"
            : "border-border text-muted-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 max-w-[200px] text-[13px] leading-relaxed text-muted-foreground">
        {desc}
      </p>
    </div>
  );
}
