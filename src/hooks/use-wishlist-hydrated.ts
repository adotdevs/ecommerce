"use client";

import { useEffect, useState } from "react";
import { useWishlistStore } from "@/stores/wishlist-store";

/** True after zustand wishlist persist has rehydrated from localStorage. */
export function useWishlistHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useWishlistStore.persist.onFinishHydration(() =>
      setHydrated(true)
    );
    if (useWishlistStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  return hydrated;
}
