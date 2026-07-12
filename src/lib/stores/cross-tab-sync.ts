"use client";

import type { StoreApi } from "zustand";
import type { PersistOptions } from "zustand/middleware";

type PersistedStore = StoreApi<unknown> & {
  persist: {
    getOptions: () => PersistOptions<unknown, unknown>;
    rehydrate: () => Promise<void> | void;
  };
};

/** Keep zustand persist stores in sync when localStorage changes in another tab. */
export function bindPersistedStoreCrossTabSync(store: PersistedStore) {
  if (typeof window === "undefined") return () => {};

  const key = store.persist.getOptions().name;
  if (!key) return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key !== key) return;
    void store.persist.rehydrate();
  };

  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export function bindPersistedStoresCrossTabSync(stores: PersistedStore[]) {
  const unsubs = stores.map((store) => bindPersistedStoreCrossTabSync(store));
  return () => {
    for (const unsub of unsubs) unsub();
  };
}
