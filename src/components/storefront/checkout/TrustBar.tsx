"use client";

import { Truck, Shield, RotateCcw, Headphones } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ds/utils";

const TRUST_ITEMS = [
  { icon: Truck, titleKey: "trustFreeShipping", descKey: "trustFreeShippingDesc" },
  { icon: Shield, titleKey: "trustSecurePayment", descKey: "trustSecurePaymentDesc" },
  { icon: RotateCcw, titleKey: "trustEasyReturns", descKey: "trustEasyReturnsDesc" },
  { icon: Headphones, titleKey: "trust247", descKey: "trust247Desc" },
] as const;

export function TrustBar({ className }: { className?: string }) {
  const t = useTranslations("checkout");

  return (
    <section
      className={cn(
        "mt-10 rounded-[20px] border border-border bg-card p-5 shadow-[var(--shadow-subtle)] md:p-6",
        className
      )}
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST_ITEMS.map(({ icon: Icon, titleKey, descKey }) => (
          <div key={titleKey} className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t(titleKey)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t(descKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
