"use client";

import { useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth-store";
import { AuthFormCard } from "@/components/storefront/auth/AuthFormCard";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { PasswordInput } from "@/components/ds/password-input";
import { Label } from "@/components/ds/label";
import { useAuthBranding } from "@/components/storefront/auth/AuthBrandingProvider";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const t = useTranslations("auth");
  const { storeName } = useAuthBranding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? t("registerFailed"));
        return;
      }

      setAuth(data.data.accessToken, data.data.user);
      router.push("/account");
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormCard
      storeName={storeName || undefined}
      title={t("createAccount")}
      description={t("createAccountAt", {
        storeName: storeName || t("fallbackStoreName"),
      })}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t("firstName")}</Label>
            <Input
              id="firstName"
              autoComplete="given-name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{t("lastName")}</Label>
            <Input
              id="lastName"
              autoComplete="family-name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
        </div>
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
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="h-11 rounded-xl"
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
          />
        </div>
        <Button type="submit" className="h-11 w-full rounded-full" disabled={loading}>
          {loading ? t("creatingAccount") : t("createAccount")}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </form>
    </AuthFormCard>
  );
}
