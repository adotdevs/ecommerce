"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/hooks/use-toast";
import { useCartStore } from "@/stores/cart-store";
import type { CartItem } from "@/types";

/** Brief success state for add-to-cart buttons + toast with View cart action */
export function useAddToCart() {
  const t = useTranslations("common");
  const addItem = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addToCart = useCallback(
    (item: CartItem) => {
      addItem(item);
      setJustAdded(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setJustAdded(false), 1800);

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
    },
    [addItem, t]
  );

  return { addToCart, justAdded };
}
