"use client";

import { createContext, useContext } from "react";

interface AuthBrandingContextValue {
  storeName: string;
  storeTagline: string;
}

const AuthBrandingContext = createContext<AuthBrandingContextValue>({
  storeName: "",
  storeTagline: "",
});

export function AuthBrandingProvider({
  value,
  children,
}: {
  value: AuthBrandingContextValue;
  children: React.ReactNode;
}) {
  return (
    <AuthBrandingContext.Provider value={value}>{children}</AuthBrandingContext.Provider>
  );
}

export function useAuthBranding() {
  return useContext(AuthBrandingContext);
}
