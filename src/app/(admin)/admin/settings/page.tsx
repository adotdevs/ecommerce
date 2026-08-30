"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { PasswordInput } from "@/components/ds/password-input";
import { Label } from "@/components/ds/label";
import { Textarea } from "@/components/ds/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { Switch } from "@/components/ds/switch";
import { builtInLocaleCodes, localeConfig, countries, type LanguageEntry } from "@/config/locales";
import {
  DEFAULT_SHIPPING_SETTINGS,
  normalizeShippingSettings,
  type ShippingCountryRule,
  type ShippingSettings,
} from "@/lib/shipping/settings";
import {
  DEFAULT_TAX_RATE_PERCENT,
  normalizeTaxRatePercent,
} from "@/lib/tax/settings";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast, toastError } from "@/hooks/use-toast";

export default function AdminSettingsPage() {
  const { accessToken, user, setAuth } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [emailForm, setEmailForm] = useState({ newEmail: "", currentPassword: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingEmail, setChangingEmail] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [form, setForm] = useState({
    storeName: "",
    storeTagline: "",
    adminBrandShort: "",
    logo: "",
    logoDark: "",
    announcement: "",
    deliveryInfo: "",
    supportPhone: "",
    supportEmail: "",
    seoTitle: "",
    seoDescription: "",
  });
  const [offers, setOffers] = useState<string[]>(["", "", ""]);
  const [navigation, setNavigation] = useState<
    { label: string; href: string }[]
  >([]);
  const [languages, setLanguages] = useState<LanguageEntry[]>([]);
  const [newLang, setNewLang] = useState({ code: "", label: "", nativeLabel: "" });
  const [shipping, setShipping] = useState<ShippingSettings>(DEFAULT_SHIPPING_SETTINGS);
  const [newCountryRule, setNewCountryRule] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState(DEFAULT_TAX_RATE_PERCENT);
  const [taxSaved, setTaxSaved] = useState(false);

  useEffect(() => {
    fetch("/api/v1/settings/site")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setForm({
            storeName: d.data.storeName ?? "",
            storeTagline: d.data.storeTagline ?? "",
            adminBrandShort: d.data.adminBrandShort ?? "",
            logo: d.data.logo ?? "",
            logoDark: d.data.logoDark ?? "",
            announcement: d.data.announcement ?? "",
            deliveryInfo: d.data.deliveryInfo ?? "",
            supportPhone: d.data.supportPhone ?? "",
            supportEmail: d.data.supportEmail ?? "",
            seoTitle: d.data.seo?.title ?? "",
            seoDescription: d.data.seo?.description ?? "",
          });
          if (d.data.languages?.length) {
            setLanguages(
              d.data.languages.map((l: LanguageEntry) => ({
                code: l.code,
                label: l.label,
                nativeLabel: l.nativeLabel ?? l.label,
                dir: l.dir ?? "ltr",
                enabled: l.enabled !== false,
              }))
            );
          }
          if (d.data.shipping) {
            setShipping(normalizeShippingSettings(d.data.shipping));
          }
          if (d.data.taxRatePercent != null) {
            setTaxRatePercent(normalizeTaxRatePercent(d.data.taxRatePercent));
          }
          if (Array.isArray(d.data.offers) && d.data.offers.length) {
            const lines = d.data.offers.map(String);
            setOffers([lines[0] ?? "", lines[1] ?? "", lines[2] ?? ""]);
          }
          if (Array.isArray(d.data.navigation) && d.data.navigation.length) {
            setNavigation(
              d.data.navigation.map((item: { label?: string; href?: string }) => ({
                label: item.label ?? "",
                href: item.href ?? "",
              }))
            );
          }
        }
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/v1/admin/settings/site", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        storeName: form.storeName.trim(),
        storeTagline: form.storeTagline.trim(),
        adminBrandShort: form.adminBrandShort.trim(),
        logo: form.logo.trim() || undefined,
        logoDark: form.logoDark.trim() || undefined,
        announcement: form.announcement,
        deliveryInfo: form.deliveryInfo,
        supportPhone: form.supportPhone,
        supportEmail: form.supportEmail,
        seo: { title: form.seoTitle, description: form.seoDescription },
        languages,
        shipping,
        offers: offers.map((line) => line.trim()).filter(Boolean),
        navigation: navigation
          .map((item) => ({
            label: item.label.trim(),
            href: item.href.trim(),
          }))
          .filter((item) => item.label && item.href),
      }),
    });
    const data = await res.json();
    if (data.success) {
      setSaved(true);
      toast({ variant: "success", title: "Settings saved", description: "Site settings and languages updated." });
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setChangingEmail(true);
    try {
      const res = await fetch("/api/v1/auth/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify({
          action: "email",
          newEmail: emailForm.newEmail.trim(),
          currentPassword: emailForm.currentPassword,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toastError("Email change failed", data.error);
        return;
      }
      setAuth(data.data.accessToken, data.data.user);
      setEmailForm({ newEmail: "", currentPassword: "" });
      toast({
        variant: "success",
        title: "Email updated",
        description: `Your sign-in email is now ${data.data.user.email}.`,
      });
    } catch {
      toastError("Email change failed", "Network error. Please try again.");
    } finally {
      setChangingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toastError("Password change failed", "New passwords do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/v1/auth/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify({
          action: "password",
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toastError("Password change failed", data.error);
        return;
      }
      setAuth(data.data.accessToken, data.data.user);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        variant: "success",
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    } catch {
      toastError("Password change failed", "Network error. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  const addLanguage = () => {
    const code = newLang.code.trim().toLowerCase();
    if (!code || languages.some((l) => l.code === code)) return;
    const meta = localeConfig[code];
    setLanguages([
      ...languages,
      {
        code,
        label: newLang.label.trim() || meta?.label || code.toUpperCase(),
        nativeLabel: newLang.nativeLabel.trim() || meta?.nativeLabel || code.toUpperCase(),
        dir: meta?.dir ?? (["ar", "ur", "he", "fa"].includes(code) ? "rtl" : "ltr"),
        enabled: true,
      },
    ]);
    setNewLang({ code: "", label: "", nativeLabel: "" });
  };

  const quickAdd = (code: string) => {
    if (languages.some((l) => l.code === code)) return;
    const meta = localeConfig[code];
    if (!meta) return;
    setLanguages([
      ...languages,
      { code, label: meta.label, nativeLabel: meta.nativeLabel, dir: meta.dir, enabled: true },
    ]);
  };

  const addCountryRule = () => {
    const code = newCountryRule.trim().toUpperCase();
    if (!code || shipping.countryRules.some((rule) => rule.countryCode === code)) return;
    setShipping((current) => ({
      ...current,
      countryRules: [
        ...current.countryRules,
        { countryCode: code, shippingOff: false, percentOff: 0 },
      ],
    }));
    setNewCountryRule("");
  };

  const updateCountryRule = (
    index: number,
    patch: Partial<ShippingCountryRule>
  ) => {
    setShipping((current) => ({
      ...current,
      countryRules: current.countryRules.map((rule, i) =>
        i === index ? { ...rule, ...patch } : rule
      ),
    }));
  };

  const removeCountryRule = (index: number) => {
    setShipping((current) => ({
      ...current,
      countryRules: current.countryRules.filter((_, i) => i !== index),
    }));
  };

  const handleSaveShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      toastError("You must be logged in to save shipping settings.");
      return;
    }
    const res = await fetch("/api/v1/admin/settings/site", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ shipping: normalizeShippingSettings(shipping) }),
    });
    const data = await res.json();
    if (data.success) {
      setShipping(normalizeShippingSettings(data.data?.shipping ?? shipping));
      setSaved(true);
      toast({
        variant: "success",
        title: "Shipping saved",
        description: "Shipping rates and country rules updated.",
      });
      setTimeout(() => setSaved(false), 2000);
    } else {
      toastError(data.error ?? "Failed to save shipping settings");
    }
  };

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      toastError("You must be logged in to save tax settings.");
      return;
    }
    const rate = normalizeTaxRatePercent(taxRatePercent);
    const res = await fetch("/api/v1/admin/settings/site", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ taxRatePercent: rate }),
    });
    const data = await res.json();
    if (data.success) {
      setTaxRatePercent(
        normalizeTaxRatePercent(data.data?.taxRatePercent ?? rate)
      );
      setTaxSaved(true);
      toast({
        variant: "success",
        title: "Tax saved",
        description: `Checkout tax rate set to ${normalizeTaxRatePercent(data.data?.taxRatePercent ?? rate)}%.`,
      });
      setTimeout(() => setTaxSaved(false), 2000);
    } else {
      toastError(data.error ?? "Failed to save tax settings");
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-3xl font-bold">Site Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <p className="text-[13px] text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user?.email}</span>
          </p>

          <form onSubmit={handleChangeEmail} className="space-y-4 border-b border-border pb-8">
            <h3 className="text-sm font-semibold text-foreground">Change email</h3>
            <div className="space-y-1.5">
              <Label htmlFor="new-email">New email</Label>
              <Input
                id="new-email"
                type="email"
                required
                value={emailForm.newEmail}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, newEmail: e.target.value })
                }
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-current-password">Current password</Label>
              <PasswordInput
                id="email-current-password"
                required
                autoComplete="current-password"
                value={emailForm.currentPassword}
                onChange={(e) =>
                  setEmailForm({ ...emailForm, currentPassword: e.target.value })
                }
              />
            </div>
            <Button type="submit" disabled={changingEmail}>
              {changingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating email...
                </>
              ) : (
                "Update email"
              )}
            </Button>
          </form>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Change password</h3>
            <div className="space-y-1.5">
              <Label htmlFor="password-current">Current password</Label>
              <PasswordInput
                id="password-current"
                required
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password-new">New password</Label>
              <PasswordInput
                id="password-new"
                required
                minLength={8}
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password-confirm">Confirm new password</Label>
              <PasswordInput
                id="password-confirm"
                required
                minLength={8}
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value,
                  })
                }
              />
            </div>
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Languages</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[13px] text-muted-foreground">
            Enable languages for the storefront and homepage auto-translate. English is the source language.
          </p>
          <div className="space-y-2">
            {languages.map((lang, i) => (
              <div
                key={lang.code}
                className="flex flex-wrap items-center gap-3 rounded border border-border p-3"
              >
                <span className="min-w-[40px] font-mono text-sm font-semibold">{lang.code}</span>
                <span className="text-sm">{lang.nativeLabel}</span>
                <span className="text-[12px] text-muted-foreground">({lang.label})</span>
                <div className="ml-auto flex items-center gap-2">
                  <Label htmlFor={`lang-${lang.code}`} className="text-[12px]">Enabled</Label>
                  <Switch
                    id={`lang-${lang.code}`}
                    checked={lang.enabled !== false}
                    onCheckedChange={(checked) =>
                      setLanguages((list) =>
                        list.map((l, j) => (j === i ? { ...l, enabled: checked } : l))
                      )
                    }
                  />
                  {lang.code !== "en" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setLanguages((list) => list.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {builtInLocaleCodes
              .filter((c) => c !== "en" && !languages.some((l) => l.code === c))
              .slice(0, 8)
              .map((code) => (
                <Button key={code} type="button" variant="outline" size="sm" onClick={() => quickAdd(code)}>
                  + {localeConfig[code]?.nativeLabel ?? code}
                </Button>
              ))}
          </div>

          <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-4">
            <Input
              placeholder="Code (e.g. hi)"
              value={newLang.code}
              onChange={(e) => setNewLang({ ...newLang, code: e.target.value })}
            />
            <Input
              placeholder="English label"
              value={newLang.label}
              onChange={(e) => setNewLang({ ...newLang, label: e.target.value })}
            />
            <Input
              placeholder="Native label"
              value={newLang.nativeLabel}
              onChange={(e) => setNewLang({ ...newLang, nativeLabel: e.target.value })}
            />
            <Button type="button" variant="secondary" onClick={addLanguage}>
              <Plus className="h-4 w-4" /> Add language
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipping</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveShipping} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Standard rate (USD)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shipping.standardRateUsd}
                  onChange={(e) =>
                    setShipping({ ...shipping, standardRateUsd: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Express rate (USD)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shipping.expressRateUsd}
                  onChange={(e) =>
                    setShipping({ ...shipping, expressRateUsd: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Overnight rate (USD)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shipping.overnightRateUsd}
                  onChange={(e) =>
                    setShipping({ ...shipping, overnightRateUsd: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Free shipping threshold (USD)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shipping.freeShippingThresholdUsd}
                  onChange={(e) =>
                    setShipping({
                      ...shipping,
                      freeShippingThresholdUsd: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <div>
                <Label className="text-base">Country overrides</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Turn shipping off, apply a discount, or override rates per country. Storefront
                  prices display in the customer&apos;s selected currency.
                </p>
              </div>

              {shipping.countryRules.map((rule, index) => {
                const country = countries.find((entry) => entry.code === rule.countryCode);
                return (
                  <div
                    key={rule.countryCode}
                    className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-6"
                  >
                    <div className="md:col-span-2">
                      <Label>Country</Label>
                      <p className="mt-1 text-sm font-medium">
                        {country ? `${country.flag} ${country.name}` : rule.countryCode}
                      </p>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`shipping-off-${rule.countryCode}`}>Free shipping</Label>
                        <div className="mt-2">
                          <Switch
                            id={`shipping-off-${rule.countryCode}`}
                            checked={rule.shippingOff === true}
                            onCheckedChange={(checked) =>
                              updateCountryRule(index, { shippingOff: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>Shipping % off</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={rule.percentOff ?? 0}
                        disabled={rule.shippingOff === true}
                        onChange={(e) =>
                          updateCountryRule(index, { percentOff: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label>Std rate override</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Default"
                        value={rule.standardRateUsd ?? ""}
                        disabled={rule.shippingOff === true}
                        onChange={(e) =>
                          updateCountryRule(index, {
                            standardRateUsd:
                              e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label>Threshold override</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Default"
                          value={rule.freeShippingThresholdUsd ?? ""}
                          disabled={rule.shippingOff === true}
                          onChange={(e) =>
                            updateCountryRule(index, {
                              freeShippingThresholdUsd:
                                e.target.value === "" ? undefined : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeCountryRule(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-wrap gap-2">
                <select
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  value={newCountryRule}
                  onChange={(e) => setNewCountryRule(e.target.value)}
                >
                  <option value="">Select country</option>
                  {countries
                    .filter(
                      (country) =>
                        !shipping.countryRules.some((rule) => rule.countryCode === country.code)
                    )
                    .map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                </select>
                <Button type="button" variant="secondary" onClick={addCountryRule}>
                  <Plus className="h-4 w-4" /> Add country rule
                </Button>
              </div>
            </div>

            <Button type="submit">{saved ? "Saved!" : "Save shipping settings"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveTax} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Estimated sales tax shown on cart and checkout. Applied as a
              percent of the taxable subtotal (after discounts, before
              shipping).
            </p>
            <div className="max-w-xs">
              <Label htmlFor="tax-rate-percent">Tax rate (%)</Label>
              <Input
                id="tax-rate-percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRatePercent}
                onChange={(e) =>
                  setTaxRatePercent(Number(e.target.value))
                }
              />
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                Example: <strong>8</strong> = 8%. Use <strong>0</strong> for no
                tax.
              </p>
            </div>
            <Button type="submit">
              {taxSaved ? "Saved!" : "Save tax settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Store branding</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Store name</Label>
              <Input
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                placeholder="Shown in header, footer, browser title, and admin"
                required
              />
            </div>
            <div>
              <Label>Store tagline</Label>
              <Textarea
                value={form.storeTagline}
                onChange={(e) => setForm({ ...form, storeTagline: e.target.value })}
                placeholder="Short description in footer and registration page"
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Admin badge letters</Label>
                <Input
                  value={form.adminBrandShort}
                  onChange={(e) =>
                    setForm({ ...form, adminBrandShort: e.target.value.slice(0, 3) })
                  }
                  placeholder="e.g. YS (auto-generated if empty)"
                  maxLength={3}
                />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input
                  value={form.logo}
                  onChange={(e) => setForm({ ...form, logo: e.target.value })}
                  placeholder="https://... or /brand/logo.svg"
                />
              </div>
            </div>
            <div>
              <Label>Logo URL (dark mode)</Label>
              <Input
                value={form.logoDark}
                onChange={(e) => setForm({ ...form, logoDark: e.target.value })}
                placeholder="Optional — used in dark theme"
              />
            </div>
            <Button type="submit">{saved ? "Saved!" : "Save branding"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer highlights</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <p className="text-[13px] text-muted-foreground">
              Three short lines shown above the footer. Use {"{storeName}"} or{" "}
              {"{amount}"} where needed — amount is filled on the storefront for shipping promos.
            </p>
            {offers.map((line, index) => (
              <div key={index}>
                <Label>Highlight {index + 1}</Label>
                <Input
                  value={line}
                  onChange={(e) => {
                    const next = [...offers];
                    next[index] = e.target.value;
                    setOffers(next);
                  }}
                  placeholder={
                    index === 0
                      ? "Free shipping on qualifying orders"
                      : index === 1
                        ? "Secure checkout"
                        : "Easy returns"
                  }
                />
              </div>
            ))}
            <Button type="submit">{saved ? "Saved!" : "Save footer highlights"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Main navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <p className="text-[13px] text-muted-foreground">
              Links in the storefront header. Leave empty to use the default translated menu.
            </p>
            {navigation.map((item, index) => (
              <div key={index} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[140px] flex-1">
                  <Label>Label</Label>
                  <Input
                    value={item.label}
                    onChange={(e) => {
                      const next = [...navigation];
                      next[index] = { ...next[index], label: e.target.value };
                      setNavigation(next);
                    }}
                  />
                </div>
                <div className="min-w-[180px] flex-[2]">
                  <Label>Link</Label>
                  <Input
                    value={item.href}
                    onChange={(e) => {
                      const next = [...navigation];
                      next[index] = { ...next[index], href: e.target.value };
                      setNavigation(next);
                    }}
                    placeholder="/new-arrivals"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    setNavigation((items) => items.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setNavigation((items) => [...items, { label: "", href: "" }])
              }
            >
              <Plus className="h-4 w-4" /> Add link
            </Button>
            <Button type="submit">{saved ? "Saved!" : "Save navigation"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Header & SEO</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Announcement Bar</Label>
              <Input
                value={form.announcement}
                onChange={(e) => setForm({ ...form, announcement: e.target.value })}
                placeholder="Free shipping over {amount} — {amount} is filled from the free shipping threshold"
              />
            </div>
            <div>
              <Label>Delivery Info</Label>
              <Input value={form.deliveryInfo} onChange={(e) => setForm({ ...form, deliveryInfo: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Support Phone</Label>
                <Input value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} />
              </div>
              <div>
                <Label>Support Email</Label>
                <Input value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} />
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Also used on the contact page. Edit per-country addresses in{" "}
                  <a href="/admin/contact" className="font-medium text-primary hover:underline">
                    Contact
                  </a>
                  .
                </p>
              </div>
            </div>
            <div>
              <Label>SEO Title</Label>
              <Input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} />
            </div>
            <div>
              <Label>SEO Description</Label>
              <Textarea value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} />
            </div>
            <Button type="submit">{saved ? "Saved!" : "Save Settings"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
