"use client";

import { Toaster } from "@/components/ds/toaster";

export function ToastProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
