"use client";

import { createContext, useContext, useMemo } from "react";
import type { SiteSettingsPublic } from "@/types";
import {
  brandingTokensFromSettings,
  type BrandingTokens,
} from "@/lib/site/branding-tokens";

interface SiteBrandingContextValue {
  settings: SiteSettingsPublic | null;
  tokens: BrandingTokens;
  storeName: string;
  storeTagline: string;
}

const SiteBrandingContext = createContext<SiteBrandingContextValue>({
  settings: null,
  tokens: {
    storeName: "",
    storeTagline: "",
    supportEmail: "",
    supportPhone: "",
    deliveryInfo: "",
  },
  storeName: "",
  storeTagline: "",
});

export function SiteBrandingProvider({
  settings,
  children,
}: {
  settings: SiteSettingsPublic | null;
  children: React.ReactNode;
}) {
  const value = useMemo(() => {
    const tokens = brandingTokensFromSettings(settings);
    return {
      settings,
      tokens,
      storeName: tokens.storeName,
      storeTagline: tokens.storeTagline,
    };
  }, [settings]);

  return (
    <SiteBrandingContext.Provider value={value}>
      {children}
    </SiteBrandingContext.Provider>
  );
}

export function useSiteBranding() {
  return useContext(SiteBrandingContext);
}
