"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { useFormattedPrice } from "@/hooks/use-formatted-price";
import { Button } from "@/components/ds/button";

export function MobileBottomBar() {
  const t = useTranslations("cart");
  const items = useCartStore((s) => s.items);

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const subtotalUsd = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const formatted = useFormattedPrice(subtotalUsd);

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 p-4 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-small text-muted-foreground">
            {t("items", { count: itemCount })}
          </p>
          <p className="text-body font-semibold">{formatted}</p>
        </div>
        <Button size="lg" asChild className="flex-1 max-w-[200px]">
          <Link href="/cart">
            <ShoppingCart className="h-4 w-4" />
            {t("checkout")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
