"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

interface StockLimitLine {
  productId: string;
  variantId?: string;
  maxQuantity: number;
  valid?: boolean;
}

interface CartState {
  items: CartItem[];
  sessionId: string;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  applyStockLimits: (limits: StockLimitLine[]) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
  itemCount: () => number;
  subtotal: () => number;
}

function lineKey(productId: string, variantId?: string) {
  return `${productId}:${variantId ?? ""}`;
}

function clampQuantity(quantity: number, maxQuantity?: number) {
  const min = quantity <= 0 ? 0 : Math.max(1, quantity);
  if (maxQuantity == null) return min;
  if (maxQuantity <= 0) return 0;
  return Math.min(min, maxQuantity);
}

const getSessionId = () => {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("cart_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("cart_session_id", id);
  }
  return id;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      sessionId: getSessionId(),
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) =>
              i.productId === item.productId && i.variantId === item.variantId
          );
          const maxQuantity = item.maxQuantity ?? existing?.maxQuantity;

          if (existing) {
            const nextQuantity = clampQuantity(
              existing.quantity + item.quantity,
              maxQuantity
            );
            if (nextQuantity <= 0) {
              return {
                items: state.items.filter(
                  (i) =>
                    !(
                      i.productId === item.productId &&
                      i.variantId === item.variantId
                    )
                ),
              };
            }
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.variantId === item.variantId
                  ? {
                      ...i,
                      quantity: nextQuantity,
                      maxQuantity: maxQuantity ?? i.maxQuantity,
                    }
                  : i
              ),
            };
          }

          const quantity = clampQuantity(item.quantity, maxQuantity);
          if (quantity <= 0) return state;

          return {
            items: [...state.items, { ...item, quantity, maxQuantity }],
          };
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        })),
      updateQuantity: (productId, quantity, variantId) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === productId && i.variantId === variantId
          );
          const nextQuantity = clampQuantity(
            quantity,
            existing?.maxQuantity
          );

          if (nextQuantity <= 0) {
            return {
              items: state.items.filter(
                (i) =>
                  !(i.productId === productId && i.variantId === variantId)
              ),
            };
          }

          return {
            items: state.items.map((i) =>
              i.productId === productId && i.variantId === variantId
                ? { ...i, quantity: nextQuantity }
                : i
            ),
          };
        }),
      applyStockLimits: (limits) =>
        set((state) => {
          const limitMap = new Map(
            limits.map((line) => [
              lineKey(line.productId, line.variantId),
              line,
            ])
          );

          const nextItems = state.items
            .map((item) => {
              const limit = limitMap.get(
                lineKey(item.productId, item.variantId)
              );
              if (limit?.valid === false) return null;
              const maxQuantity =
                limit != null
                  ? Math.max(0, limit.maxQuantity)
                  : item.maxQuantity;
              if (maxQuantity != null && maxQuantity <= 0) return null;
              const quantity = clampQuantity(item.quantity, maxQuantity);
              if (quantity <= 0) return null;
              return { ...item, maxQuantity, quantity };
            })
            .filter(Boolean) as CartItem[];

          return { items: nextItems };
        }),
      clearCart: () => set({ items: [] }),
      setItems: (items) => set({ items }),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: "cart-storage" }
  )
);
