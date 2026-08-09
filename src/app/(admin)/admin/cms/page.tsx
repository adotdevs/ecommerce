"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Label } from "@/components/ds/label";
import { Input } from "@/components/ds/input";
import { Textarea } from "@/components/ds/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { Badge } from "@/components/ds/badge";
import {
  Loader2,
  Save,
  Languages,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import { defaultLocale, localeConfig, type LanguageEntry } from "@/config/locales";
import { toastSaveSuccess, toastError, toast } from "@/hooks/use-toast";
import {
  CMS_PAGE_META,
  CMS_PAGE_FIELDS,
  privacySections,
  type CmsPageSlug,
  type PrivacySection,
} from "@/lib/cms/cms-pages";
import { ImageUpload } from "@/components/admin/homepage/ImageUpload";

type Locale = string;

interface CmsPageDoc {
  _id: string;
  slug: CmsPageSlug;
  content: Record<string, unknown>;
  translations?: Record<string, Record<string, unknown>>;
  translationStatus?: string;
  lastTranslatedAt?: string;
  translationError?: string;
  status: string;
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function str(content: Record<string, unknown>, key: string): string {
  const v = content[key];
  return typeof v === "string" ? v : "";
}

export default function AdminCmsPage() {
  const { accessToken } = useAuthStore();
  const [pages, setPages] = useState<CmsPageDoc[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const [translationDrafts, setTranslationDrafts] = useState<
    Record<string, Partial<Record<Locale, Record<string, unknown>>>>
  >({});
  const [activeLocale, setActiveLocale] = useState<Record<string, Locale>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [translating, setTranslating] = useState<string | null>(null);
  const [siteLanguages, setSiteLanguages] = useState<LanguageEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLanguages = () => {
    fetch("/api/v1/settings/languages")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.languages) setSiteLanguages(d.data.languages);
      });
  };

  const load = () => {
    if (!accessToken) return;
    setLoading(true);
    fetch("/api/v1/admin/cms/pages", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const list: CmsPageDoc[] = d.data ?? [];
        setPages(list);
        const initial: Record<string, Record<string, unknown>> = {};
        const tr: typeof translationDrafts = {};
        list.forEach((p) => {
          initial[p._id] = structuredClone(p.content ?? {});
          tr[p._id] = structuredClone(p.translations ?? {});
        });
        setDrafts(initial);
        setTranslationDrafts(tr);
      })
      .finally(() => setLoading(false));
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
  const localesForRender = nonEnLocales.length
    ? nonEnLocales
    : [{ code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" as const, enabled: true }];

  const localeLabel = (code: string) =>
    siteLanguages.find((l) => l.code === code)?.nativeLabel ??
    localeConfig[code]?.nativeLabel ??
    code.toUpperCase();

  const setDraftField = (id: string, key: string, value: string) => {
    setDrafts((d) => ({
      ...d,
      [id]: { ...d[id], [key]: value },
    }));
  };

  const setDraftSections = (id: string, sections: PrivacySection[]) => {
    setDrafts((d) => ({
      ...d,
      [id]: { ...d[id], sections },
    }));
  };

  const savePage = async (id: string, retranslate = true) => {
    const page = pages.find((p) => p._id === id);
    setSaving(id);
    try {
      const res = await fetch(`/api/v1/admin/cms/pages/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ content: drafts[id], retranslate }),
      });
      const data = await res.json();
      if (data.success) {
        toastSaveSuccess({
          sectionName: CMS_PAGE_META[page?.slug ?? "about"]?.label ?? "CMS page",
          englishOnly: !retranslate,
          translationStatus: retranslate ? data.data.translationStatus : undefined,
          translationError: data.data.translationError,
          localeCount: Object.keys(data.data.translations ?? {}).length,
        });
        load();
        setExpandedId(id);
      } else {
        toastError("Save failed", data.error ?? "Could not save page.");
      }
    } catch {
      toastError("Save failed", "Network error. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const retranslate = async (id: string) => {
    const page = pages.find((p) => p._id === id);
    setTranslating(id);
    try {
      const res = await fetch(`/api/v1/admin/cms/pages/${id}/translate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.success) {
        toastSaveSuccess({
          sectionName: CMS_PAGE_META[page?.slug ?? "about"]?.label ?? "CMS page",
          translationStatus: data.data.translationStatus,
          translationError: data.data.translationError,
          localeCount: Object.keys(data.data.translations ?? {}).length,
        });
        load();
        setExpandedId(id);
      } else {
        toastError("Translation failed", data.error ?? "Could not translate.");
      }
    } catch {
      toastError("Translation failed", "Network error. Please try again.");
    } finally {
      setTranslating(null);
    }
  };

  const saveTranslation = async (id: string, locale: Locale) => {
    setSaving(id);
    try {
      const res = await fetch(`/api/v1/admin/cms/pages/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          translations: { [locale]: translationDrafts[id]?.[locale] ?? {} },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          variant: "success",
          title: "Translation saved",
          description: `${localeLabel(locale)} overlay updated.`,
        });
        load();
      } else {
        toastError("Save failed", data.error);
      }
    } catch {
      toastError("Save failed", "Network error");
    } finally {
      setSaving(null);
    }
  };

  const setTrField = (id: string, loc: Locale, key: string, value: string) => {
    setTranslationDrafts((d) => ({
      ...d,
      [id]: {
        ...d[id],
        [loc]: { ...(d[id]?.[loc] ?? {}), [key]: value },
      },
    }));
  };

  const setTrSection = (
    id: string,
    loc: Locale,
    index: number,
    field: "title" | "body",
    value: string
  ) => {
    setTranslationDrafts((d) => {
      const current = [...((d[id]?.[loc]?.sections as PrivacySection[]) ?? [])];
      while (current.length <= index) current.push({ title: "", body: "" });
      current[index] = { ...current[index], [field]: value };
      return {
        ...d,
        [id]: {
          ...d[id],
          [loc]: { ...(d[id]?.[loc] ?? {}), sections: current },
        },
      };
    });
  };

  const statusBadge = (page: CmsPageDoc) => {
    switch (page.translationStatus) {
      case "completed":
        return <Badge variant="success">Translated</Badge>;
      case "pending":
        return <Badge variant="default">Translating…</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Not translated</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-h2 text-foreground">CMS Pages</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Edit every word on About Us, Contact, and Privacy Policy. Changes can be
          auto-translated to all enabled store languages.
        </p>
      </div>

      <div className="space-y-4">
        {pages.map((page) => {
          const meta = CMS_PAGE_META[page.slug];
          const fields = CMS_PAGE_FIELDS[page.slug] ?? [];
          const isOpen = expandedId === page._id;
          const draft = drafts[page._id] ?? page.content ?? {};
          const loc = activeLocale[page._id] ?? localesForRender[0]?.code ?? "ar";
          const trDraft = translationDrafts[page._id]?.[loc] ?? {};
          const sections = privacySections(draft);
          const trSections = Array.isArray(trDraft.sections)
            ? (trDraft.sections as PrivacySection[])
            : [];

          return (
            <Card key={page._id}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                <div>
                  <CardTitle>{meta?.label ?? page.slug}</CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant={page.status === "published" ? "default" : "secondary"}>
                      {page.status}
                    </Badge>
                    {statusBadge(page)}
                    <a
                      href={meta?.path}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
                    >
                      {meta?.path} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {meta?.description && (
                    <p className="mt-1 text-[12px] text-muted-foreground">{meta.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setExpandedId(isOpen ? null : page._id)}
                >
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardHeader>

              {isOpen && (
                <CardContent className="space-y-6 border-t border-border pt-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {fields
                      .filter((f) => !f.skip)
                      .map((f) => (
                        <Field
                          key={f.key}
                          label={f.label}
                          value={str(draft, f.key)}
                          multiline={f.multiline}
                          onChange={(v) => setDraftField(page._id, f.key, v)}
                        />
                      ))}
                  </div>

                  {page.slug === "about" && accessToken && (
                    <ImageUpload
                      label="Hero image"
                      value={str(draft, "heroImage")}
                      onChange={(url) => setDraftField(page._id, "heroImage", url)}
                      accessToken={accessToken}
                      folder="cms-pages"
                      aspectHint="Wide banner, ~21:9"
                    />
                  )}

                  {page.slug === "privacy" && (
                    <div className="space-y-4 rounded-[var(--radius-md)] border border-border p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-small font-semibold text-foreground">
                          Policy sections
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setDraftSections(page._id, [
                              ...sections,
                              { title: "New section", body: "" },
                            ])
                          }
                        >
                          <Plus className="h-4 w-4" />
                          Add section
                        </Button>
                      </div>
                      {sections.map((section, i) => (
                        <div
                          key={i}
                          className="space-y-3 rounded-[var(--radius-md)] border border-border bg-secondary/20 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium text-muted-foreground">
                              Section {i + 1}
                            </span>
                            {sections.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                  setDraftSections(
                                    page._id,
                                    sections.filter((_, idx) => idx !== i)
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <Field
                            label="Section title"
                            value={section.title}
                            onChange={(v) => {
                              const next = [...sections];
                              next[i] = { ...next[i], title: v };
                              setDraftSections(page._id, next);
                            }}
                          />
                          <Field
                            label="Section body"
                            value={section.body}
                            multiline
                            onChange={(v) => {
                              const next = [...sections];
                              next[i] = { ...next[i], body: v };
                              setDraftSections(page._id, next);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => savePage(page._id, true)} disabled={saving === page._id}>
                      {saving === page._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save & Auto-translate
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => savePage(page._id, false)}
                      disabled={saving === page._id}
                    >
                      Save English only
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => retranslate(page._id)}
                      disabled={translating === page._id}
                    >
                      {translating === page._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Languages className="h-4 w-4" />
                      )}
                      Re-translate all
                    </Button>
                  </div>

                  {page.translationError && (
                    <p className="text-[12px] text-destructive">{page.translationError}</p>
                  )}

                  <div className="space-y-4 rounded-[var(--radius-md)] border border-border p-4">
                    <p className="text-small font-semibold text-foreground">Manual translations</p>
                    <div className="flex flex-wrap gap-2">
                      {localesForRender.map((lang) => {
                        const active = loc === lang.code;
                        return (
                          <Button
                            key={lang.code}
                            type="button"
                            size="sm"
                            variant={active ? "primary" : "outline"}
                            onClick={() =>
                              setActiveLocale((a) => ({ ...a, [page._id]: lang.code }))
                            }
                          >
                            {lang.nativeLabel}
                          </Button>
                        );
                      })}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {fields.map((f) => (
                        <Field
                          key={f.key}
                          label={`${f.label} (${localeLabel(loc)})`}
                          value={str(trDraft, f.key)}
                          multiline={f.multiline}
                          onChange={(v) => setTrField(page._id, loc, f.key, v)}
                        />
                      ))}
                    </div>

                    {page.slug === "privacy" &&
                      sections.map((section, i) => (
                        <div
                          key={i}
                          className="space-y-3 rounded-[var(--radius-md)] border border-dashed border-border p-4"
                        >
                          <p className="text-[12px] font-medium text-muted-foreground">
                            Section {i + 1}: {section.title}
                          </p>
                          <Field
                            label={`Title (${localeLabel(loc)})`}
                            value={trSections[i]?.title ?? ""}
                            onChange={(v) => setTrSection(page._id, loc, i, "title", v)}
                          />
                          <Field
                            label={`Body (${localeLabel(loc)})`}
                            value={trSections[i]?.body ?? ""}
                            multiline
                            onChange={(v) => setTrSection(page._id, loc, i, "body", v)}
                          />
                        </div>
                      ))}

                    <Button
                      variant="outline"
                      onClick={() => saveTranslation(page._id, loc)}
                      disabled={saving === page._id}
                    >
                      Save {localeLabel(loc)}
                    </Button>
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
