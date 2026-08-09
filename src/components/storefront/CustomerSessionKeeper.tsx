"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { hasAnyAdminRole } from "@/lib/auth/roles";

const REFRESH_INTERVAL_MS = 60 * 60 * 6 * 1000;

/** Keep customer sessions in sync with HttpOnly cookies on the storefront. */
export function CustomerSessionKeeper() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user && hasAnyAdminRole(user.roles)) return;

    let cancelled = false;

    const refreshSession = async () => {
      try {
        const res = await fetch("/api/v1/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();
        if (cancelled) return;

        if (!data.success || !data.data?.accessToken) {
          if (user) clearAuth();
          return;
        }

        if (user) {
          setAuth(data.data.accessToken, user);
          return;
        }

        const meRes = await fetch("/api/v1/customer/profile", {
          headers: { Authorization: `Bearer ${data.data.accessToken}` },
        });
        const meData = await meRes.json();
        if (cancelled || !meData.success) return;

        setAuth(data.data.accessToken, {
          id: meData.data.id,
          email: meData.data.email,
          firstName: meData.data.firstName,
          lastName: meData.data.lastName,
          roles: ["customer"],
        });
      } catch {
        /* ignore */
      }
    };

    refreshSession();
    const interval = setInterval(refreshSession, REFRESH_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshSession();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [setAuth, clearAuth, user]);

  return null;
}
