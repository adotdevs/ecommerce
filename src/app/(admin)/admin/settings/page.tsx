"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Textarea } from "@/components/ds/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { Switch } from "@/components/ds/switch";
import { builtInLocaleCodes, localeConfig, type LanguageEntry } from "@/config/locales";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminSettingsPage() {
  const { accessToken } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    announcement: "",
    deliveryInfo: "",
    supportPhone: "",
    supportEmail: "",
    seoTitle: "",
    seoDescription: "",
  });
  const [languages, setLanguages] = useState<LanguageEntry[]>([]);
  const [newLang, setNewLang] = useState({ code: "", label: "", nativeLabel: "" });

  useEffect(() => {
    fetch("/api/v1/settings/site")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setForm({
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
        announcement: form.announcement,
        deliveryInfo: form.deliveryInfo,
        supportPhone: form.supportPhone,
        supportEmail: form.supportEmail,
        seo: { title: form.seoTitle, description: form.seoDescription },
        languages,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setSaved(true);
      toast({ variant: "success", title: "Settings saved", description: "Site settings and languages updated." });
      setTimeout(() => setSaved(false), 2000);
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

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-3xl font-bold">Site Settings</h1>

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
        <CardHeader><CardTitle>Header & SEO</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Announcement Bar</Label>
              <Input value={form.announcement} onChange={(e) => setForm({ ...form, announcement: e.target.value })} />
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
