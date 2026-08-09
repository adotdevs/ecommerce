"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { hasAnyAdminRole } from "@/lib/auth/roles";
import { AuthFormCard } from "@/components/storefront/auth/AuthFormCard";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { useAuthBranding } from "@/components/storefront/auth/AuthBrandingProvider";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const t = useTranslations("auth");
  const { storeName } = useAuthBranding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "", rememberMe: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? t("loginFailed"));
        return;
      }

      setAuth(data.data.accessToken, data.data.user);

      const redirect = searchParams.get("redirect");
      const isAdmin = hasAnyAdminRole(data.data.user.roles);

      if (redirect?.startsWith("/admin")) {
        if (!isAdmin) {
          setError(t("adminAccessDenied"));
          return;
        }
        window.location.href = redirect;
        return;
      }

      if (isAdmin) {
        window.location.href = "/admin";
        return;
      }

      router.push(redirect ?? "/account");
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormCard
      storeName={storeName || undefined}
      title={t("signIn")}
      description={t("signInToStore", {
        storeName: storeName || t("fallbackStoreName"),
      })}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="h-11 rounded-xl"
          />
        </div>
        <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={form.rememberMe}
            onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          {t("rememberMe")}
        </label>
        <Button type="submit" className="h-11 w-full rounded-full" disabled={loading}>
          {loading ? t("signingIn") : t("signIn")}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            {t("createAccount")}
          </Link>
        </p>
      </form>
    </AuthFormCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
