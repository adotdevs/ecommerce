"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

const REFRESH_INTERVAL_MS = 60 * 60 * 6 * 1000;

/** Keep admin API tokens in sync with HttpOnly cookies for multi-day sessions. */
export function AdminSessionKeeper() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    let cancelled = false;

    const refreshSession = async () => {
      try {
        const res = await fetch("/api/v1/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();
        if (cancelled || !data.success || !data.data?.accessToken) return;
        setAuth(data.data.accessToken, user);
      } catch {
        /* ignore — middleware will redirect if the session is fully expired */
      }
    };

    refreshSession();
    const interval = setInterval(refreshSession, REFRESH_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refreshSession();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [setAuth, user]);

  return null;
}
