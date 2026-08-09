"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  LogOut,
  MapPin,
  Package,
  Settings,
  UserRound,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { hasAnyAdminRole } from "@/lib/auth/roles";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Badge } from "@/components/ds/badge";
import { cn } from "@/components/ds/utils";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";
import { useDisplayPreferences } from "@/components/providers/DisplayPreferencesContext";
import { applyPreferenceChange } from "@/lib/preferences/apply-change";
import { AccountSectionCard } from "@/components/storefront/account/AccountSectionCard";
import {
  AccountAddressCard,
  AccountAddressForm,
  type AddressFormState,
} from "@/components/storefront/account/AccountAddressForm";
import {
  countries,
  currencies,
  defaultLanguages,
  type CurrencyCode,
} from "@/config/locales";
import type { CustomerProfileResponse } from "@/lib/customer/profile";

interface Order {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
}

type Tab = "orders" | "profile" | "addresses" | "preferences";

const TAB_ITEMS: { id: Tab; icon: typeof Package }[] = [
  { id: "orders", icon: Package },
  { id: "profile", icon: UserRound },
  { id: "addresses", icon: MapPin },
  { id: "preferences", icon: Settings },
];

export function AccountDashboard() {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const ta = useTranslations("auth");
  const { accessToken, user, clearAuth } = useAuthStore();
  const { country, currency, locale } = useDisplayPreferences();

  const [tab, setTab] = useState<Tab>("orders");
  const [profile, setProfile] = useState<CustomerProfileResponse | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [prefCountry, setPrefCountry] = useState(country);
  const [prefCurrency, setPrefCurrency] = useState<CurrencyCode>(currency);
  const [prefLocale, setPrefLocale] = useState(locale);

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    currentPassword: "",
    newPassword: "",
  });

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }),
    [accessToken]
  );

  const loadData = useCallback(async () => {
    if (!accessToken || !user || hasAnyAdminRole(user.roles)) return;

    setLoading(true);
    try {
      const [profileRes, ordersRes] = await Promise.all([
        fetch("/api/v1/customer/profile", { headers: authHeaders() }),
        fetch("/api/v1/orders", { headers: authHeaders() }),
      ]);
      const profileData = await profileRes.json();
      const ordersData = await ordersRes.json();

      if (profileData.success) {
        setProfile(profileData.data);
        setProfileForm({
          firstName: profileData.data.firstName ?? "",
          lastName: profileData.data.lastName ?? "",
          email: profileData.data.email ?? "",
          currentPassword: "",
          newPassword: "",
        });
        if (profileData.data.preferences?.country) {
          setPrefCountry(profileData.data.preferences.country);
        }
        if (profileData.data.preferences?.currency) {
          setPrefCurrency(profileData.data.preferences.currency as CurrencyCode);
        }
        if (profileData.data.preferences?.locale) {
          setPrefLocale(profileData.data.preferences.locale);
        }
      }
      if (ordersData.success) setOrders(ordersData.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeaders, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await fetch("/api/v1/auth/refresh", { method: "DELETE", credentials: "include" });
    clearAuth();
    window.location.href = "/";
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/v1/customer/profile", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          email: profileForm.email,
          currentPassword: profileForm.currentPassword || undefined,
          newPassword: profileForm.newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setMessage(data.error ?? t("saveFailed"));
        return;
      }
      setProfile(data.data);
      setProfileForm((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
      }));
      setMessage(t("saved"));
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/v1/customer/profile", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          preferences: {
            locale: prefLocale,
            currency: prefCurrency,
            country: prefCountry,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setMessage(data.error ?? t("saveFailed"));
        return;
      }
      setProfile(data.data);
      applyPreferenceChange({
        country: prefCountry,
        currency: prefCurrency,
        locale: prefLocale,
      });
    } finally {
      setSaving(false);
    }
  };

  const addAddress = async (address: AddressFormState) => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/v1/customer/addresses", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...address,
          isDefault: profile?.addresses.length === 0,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setMessage(data.error ?? t("saveFailed"));
        return;
      }
      await loadData();
      setMessage(t("addressAdded"));
    } finally {
      setSaving(false);
    }
  };

  const removeAddress = async (id: string) => {
    const res = await fetch(`/api/v1/customer/addresses/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (data.success) await loadData();
  };

  const setDefaultAddress = async (id: string) => {
    const res = await fetch(`/api/v1/customer/addresses/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ isDefault: true }),
    });
    const data = await res.json();
    if (data.success) await loadData();
  };

  if (!user || hasAnyAdminRole(user.roles)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="mb-4 text-muted-foreground">{t("signInRequired")}</p>
        <Button asChild className="rounded-full">
          <Link href={{ pathname: "/login", query: { redirect: "/account" } }}>
            {ta("signIn")}
          </Link>
        </Button>
      </div>
    );
  }

  const displayName =
    [profileForm.firstName, profileForm.lastName].filter(Boolean).join(" ") ||
    user.email;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <div className="mb-8 rounded-[24px] border border-border bg-[linear-gradient(135deg,color-mix(in_srgb,var(--brand-primary)_8%,var(--card)),var(--card))] p-6 shadow-[var(--shadow-subtle)] md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--brand-primary)_14%,transparent)] text-lg font-bold text-brand-primary">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {t("signOut")}
          </Button>
        </div>
      </div>

      {message && (
        <p className="mb-4 rounded-xl border border-brand-accent/30 bg-brand-accent/5 px-4 py-3 text-sm text-foreground">
          {message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
        <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {TAB_ITEMS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setMessage("");
              }}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                tab === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(id)}
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-5">
          {loading ? (
            <p className="text-muted-foreground">{tc("loading")}</p>
          ) : (
            <>
              {tab === "orders" && (
                <AccountSectionCard
                  title={t("orders")}
                  subtitle={t("ordersSubtitle")}
                >
                  {orders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                      <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                      <p className="font-medium text-foreground">{t("noOrders")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("noOrdersDesc")}
                      </p>
                      <Button asChild className="mt-4 rounded-full">
                        <Link href="/products">{tc("shopNow")}</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <div
                          key={order._id}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-border/70 bg-background/60 p-4"
                        >
                          <div>
                            <p className="font-semibold">{order.orderNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="secondary">{order.status}</Badge>
                            <PriceDisplay
                              amountUsd={order.total}
                              className="font-semibold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AccountSectionCard>
              )}

              {tab === "profile" && (
                <div className="space-y-5">
                  <AccountSectionCard
                    title={t("personalInfo")}
                    subtitle={t("personalInfoSubtitle")}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">{t("firstName")}</Label>
                        <Input
                          id="firstName"
                          value={profileForm.firstName}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, firstName: e.target.value })
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">{t("lastName")}</Label>
                        <Input
                          id="lastName"
                          value={profileForm.lastName}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, lastName: e.target.value })
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="email">{t("email")}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileForm.email}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, email: e.target.value })
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                    </div>
                    <Button
                      className="mt-5 rounded-full"
                      onClick={saveProfile}
                      disabled={saving}
                    >
                      {saving ? tc("loading") : t("saveChanges")}
                    </Button>
                  </AccountSectionCard>

                  <AccountSectionCard
                    title={t("changePassword")}
                    subtitle={t("changePasswordSubtitle")}
                  >
                    <div className="grid max-w-md gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={profileForm.currentPassword}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              currentPassword: e.target.value,
                            })
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">{t("newPassword")}</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={profileForm.newPassword}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              newPassword: e.target.value,
                            })
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                    </div>
                    <Button
                      className="mt-5 rounded-full"
                      onClick={saveProfile}
                      disabled={saving}
                    >
                      {saving ? tc("loading") : t("updatePassword")}
                    </Button>
                  </AccountSectionCard>
                </div>
              )}

              {tab === "addresses" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">{t("addresses")}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("addressesSubtitle")}
                    </p>
                  </div>

                  {(profile?.addresses ?? []).length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-border bg-card/50 px-6 py-10 text-center">
                      <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{t("noAddresses")}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(profile?.addresses ?? []).map((address) => (
                        <AccountAddressCard
                          key={address._id}
                          address={address}
                          onMakeDefault={setDefaultAddress}
                          onRemove={removeAddress}
                        />
                      ))}
                    </div>
                  )}

                  <AccountAddressForm
                    defaultCountry={country}
                    profileFirstName={profileForm.firstName}
                    profileLastName={profileForm.lastName}
                    saving={saving}
                    onSubmit={addAddress}
                  />
                </div>
              )}

              {tab === "preferences" && (
                <AccountSectionCard
                  title={t("preferences")}
                  subtitle={t("preferencesSubtitle")}
                >
                  <div className="grid max-w-lg gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pref-locale">{t("language")}</Label>
                      <select
                        id="pref-locale"
                        className="flex h-11 w-full rounded-xl border border-border bg-background px-4 text-sm"
                        value={prefLocale}
                        onChange={(e) => setPrefLocale(e.target.value)}
                      >
                        {defaultLanguages.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.nativeLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pref-currency">{t("currency")}</Label>
                      <select
                        id="pref-currency"
                        className="flex h-11 w-full rounded-xl border border-border bg-background px-4 text-sm"
                        value={prefCurrency}
                        onChange={(e) =>
                          setPrefCurrency(e.target.value as CurrencyCode)
                        }
                      >
                        {currencies.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pref-country">{t("deliverTo")}</Label>
                      <select
                        id="pref-country"
                        className="flex h-11 w-full rounded-xl border border-border bg-background px-4 text-sm"
                        value={prefCountry}
                        onChange={(e) => setPrefCountry(e.target.value)}
                      >
                        {countries.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button
                    className="mt-5 rounded-full"
                    onClick={savePreferences}
                    disabled={saving}
                  >
                    {saving ? tc("loading") : t("saveChanges")}
                  </Button>
                </AccountSectionCard>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
