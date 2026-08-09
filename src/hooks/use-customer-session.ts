"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { hasAnyAdminRole, isCustomerUser } from "@/lib/auth/roles";

interface MeResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
}

export function useCustomerSession() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function syncStore(profile: MeResponse, token: string) {
      setAuth(token, {
        id: profile.id,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        roles: profile.roles,
      });
    }

    async function resolveSession() {
      if (user && isCustomerUser(user.roles ?? [])) {
        setCustomerEmail(user.email);
        setResolved(true);
        return;
      }

      if (user && hasAnyAdminRole(user.roles ?? [])) {
        setCustomerEmail(null);
        setResolved(true);
        return;
      }

      try {
        let token = accessToken;

        if (!token) {
          const refreshRes = await fetch("/api/v1/auth/refresh", {
            method: "POST",
            credentials: "include",
          });
          const refreshData = await refreshRes.json();
          if (refreshData.success && refreshData.data?.accessToken) {
            token = refreshData.data.accessToken;
          }
        }

        const meRes = await fetch("/api/v1/auth/me", {
          credentials: "include",
          ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        });
        const meData = await meRes.json();
        if (cancelled) return;

        if (meData.success && isCustomerUser(meData.data.roles ?? [])) {
          const profile = meData.data as MeResponse;
          setCustomerEmail(profile.email);
          if (token) await syncStore(profile, token);
        } else {
          setCustomerEmail(null);
        }
      } catch {
        if (!cancelled) setCustomerEmail(null);
      } finally {
        if (!cancelled) setResolved(true);
      }
    }

    resolveSession();

    return () => {
      cancelled = true;
    };
  }, [accessToken, setAuth, user]);

  return {
    customerEmail,
    isCustomer: !!customerEmail,
    isGuest: resolved && !customerEmail,
    resolved,
  };
}
