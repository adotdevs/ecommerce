"use client";

import { useEffect, useRef, useState } from "react";

export interface WishlistAvailability {
  productId: string;
  inStock: boolean;
  hasVariants: boolean;
  canQuickAdd: boolean;
  maxQuantity: number;
}

export function useWishlistAvailability(
  productIds: string[],
  enabled = true
) {
  const [availability, setAvailability] = useState<
    Map<string, WishlistAvailability>
  >(new Map());
  const fetchedRef = useRef("");

  useEffect(() => {
    if (!enabled || productIds.length === 0) {
      setAvailability(new Map());
      return;
    }

    const signature = productIds.join("|");
    if (fetchedRef.current === signature) return;

    let cancelled = false;

    fetch("/api/v1/cart/stock-limits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: productIds.map((productId) => ({ productId })),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success) return;
        const map = new Map<string, WishlistAvailability>();
        for (const line of data.data.items ?? []) {
          map.set(line.productId, {
            productId: line.productId,
            inStock: Boolean(line.inStock),
            hasVariants: Boolean(line.hasVariants),
            canQuickAdd: Boolean(line.canQuickAdd),
            maxQuantity: Number(line.maxQuantity ?? line.available ?? 0),
          });
        }
        setAvailability(map);
        fetchedRef.current = signature;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [enabled, productIds]);

  return availability;
}
