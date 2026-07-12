"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ds/button";

export function EmptyCart() {
  const t = useTranslations("cart");

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center md:py-24">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary shadow-[var(--shadow-subtle)]">
        <ShoppingBag className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h1 className="mt-8 text-display-h3 text-foreground">{t("empty")}</h1>
      <p className="mt-3 max-w-sm text-body text-muted-foreground">{t("emptyDesc")}</p>
      <Button className="mt-8" size="lg" asChild>
        <Link href="/products">{t("startShopping")}</Link>
      </Button>
      <Button className="mt-3" variant="ghost" asChild>
        <Link href="/products">{t("continueShopping")}</Link>
      </Button>
    </div>
  );
}
