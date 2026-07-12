"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { useFormattedPrice } from "@/hooks/use-formatted-price";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { Button } from "@/components/ds/button";
import { cn } from "@/components/ds/utils";

const HIDDEN_PATHS = new Set(["/cart", "/checkout"]);

export function MobileBottomBar() {
  const t = useTranslations("cart");
  const pathname = usePathname();
  const mounted = useClientMounted();
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

  if (!mounted || itemCount === 0 || HIDDEN_PATHS.has(pathname)) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[60] border-t border-border bg-background/95 backdrop-blur-md md:hidden",
        "pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 px-4"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-small text-muted-foreground">
            {t("items", { count: itemCount })}
          </p>
          <p className="text-body font-semibold">{formatted}</p>
        </div>
        <Button
          size="lg"
          asChild
          className="h-12 min-h-[48px] flex-1 max-w-[220px] rounded-full text-body"
        >
          <Link href="/checkout">
            <ShoppingCart className="h-5 w-5" />
            {t("checkout")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Reserve space above the mobile cart bar so page content is not covered. */
export function useMobileBottomBarPadding() {
  const pathname = usePathname();
  const mounted = useClientMounted();
  const itemCount = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.quantity, 0)
  );

  if (!mounted || itemCount === 0 || HIDDEN_PATHS.has(pathname)) {
    return "pb-6 md:pb-0";
  }

  return "pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0";
}
