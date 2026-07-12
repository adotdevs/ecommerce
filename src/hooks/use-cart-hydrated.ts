"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/cart-store";

/** True after zustand cart persist has rehydrated from localStorage. */
export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() => setHydrated(true));
    if (useCartStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  return hydrated;
}
