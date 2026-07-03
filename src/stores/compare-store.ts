"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_COMPARE = 4;

interface CompareState {
  productIds: string[];
  addProduct: (id: string) => boolean;
  removeProduct: (id: string) => void;
  hasProduct: (id: string) => boolean;
  toggleProduct: (id: string) => boolean;
  clear: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      productIds: [],
      addProduct: (id) => {
        const current = get().productIds;
        if (current.includes(id)) return true;
        if (current.length >= MAX_COMPARE) return false;
        set({ productIds: [...current, id] });
        return true;
      },
      removeProduct: (id) =>
        set((s) => ({
          productIds: s.productIds.filter((p) => p !== id),
        })),
      hasProduct: (id) => get().productIds.includes(id),
      toggleProduct: (id) => {
        if (get().hasProduct(id)) {
          get().removeProduct(id);
          return true;
        }
        return get().addProduct(id);
      },
      clear: () => set({ productIds: [] }),
    }),
    { name: "compare-storage" }
  )
);

export const MAX_COMPARE_ITEMS = MAX_COMPARE;
