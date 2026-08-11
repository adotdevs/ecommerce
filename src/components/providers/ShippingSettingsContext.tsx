"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_SHIPPING_SETTINGS,
  normalizeShippingSettings,
  type ShippingSettings,
} from "@/lib/shipping/settings";

const ShippingSettingsContext = createContext<ShippingSettings>(
  DEFAULT_SHIPPING_SETTINGS
);

export function ShippingSettingsProvider({
  value,
  children,
}: {
  value: ShippingSettings;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState(value);

  useEffect(() => {
    setSettings(value);
  }, [value]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/v1/settings/site", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success || !data.data?.shipping) return;
        setSettings(normalizeShippingSettings(data.data.shipping));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ShippingSettingsContext.Provider value={settings}>
      {children}
    </ShippingSettingsContext.Provider>
  );
}

export function useShippingSettings() {
  return useContext(ShippingSettingsContext);
}
