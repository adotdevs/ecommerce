"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WishlistItem {
  productId: string;
  name: string;
  slug: string;
  image?: string;
  price: number;
  addedAt: string;
}

interface WishlistState {
  items: WishlistItem[];
  addItem: (item: Omit<WishlistItem, "addedAt">) => void;
  removeItem: (productId: string) => void;
  hasItem: (productId: string) => boolean;
  toggleItem: (item: Omit<WishlistItem, "addedAt">) => void;
  setItems: (items: WishlistItem[]) => void;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((s) => {
          if (s.items.some((i) => i.productId === item.productId)) return s;
          return {
            items: [
              ...s.items,
              { ...item, addedAt: new Date().toISOString() },
            ],
          };
        }),
      removeItem: (productId) =>
        set((s) => ({
          items: s.items.filter((i) => i.productId !== productId),
        })),
      hasItem: (productId) =>
        get().items.some((i) => i.productId === productId),
      toggleItem: (item) => {
        if (get().hasItem(item.productId)) {
          get().removeItem(item.productId);
        } else {
          get().addItem(item);
        }
      },
      setItems: (items) => set({ items }),
      clear: () => set({ items: [] }),
    }),
    { name: "wishlist-storage" }
  )
);
