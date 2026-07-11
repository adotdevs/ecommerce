"use client";

import { useEffect } from "react";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { FIRST_VISIT_STORAGE_KEY } from "@/lib/visitors/constants";

export function FirstVisitTracker() {
  const mounted = useClientMounted();

  useEffect(() => {
    if (!mounted) return;
    if (localStorage.getItem(FIRST_VISIT_STORAGE_KEY)) return;

    const payload = {
      path: `${window.location.pathname}${window.location.search}`,
      referrer: document.referrer || null,
      screen: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      platform: navigator.platform,
    };

    fetch("/api/v1/visitors/first-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then(async (res) => {
        if (!res.ok) return;
        const json = (await res.json()) as {
          success?: boolean;
          data?: { tracked?: boolean; reason?: string };
        };
        if (
          json.success &&
          (json.data?.tracked || json.data?.reason === "already_tracked")
        ) {
          localStorage.setItem(FIRST_VISIT_STORAGE_KEY, "1");
        }
      })
      .catch(() => {
        // Silent — tracking should never block the storefront.
      });
  }, [mounted]);

  return null;
}
