"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/hooks/use-toast";
import { useCartStore } from "@/stores/cart-store";
import type { CartItem } from "@/types";

/** Brief success state for add-to-cart buttons + toast with View cart action */
export function useAddToCart() {
  const t = useTranslations("common");
  const tc = useTranslations("cart");
  const addItem = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addToCart = useCallback(
    async (item: CartItem) => {
      const sessionId = useCartStore.getState().sessionId;
      const items = useCartStore.getState().items;
      const existing = items.find(
        (i) => i.productId === item.productId && i.variantId === item.variantId
      );
      const currentQty = existing?.quantity ?? 0;
      const requestedTotal = currentQty + (item.quantity || 1);

      try {
        const res = await fetch("/api/v1/cart/reserve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            lines: [
              {
                productId: item.productId,
                variantId: item.variantId,
                quantity: requestedTotal,
              },
            ],
          }),
        });
        const data = await res.json();

        if (!data.success) {
          toast({
            variant: "warning",
            title: data.error ?? t("outOfStock"),
          });
          return false;
        }

        const line = data.data.lines?.[0];
        if (!line?.valid) {
          toast({
            variant: "warning",
            title: item.variantId ? t("outOfStock") : t("chooseOptions"),
          });
          return false;
        }

        const allowedTotal = Number(line.allowedQuantity ?? 0);
        const maxQuantity = Number(line.maxQuantity ?? allowedTotal);
        const addQty = allowedTotal - currentQty;

        if (addQty <= 0) {
          toast({
            variant: "warning",
            title: tc("maxQuantityReached"),
          });
          return false;
        }

        addItem({ ...item, quantity: addQty, maxQuantity });
        setJustAdded(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setJustAdded(false), 1800);

        if (addQty < (item.quantity || 1)) {
          toast({
            variant: "warning",
            title: tc("maxQuantityReached"),
            description: item.name,
          });
        } else {
          toast({
            variant: "success",
            title: t("addedToCart"),
            description: item.name,
            duration: 3500,
            action: {
              label: t("viewCart"),
              href: "/cart",
            },
          });
        }
        return true;
      } catch {
        toast({
          variant: "warning",
          title: t("outOfStock"),
        });
        return false;
      }
    },
    [addItem, t, tc]
  );

  return { addToCart, justAdded };
}
