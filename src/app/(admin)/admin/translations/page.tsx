"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Badge } from "@/components/ds/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import {
  localeConfig,
  defaultLocale,
  type LanguageEntry,
} from "@/config/locales";
import { toast, toastError } from "@/hooks/use-toast";
import {
  Loader2,
  Languages,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Package,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { TranslationProvider } from "@/lib/i18n/translate";

interface TranslationEntry {
  namespace: string;
  key: string;
  path: string;
  source: string;
  translations: Record<string, string>;
}

interface LocaleCoverage {
  ui: number;
  uiTotal: number;
  homepage: number;
  catalog: number;
  products: number;
  productsTotal: number;
}

interface TranslationData {
  provider: {
    provider: string;
    activeProvider?: string;
    availableProviders?: string[];
    openAiConfigured?: boolean;
    available: boolean;
  };
  languages: LanguageEntry[];
  namespaces: string[];
  totalKeys: number;
  entries: TranslationEntry[];
  localeCoverage: Record<string, LocaleCoverage>;
  cms: {
    homepageSections: { id: string; type: string; locales: string[] }[];
    catalogPages: { id: string; slug: string; locales: string[] }[];
  };
}

interface ProductTranslationItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  fields: {
    key: string;
    label: string;
    source: string;
    translated?: string;
  }[];
  highlights: string[];
  translatedHighlights: string[];
  specCount: number;
  faqCount: number;
  translated: boolean;
  coverage: number;
}

export default function AdminTranslationsPage() {
  const { accessToken } = useAuthStore();
  const [data, setData] = useState<TranslationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [targetLocale, setTargetLocale] = useState("");
  const [provider, setProvider] = useState<TranslationProvider>("openai");
  const [search, setSearch] = useState("");
  const [namespaceFilter, setNamespaceFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"ui" | "products">("ui");
  const [productItems, setProductItems] = useState<ProductTranslationItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [translatingProducts, setTranslatingProducts] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    fetch("/api/v1/admin/translations", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData(d.data);
          const avail = (d.data.provider?.availableProviders ?? []) as TranslationProvider[];
          if (avail.includes("openai")) setProvider("openai");
          else if (avail.includes("mymemory")) setProvider("mymemory");
          setTargetLocale((prev) => {
            if (prev) return prev;
            const langs = (d.data.languages as LanguageEntry[]).filter(
              (l) => l.code !== defaultLocale && l.enabled !== false
            );
            return langs[0]?.code ?? "";
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const targetLanguages = useMemo(
    () =>
      (data?.languages ?? []).filter(
        (l) => l.code !== defaultLocale && l.enabled !== false
      ),
    [data]
  );

  const loadProducts = useCallback(() => {
    if (!accessToken) return;
    const locale = targetLocale || targetLanguages[0]?.code;
    if (!locale) return;
    setProductsLoading(true);
    const params = new URLSearchParams({
      locale,
      limit: "50",
    });
    if (productSearch.trim()) params.set("q", productSearch.trim());

    fetch(`/api/v1/admin/translations/products?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProductItems(d.data?.products ?? []);
        } else {
          toastError("Could not load products", d.error ?? "Request failed");
          setProductItems([]);
        }
      })
      .catch(() => {
        toastError("Could not load products", "Network error.");
        setProductItems([]);
      })
      .finally(() => setProductsLoading(false));
  }, [accessToken, targetLocale, targetLanguages, productSearch]);

  useEffect(() => {
    if (activeTab === "products" && accessToken) {
      const timer = setTimeout(loadProducts, productSearch ? 300 : 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab, loadProducts, accessToken, productSearch]);

  const handleTranslateAllProducts = async () => {
    if (!accessToken || !targetLocale) return;
    if (
      !confirm(
        `Translate ALL products to ${targetLabel}?\n\nIncludes names, descriptions, specs, FAQs, and highlights.`
      )
    ) {
      return;
    }
    setTranslatingProducts(true);
    try {
      const res = await fetch("/api/v1/admin/translations/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ targetLocale, provider }),
      });
      const result = await res.json();
      if (result.success) {
        toast({
          variant: "success",
          title: "Products translated",
          description: `${result.data?.translated ?? 0} products updated.`,
        });
        load();
        loadProducts();
      } else {
        toastError("Translation failed", result.error);
      }
    } catch {
      toastError("Translation failed", "Network error.");
    } finally {
      setTranslatingProducts(false);
    }
  };

  const handleTranslateOneProduct = async (productId: string) => {
    if (!accessToken || !targetLocale) return;
    try {
      const res = await fetch("/api/v1/admin/translations/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ targetLocale, provider, productId }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ variant: "success", title: "Product translated" });
        loadProducts();
        load();
      } else {
        toastError("Failed", result.error);
      }
    } catch {
      toastError("Failed", "Network error.");
    }
  };

  const coverage = targetLocale ? data?.localeCoverage?.[targetLocale] : null;

  const filteredEntries = useMemo(() => {
    if (!data?.entries) return [];
    const q = search.trim().toLowerCase();
    return data.entries.filter((e) => {
      if (namespaceFilter !== "all" && e.namespace !== namespaceFilter) {
        return false;
      }
      if (!q) return true;
      return (
        e.source.toLowerCase().includes(q) ||
        e.path.toLowerCase().includes(q) ||
        (e.translations[targetLocale] ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, namespaceFilter, targetLocale]);

  const handleTranslateAll = async () => {
    if (!accessToken || !targetLocale) return;
    if (
      !confirm(
        `Translate the ENTIRE website to ${localeConfig[targetLocale]?.label ?? targetLocale}?\n\nProvider: ${provider}\n\nIncludes: UI labels, homepage, catalog pages, and ALL product titles/descriptions. May take several minutes.`
      )
    ) {
      return;
    }

    setTranslating(true);
    try {
      const res = await fetch("/api/v1/admin/translations/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ targetLocale, provider }),
      });
      const result = await res.json();

      if (result.success) {
        const r = result.data;
        toast({
          variant: "success",
          title: "Translation complete",
          description: `UI: ${r.ui.translated} · Homepage: ${r.homepage.sections} · Catalog: ${r.catalogPages.pages} · Products: ${r.products?.products ?? 0}`,
        });
        load();
      } else {
        toastError("Translation failed", result.error);
      }
    } catch {
      toastError("Translation failed", "Network error. Please try again.");
    } finally {
      setTranslating(false);
    }
  };

  const targetLabel =
    localeConfig[targetLocale]?.nativeLabel ??
    targetLanguages.find((l) => l.code === targetLocale)?.nativeLabel ??
    targetLocale;

  if (loading && !data) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-display-h2 text-foreground">Translations</h1>
          <p className="mt-1 text-body text-muted-foreground">
            View all storefront text and translate the entire website to any
            enabled language with one click.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="flex h-10 min-w-[140px] rounded-lg border border-border bg-background px-3 text-sm"
            value={provider}
            onChange={(e) => setProvider(e.target.value as TranslationProvider)}
            disabled={translating}
            title="Translation provider"
          >
            {(data?.provider.availableProviders ?? ["mymemory"]).map((p) => (
              <option key={p} value={p}>
                {p === "openai"
                  ? "OpenAI (recommended)"
                  : p === "mymemory"
                    ? "MyMemory (free)"
                    : p === "google"
                      ? "Google Translate"
                      : "Manual"}
              </option>
            ))}
          </select>
          <select
            className="flex h-10 min-w-[160px] rounded-lg border border-border bg-background px-3 text-sm"
            value={targetLocale}
            onChange={(e) => setTargetLocale(e.target.value)}
            disabled={translating}
          >
            {targetLanguages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeLabel ?? localeConfig[l.code]?.nativeLabel ?? l.code}
              </option>
            ))}
          </select>
          <Button onClick={handleTranslateAll} disabled={translating || !targetLocale}>
            {translating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Translate all to {targetLabel}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Languages className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{data?.totalKeys ?? 0}</p>
              <p className="text-[12px] text-muted-foreground">UI text strings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">
                {coverage ? `${coverage.ui}/${coverage.uiTotal}` : "—"}
              </p>
              <p className="text-[12px] text-muted-foreground">
                UI translated ({targetLabel})
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">
                {coverage
                  ? `${coverage.homepage}/${data?.cms.homepageSections.length ?? 0}`
                  : "—"}
              </p>
              <p className="text-[12px] text-muted-foreground">Homepage sections</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-8 w-8 text-indigo-600" />
            <div>
              <p className="text-2xl font-bold">
                {coverage
                  ? `${coverage.catalog}/${data?.cms.catalogPages.length ?? 0}`
                  : "—"}
              </p>
              <p className="text-[12px] text-muted-foreground">Catalog pages</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Package className="h-8 w-8 text-violet-600" />
            <div>
              <p className="text-2xl font-bold">
                {coverage
                  ? `${coverage.products}/${coverage.productsTotal}`
                  : "—"}
              </p>
              <p className="text-[12px] text-muted-foreground">
                Products ({targetLabel})
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-sm font-medium">
                {data?.provider.provider ?? "—"}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {data?.provider.openAiConfigured
                  ? "OpenAI ready"
                  : data?.provider.available
                    ? "Auto-translate on"
                    : "Manual only"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b border-border">
        <Button
          type="button"
          variant={activeTab === "ui" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("ui")}
        >
          <Languages className="mr-1.5 h-3.5 w-3.5" />
          UI text
        </Button>
        <Button
          type="button"
          variant={activeTab === "products" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("products")}
        >
          <Package className="mr-1.5 h-3.5 w-3.5" />
          Products
        </Button>
      </div>

      {activeTab === "products" ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Product translations</CardTitle>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Each product&apos;s name, descriptions, specs, FAQs, and highlights for{" "}
                {targetLabel}.
              </p>
            </div>
            <Button
              onClick={handleTranslateAllProducts}
              disabled={translatingProducts || !targetLocale}
            >
              {translatingProducts ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Translate all products
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products…"
                className="pl-9"
              />
            </div>

            {productsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : productItems.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">No products found.</p>
            ) : (
              <div className="space-y-2">
                {productItems.map((p) => {
                  const open = expandedProduct === p.id;
                  return (
                    <div
                      key={p.id}
                      className="overflow-hidden rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          onClick={() => setExpandedProduct(open ? null : p.id)}
                        >
                          {open ? (
                            <ChevronUp className="h-4 w-4 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {p.specCount} specs · {p.faqCount} FAQs · {p.highlights.length}{" "}
                              highlights
                            </p>
                          </div>
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={p.translated ? "default" : "secondary"}>
                            {p.coverage}% · {p.translated ? "Done" : "Missing"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTranslateOneProduct(p.id)}
                          >
                            <Sparkles className="mr-1 h-3 w-3" />
                            Translate
                          </Button>
                        </div>
                      </div>
                      {open && (
                        <div className="space-y-3 border-t border-border bg-secondary/20 px-4 py-4">
                          {p.fields
                            .filter((f) => f.source?.trim())
                            .map((f) => (
                              <div key={f.key} className="grid gap-2 sm:grid-cols-2">
                                <div>
                                  <p className="text-[11px] font-medium text-muted-foreground">
                                    {f.label} (English)
                                  </p>
                                  <p className="mt-0.5 text-small line-clamp-4">{f.source}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-medium text-muted-foreground">
                                    {f.label} ({targetLabel})
                                  </p>
                                  <p className="mt-0.5 text-small line-clamp-4">
                                    {f.translated?.trim() ? (
                                      f.translated
                                    ) : (
                                      <span className="italic text-muted-foreground">
                                        Not translated
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            ))}
                          {p.highlights.length > 0 && (
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground">
                                Highlights ({p.highlights.length})
                              </p>
                              <ul className="mt-1 list-inside list-disc text-small">
                                {p.highlights.map((h) => (
                                  <li key={h}>{h}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>Website text</CardTitle>
          <p className="text-[13px] text-muted-foreground">
            English source ({defaultLocale}) with translations for the selected
            language. Includes nav, cart, checkout, auth, footer, and all UI
            labels.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search text…"
                className="pl-9"
              />
            </div>
            <select
              className="flex h-10 rounded-lg border border-border bg-background px-3 text-sm"
              value={namespaceFilter}
              onChange={(e) => setNamespaceFilter(e.target.value)}
            >
              <option value="all">All sections</option>
              {(data?.namespaces ?? []).map((ns) => (
                <option key={ns} value={ns}>
                  {ns}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Section</th>
                  <th className="hidden px-4 py-3 text-left font-medium md:table-cell">
                    Key
                  </th>
                  <th className="px-4 py-3 text-left font-medium">English</th>
                  <th className="px-4 py-3 text-left font-medium">
                    {targetLabel}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      No matching text found.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => {
                    const translated = entry.translations[targetLocale];
                    const hasTranslation = Boolean(translated?.trim());
                    return (
                      <tr
                        key={entry.path}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px]">
                            {entry.namespace}
                          </Badge>
                        </td>
                        <td className="hidden px-4 py-3 font-mono text-[11px] text-muted-foreground md:table-cell">
                          {entry.key}
                        </td>
                        <td className="max-w-[220px] px-4 py-3 text-foreground">
                          {entry.source}
                        </td>
                        <td className="max-w-[220px] px-4 py-3">
                          {hasTranslation ? (
                            <span className="text-foreground">{translated}</span>
                          ) : (
                            <span className="text-muted-foreground italic">
                              Not translated
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {hasTranslation ? (
                            <Badge variant="default" className="text-[10px]">
                              Done
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Missing
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[12px] text-muted-foreground">
            Showing {filteredEntries.length} of {data?.totalKeys ?? 0} UI strings.
            Product names & descriptions are translated via &quot;Translate all&quot;
            (stored per product). Published products auto-translate when you publish.
          </p>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
