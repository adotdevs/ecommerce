"use client";

import { Headphones } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ds/button";
import { cn } from "@/components/ds/utils";

export function CartSupportCard({ className }: { className?: string }) {
  const t = useTranslations("cart");

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-secondary/50 px-4 py-3",
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-small font-semibold text-foreground">{t("needHelp")}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{t("supportDesc")}</p>
        <Button variant="outline" size="sm" className="mt-2 h-8 rounded-full" asChild>
          <Link href="/pages/contact">{t("contactSupport")}</Link>
        </Button>
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Headphones className="h-5 w-5" strokeWidth={1.75} />
      </div>
    </div>
  );
}
