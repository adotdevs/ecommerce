"use client";

import { useEffect } from "react";
import { bindPersistedStoresCrossTabSync } from "@/lib/stores/cross-tab-sync";
import { useCartStore } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";

/** Syncs cart and wishlist across browser tabs via localStorage events. */
export function PersistedStoreSync() {
  useEffect(() => {
    return bindPersistedStoresCrossTabSync([
      useCartStore as never,
      useWishlistStore as never,
    ]);
  }, []);

  return null;
}
