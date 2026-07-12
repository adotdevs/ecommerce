"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/stores/cart-store";
import { getCartItemKey } from "@/lib/cart/display";

export function useCartStockLimits(enabled: boolean) {
  const items = useCartStore((s) => s.items);
  const sessionId = useCartStore((s) => s.sessionId);
  const applyStockLimits = useCartStore((s) => s.applyStockLimits);
  const fetchedRef = useRef("");

  useEffect(() => {
    if (!enabled) return;

    const signature = items
      .map((item) => `${getCartItemKey(item)}:${item.quantity}`)
      .join("|");
    if (fetchedRef.current === signature) return;

    let cancelled = false;

    const syncReservations = async () => {
      try {
        if (!items.length) {
          await fetch(
            `/api/v1/cart/reserve?sessionId=${encodeURIComponent(sessionId)}`,
            { method: "DELETE" }
          );
          if (!cancelled) {
            applyStockLimits([]);
            fetchedRef.current = signature;
          }
          return;
        }

        const res = await fetch("/api/v1/cart/reserve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            lines: items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
            })),
          }),
        });
        const data = await res.json();
        if (cancelled || !data.success) return;

        const lines = (data.data.lines ?? []).map(
          (line: {
            productId: string;
            variantId?: string;
            maxQuantity: number;
            valid: boolean;
          }) => ({
            productId: line.productId,
            variantId: line.variantId,
            maxQuantity: Number(line.maxQuantity ?? 0),
            valid: line.valid !== false,
          })
        );

        applyStockLimits(lines);
        fetchedRef.current = signature;
      } catch {
        // Keep local cart; checkout will re-validate server-side.
      }
    };

    void syncReservations();

    return () => {
      cancelled = true;
    };
  }, [enabled, items, sessionId, applyStockLimits]);
}
