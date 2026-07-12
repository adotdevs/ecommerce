"use client";

import { useMobileBottomBarPadding } from "@/components/storefront/layout/MobileBottomBar";
import { cn } from "@/components/ds/utils";

export function StorefrontMain({ children }: { children: React.ReactNode }) {
  const paddingClass = useMobileBottomBarPadding();

  return <main className={cn("flex-1", paddingClass)}>{children}</main>;
}
