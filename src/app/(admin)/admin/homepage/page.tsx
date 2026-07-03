"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Label } from "@/components/ds/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { Switch } from "@/components/ds/switch";
import { Badge } from "@/components/ds/badge";
import { renderSectionEditor } from "@/components/admin/homepage/SectionEditor";
import { Loader2, Save, Languages, ChevronDown, ChevronUp } from "lucide-react";
import { defaultLocale, localeConfig, type LanguageEntry } from "@/config/locales";
import { toastSaveSuccess, toastError, toast } from "@/hooks/use-toast";

type Locale = string;

interface Section {
  _id: string;
  type: string;
  order: number;
  enabled: boolean;
  config: Record<string, unknown>;
  translations?: Record<string, unknown>;
  translationStatus?: string;
  lastTranslatedAt?: string;
  translationError?: string;
}

function sectionLabel(type: string) {
  return type.replace(/_/g, " ");
}

function translationPreview(section: Section, locale: Locale = "ar"): string | undefined {
  const overlay = section.translations?.[locale] as Record<string, unknown> | undefined;
  if (!overlay) return undefined;
  const slides = overlay.slides as Array<{ title?: string }> | undefined;
  if (slides?.[0]?.title) return slides[0].title;
  if (typeof overlay.title === "string") return overlay.title;
  return undefined;
}

function localeCount(section: Section) {
  return Object.keys(section.translations ?? {}).length;
}

export default function AdminHomepagePage() {
  const { accessToken } = useAuthStore();
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [translating, setTranslating] = useState<string | null>(null);
  const [translationDrafts, setTranslationDrafts] = useState<
    Record<string, Partial<Record<Locale, Record<string, unknown>>>>
  >({});
  const [activeLocale, setActiveLocale] = useState<Record<string, Locale>>({});
  const [siteLanguages, setSiteLanguages] = useState<LanguageEntry[]>([]);

  const loadLanguages = () => {
    fetch("/api/v1/settings/languages")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.languages) setSiteLanguages(d.data.languages);
      });
  };

  const load = () => {
    fetch("/api/v1/admin/homepage/sections", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const list: Section[] = d.data ?? [];
        setSections(list);
        const initial: Record<string, Record<string, unknown>> = {};
        list.forEach((s) => {
          initial[s._id] = structuredClone(s.config);
        });
        setDrafts(initial);
        const tr: typeof translationDrafts = {};
        list.forEach((s) => {
          tr[s._id] = structuredClone(
            (s.translations as Partial<Record<Locale, Record<string, unknown>>>) ?? {}
          );
        });
        setTranslationDrafts(tr);
      });
  };

  useEffect(() => {
    loadLanguages();
  }, []);

  useEffect(() => {
    if (accessToken) load();
  }, [accessToken]);

  const nonEnLocales = siteLanguages.filter(
    (l) => l.enabled !== false && l.code !== defaultLocale
  );

  const localeLabel = (code: string) =>
    siteLanguages.find((l) => l.code === code)?.nativeLabel ??
    localeConfig[code]?.nativeLabel ??
    code.toUpperCase();

  const toggleEnabled = async (id: string, enabled: boolean) => {
    const section = sections.find((s) => s._id === id);
    const res = await fetch(`/api/v1/admin/homepage/sections/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ enabled }),
    });
    const data = await res.json();
    if (data.success) {
      toast({
        variant: "success",
        title: enabled ? "Section enabled" : "Section disabled",
        description: `${sectionLabel(section?.type ?? "Section")} is now ${enabled ? "live on the homepage" : "hidden"}.`,
      });
      load();
    } else {
      toastError("Could not update section", data.error);
    }
  };

  const saveSection = async (id: string, retranslate = true) => {
    const section = sections.find((s) => s._id === id);
    setSaving(id);
    try {
      const res = await fetch(`/api/v1/admin/homepage/sections/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          config: drafts[id],
          retranslate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = data.data as Section;
        toastSaveSuccess({
          sectionName: sectionLabel(section?.type ?? "Section"),
          englishOnly: !retranslate,
          translationStatus: retranslate ? updated.translationStatus : undefined,
          translationError: updated.translationError,
          localeCount: localeCount(updated),
        });
        load();
        setExpandedId(id);
      } else {
        toastError("Save failed", data.error ?? "Could not save section.");
      }
    } catch {
      toastError("Save failed", "Network error. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const retranslate = async (id: string) => {
    const section = sections.find((s) => s._id === id);
    setTranslating(id);
    try {
      const res = await fetch(`/api/v1/admin/homepage/sections/${id}/translate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.success) {
        const updated = data.data as Section;
        const preview = translationPreview(updated);
        toastSaveSuccess({
          sectionName: sectionLabel(section?.type ?? "Section"),
          translationStatus: updated.translationStatus,
          translationError: updated.translationError,
          localeCount: localeCount(updated),
          previewText: preview,
        });
        load();
        setExpandedId(id);
        if (updated.translationStatus === "completed") {
          const first = nonEnLocales[0]?.code ?? "ar";
          setActiveLocale((a) => ({ ...a, [id]: first }));
        }
      } else {
        toastError("Translation failed", data.error ?? "Could not translate section.");
      }
    } catch {
      toastError("Translation failed", "Network error. Please try again.");
    } finally {
      setTranslating(null);
    }
  };

  const saveManualTranslation = async (sectionId: string, locale: Locale) => {
    const section = sections.find((s) => s._id === sectionId);
    if (!section) return;
    setSaving(sectionId);
    try {
      const res = await fetch(`/api/v1/admin/homepage/sections/${sectionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          translations: {
            [locale]: translationDrafts[sectionId]?.[locale] ?? {},
          },
          retranslate: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toastSaveSuccess({
          sectionName: sectionLabel(section.type),
          manualLocale: localeLabel(locale),
        });
        load();
      } else {
        toastError("Save failed", data.error ?? "Could not save translation.");
      }
    } catch {
      toastError("Save failed", "Network error. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const nonEnLocalesForRender = nonEnLocales.length
    ? nonEnLocales
    : [{ code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" as const, enabled: true }];

  const statusBadge = (section: Section) => {
    switch (section.translationStatus) {
      case "completed":
        return (
          <Badge variant="success">
            Translated ({localeCount(section)} langs)
          </Badge>
        );
      case "pending":
        return <Badge variant="default">Translating…</Badge>;
      case "failed":
        return <Badge variant="destructive">Translation failed</Badge>;
      case "idle":
        return <Badge variant="secondary">English only</Badge>;
      default:
        return <Badge variant="secondary">Not translated</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-h2 text-foreground">Homepage Builder</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Edit all homepage text and images. Auto-translate uses{" "}
          <strong>MyMemory (free)</strong> — no API key or credit card needed.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => {
          const isOpen = expandedId === section._id;
          const draft = drafts[section._id] ?? section.config;

          return (
            <Card key={section._id}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">#{section.order}</Badge>
                  <div>
                    <CardTitle className="capitalize">
                      {section.type.replace(/_/g, " ")}
                    </CardTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {statusBadge(section)}
                      {section.lastTranslatedAt && section.translationStatus === "completed" && (
                        <span className="text-[11px] text-muted-foreground">
                          Last translated: {new Date(section.lastTranslatedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`enabled-${section._id}`} className="text-small">
                      Live
                    </Label>
                    <Switch
                      id={`enabled-${section._id}`}
                      checked={section.enabled}
                      onCheckedChange={(checked) => toggleEnabled(section._id, checked)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setExpandedId(isOpen ? null : section._id)}
                  >
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>

              {isOpen && (
                <CardContent className="space-y-6 border-t border-border pt-6">
                  {renderSectionEditor(section.type, {
                    config: draft,
                    onChange: (config) =>
                      setDrafts((d) => ({ ...d, [section._id]: config })),
                    accessToken: accessToken ?? "",
                  })}

                  {section.translationStatus === "failed" && section.translationError && (
                    <div className="rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/5 p-4">
                      <p className="text-small font-semibold text-destructive">
                        Translation not completed
                      </p>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        {section.translationError}
                      </p>
                    </div>
                  )}

                  {section.translationStatus === "completed" && (
                    <div className="rounded-[var(--radius-md)] border border-brand-accent/30 bg-brand-accent/5 p-4">
                      <p className="text-small font-semibold text-brand-accent">
                        All languages translated
                      </p>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Available in: {nonEnLocalesForRender.map((l) => l.nativeLabel).join(", ")}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                    <Button
                      onClick={() => saveSection(section._id, true)}
                      disabled={saving === section._id || translating === section._id}
                    >
                      {saving === section._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save &amp; Auto-translate
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => saveSection(section._id, false)}
                      disabled={saving === section._id}
                    >
                      Save English only
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => retranslate(section._id)}
                      disabled={translating === section._id || saving === section._id}
                      title="Translates all text to ar, ur, fr, de, es — may take up to a minute"
                    >
                      {translating === section._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Languages className="h-4 w-4" />
                      )}
                      Re-translate all
                    </Button>
                  </div>

                  <div className="space-y-4 border-t border-border pt-6">
                    <div>
                      <Label className="text-body font-semibold">Manual translations</Label>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Auto-translated text appears here. Switch a language tab to review — then
                        visit the storefront at <code className="text-xs">/ar/</code>,{" "}
                        <code className="text-xs">/fr/</code>, etc. to see it live.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {nonEnLocalesForRender.map((lang) => {
                        const loc = lang.code;
                        const active = (activeLocale[section._id] ?? nonEnLocalesForRender[0]?.code) === loc;
                        const hasTranslation = Boolean(section.translations?.[loc]);
                        return (
                          <Button
                            key={loc}
                            type="button"
                            size="sm"
                            variant={active ? "primary" : "outline"}
                            onClick={() =>
                              setActiveLocale((a) => ({ ...a, [section._id]: loc }))
                            }
                          >
                            {lang.nativeLabel}
                            {hasTranslation && (
                              <span className="ml-1 text-[10px] opacity-70">✓</span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                    {(() => {
                      const loc = activeLocale[section._id] ?? nonEnLocalesForRender[0]?.code ?? "ar";
                      const trConfig =
                        translationDrafts[section._id]?.[loc] ??
                        (section.translations?.[loc] as Record<string, unknown>) ??
                        {};
                      return (
                        <div className="rounded-[var(--radius-md)] border border-border bg-secondary/30 p-4">
                          <p className="mb-4 text-small font-medium text-muted-foreground">
                            Editing: {localeLabel(loc)} ({loc})
                          </p>
                          {renderSectionEditor(section.type, {
                            config: trConfig,
                            onChange: (config) =>
                              setTranslationDrafts((d) => ({
                                ...d,
                                [section._id]: {
                                  ...d[section._id],
                                  [loc]: config,
                                },
                              })),
                            accessToken: accessToken ?? "",
                          })}
                          <Button
                            className="mt-4"
                            variant="outline"
                            size="sm"
                            onClick={() => saveManualTranslation(section._id, loc)}
                            disabled={saving === section._id}
                          >
                            Save {localeLabel(loc)}
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
