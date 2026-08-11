"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Textarea } from "@/components/ds/textarea";
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
  ShieldCheck,
  MessageSquare,
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

interface PaymentVerificationEntry {
  key: string;
  label: string;
  source: string;
  path: string;
  translations: Record<string, string>;
}

interface PaymentVerificationData {
  totalKeys: number;
  entries: PaymentVerificationEntry[];
  localeCoverage: Record<
    string,
    { translated: number; total: number; percent: number }
  >;
}

interface ReviewTranslationItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  userName: string;
  rating: number;
  sourceTitle: string;
  sourceBody: string;
  translatedTitle?: string;
  translatedBody?: string;
  translated: boolean;
  coverage: number;
  createdAt?: string;
}

interface ReviewTranslationData {
  totalReviews: number;
  localeCoverage: Record<
    string,
    { translated: number; total: number; percent: number }
  >;
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
  const [activeTab, setActiveTab] = useState<
    "ui" | "products" | "paymentVerification" | "reviews"
  >("ui");
  const [productItems, setProductItems] = useState<ProductTranslationItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [translatingProducts, setTranslatingProducts] = useState(false);
  const [pvData, setPvData] = useState<PaymentVerificationData | null>(null);
  const [pvLoading, setPvLoading] = useState(false);
  const [pvDrafts, setPvDrafts] = useState<Record<string, string>>({});
  const [pvSaving, setPvSaving] = useState(false);
  const [pvTranslating, setPvTranslating] = useState(false);
  const [pvSearch, setPvSearch] = useState("");
  const [reviewItems, setReviewItems] = useState<ReviewTranslationItem[]>([]);
  const [reviewMeta, setReviewMeta] = useState<ReviewTranslationData | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewUntranslatedOnly, setReviewUntranslatedOnly] = useState(false);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<
    Record<string, { title: string; body: string }>
  >({});
  const [reviewSavingId, setReviewSavingId] = useState<string | null>(null);
  const [translatingReviews, setTranslatingReviews] = useState(false);

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

  const loadPaymentVerification = useCallback(() => {
    if (!accessToken) return;
    setPvLoading(true);
    fetch("/api/v1/admin/translations/payment-verification", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPvData(d.data);
        } else {
          toastError("Could not load 3DS translations", d.error ?? "Request failed");
        }
      })
      .catch(() => toastError("Could not load 3DS translations", "Network error."))
      .finally(() => setPvLoading(false));
  }, [accessToken]);

  useEffect(() => {
    if (activeTab === "paymentVerification" && accessToken) {
      loadPaymentVerification();
    }
  }, [activeTab, accessToken, loadPaymentVerification]);

  useEffect(() => {
    if (!pvData || !targetLocale) {
      setPvDrafts({});
      return;
    }
    const drafts: Record<string, string> = {};
    for (const entry of pvData.entries) {
      drafts[entry.key] = entry.translations[targetLocale] ?? "";
    }
    setPvDrafts(drafts);
  }, [pvData, targetLocale]);

  const filteredPvEntries = useMemo(() => {
    if (!pvData?.entries) return [];
    const q = pvSearch.trim().toLowerCase();
    if (!q) return pvData.entries;
    return pvData.entries.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q) ||
        (pvDrafts[e.key] ?? "").toLowerCase().includes(q)
    );
  }, [pvData, pvSearch, pvDrafts]);

  const pvCoverage = targetLocale
    ? pvData?.localeCoverage?.[targetLocale]
    : null;

  const handleSavePaymentVerification = async () => {
    if (!accessToken || !targetLocale) return;
    setPvSaving(true);
    try {
      const res = await fetch("/api/v1/admin/translations/payment-verification", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ locale: targetLocale, values: pvDrafts }),
      });
      const result = await res.json();
      if (result.success) {
        toast({
          variant: "success",
          title: "3DS page saved",
          description: `Updated ${result.data?.saved ?? 0} strings for ${targetLabel}.`,
        });
        loadPaymentVerification();
        load();
      } else {
        toastError("Save failed", result.error);
      }
    } catch {
      toastError("Save failed", "Network error.");
    } finally {
      setPvSaving(false);
    }
  };

  const handleTranslatePaymentVerification = async (allLocales = false) => {
    if (!accessToken) return;
    if (!allLocales && !targetLocale) return;

    const message = allLocales
      ? "Auto-translate the 3DS OTP page to ALL enabled languages?"
      : `Auto-translate the 3DS OTP page to ${targetLabel}?`;

    if (!confirm(message)) return;

    setPvTranslating(true);
    try {
      const res = await fetch("/api/v1/admin/translations/payment-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          targetLocale: allLocales ? undefined : targetLocale,
          allLocales,
          provider,
        }),
      });
      const result = await res.json();
      if (result.success) {
        const count = (result.data?.results as { translated: number }[])?.length ?? 1;
        toast({
          variant: "success",
          title: "3DS page translated",
          description: allLocales
            ? `Updated ${count} languages.`
            : `${result.data?.results?.[0]?.translated ?? 0} strings translated.`,
        });
        loadPaymentVerification();
        load();
      } else {
        toastError("Translation failed", result.error);
      }
    } catch {
      toastError("Translation failed", "Network error.");
    } finally {
      setPvTranslating(false);
    }
  };

  const loadReviews = useCallback(() => {
    if (!accessToken) return;
    const locale = targetLocale || targetLanguages[0]?.code;
    if (!locale) return;
    setReviewsLoading(true);
    const params = new URLSearchParams({
      locale,
      limit: "50",
    });
    if (reviewSearch.trim()) params.set("q", reviewSearch.trim());
    if (reviewUntranslatedOnly) params.set("untranslatedOnly", "true");

    fetch(`/api/v1/admin/translations/reviews?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setReviewItems(d.data?.reviews ?? []);
          setReviewMeta({
            totalReviews: d.data?.totalReviews ?? 0,
            localeCoverage: d.data?.localeCoverage ?? {},
          });
        } else {
          toastError("Could not load reviews", d.error ?? "Request failed");
          setReviewItems([]);
        }
      })
      .catch(() => {
        toastError("Could not load reviews", "Network error.");
        setReviewItems([]);
      })
      .finally(() => setReviewsLoading(false));
  }, [
    accessToken,
    targetLocale,
    targetLanguages,
    reviewSearch,
    reviewUntranslatedOnly,
  ]);

  useEffect(() => {
    if (activeTab === "reviews" && accessToken) {
      const timer = setTimeout(loadReviews, reviewSearch ? 300 : 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab, loadReviews, accessToken, reviewSearch, reviewUntranslatedOnly]);

  useEffect(() => {
    if (!expandedReview) return;
    const item = reviewItems.find((r) => r.id === expandedReview);
    if (!item) return;
    setReviewDrafts((prev) => ({
      ...prev,
      [item.id]: {
        title: prev[item.id]?.title ?? item.translatedTitle ?? "",
        body: prev[item.id]?.body ?? item.translatedBody ?? "",
      },
    }));
  }, [expandedReview, reviewItems]);

  const reviewCoverage = targetLocale
    ? reviewMeta?.localeCoverage?.[targetLocale]
    : null;

  const handleSaveReview = async (reviewId: string) => {
    if (!accessToken || !targetLocale) return;
    const draft = reviewDrafts[reviewId];
    if (!draft) return;

    setReviewSavingId(reviewId);
    try {
      const res = await fetch("/api/v1/admin/translations/reviews", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          locale: targetLocale,
          reviewId,
          title: draft.title,
          body: draft.body,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ variant: "success", title: "Review saved" });
        loadReviews();
      } else {
        toastError("Save failed", result.error);
      }
    } catch {
      toastError("Save failed", "Network error.");
    } finally {
      setReviewSavingId(null);
    }
  };

  const handleTranslateReviews = async (allLocales = false, reviewId?: string) => {
    if (!accessToken) return;
    if (!allLocales && !targetLocale) return;

    const message = reviewId
      ? `Auto-translate this review to ${targetLabel}?`
      : allLocales
        ? "Auto-translate ALL product reviews to every enabled language?"
        : `Auto-translate ALL product reviews to ${targetLabel}?`;

    if (!confirm(message)) return;

    setTranslatingReviews(true);
    try {
      const res = await fetch("/api/v1/admin/translations/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          targetLocale: allLocales ? undefined : targetLocale,
          allLocales,
          reviewId,
          provider,
        }),
      });
      const result = await res.json();
      if (result.success) {
        const count = (result.data?.results as { translated: number }[])?.length ?? 1;
        toast({
          variant: "success",
          title: "Reviews translated",
          description: reviewId
            ? `Review updated for ${targetLabel}.`
            : allLocales
              ? `${count} languages updated · ${result.data?.reviewCount ?? 0} reviews each.`
              : `${result.data?.results?.[0]?.translated ?? 0} reviews translated.`,
        });
        loadReviews();
      } else {
        toastError("Translation failed", result.error);
      }
    } catch {
      toastError("Translation failed", "Network error.");
    } finally {
      setTranslatingReviews(false);
    }
  };

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
          description: `UI: ${r.ui.translated} · Homepage: ${r.homepage.sections} · Catalog: ${r.catalogPages.pages} · Products: ${r.products?.products ?? 0} · Reviews: ${r.reviews?.reviews ?? 0}`,
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
        <Button
          type="button"
          variant={activeTab === "paymentVerification" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("paymentVerification")}
        >
          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
          3DS OTP page
        </Button>
        <Button
          type="button"
          variant={activeTab === "reviews" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("reviews")}
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          Reviews
        </Button>
      </div>

      {activeTab === "reviews" ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Product review translations</CardTitle>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Translate customer review titles and bodies shown on product pages.
                English source text is stored on each review — shoppers see the translation
                for their selected language.
              </p>
              {reviewCoverage ? (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  {targetLabel}: {reviewCoverage.translated}/{reviewCoverage.total} reviews
                  fully translated ({reviewCoverage.percent}%)
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => handleTranslateReviews(false)}
                disabled={translatingReviews || !targetLocale}
              >
                {translatingReviews ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Translate all ({targetLabel})
              </Button>
              <Button
                variant="outline"
                onClick={() => handleTranslateReviews(true)}
                disabled={translatingReviews}
              >
                {translatingReviews ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Translate all languages
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-[200px] flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  placeholder="Search reviews or products…"
                  className="pl-9"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={reviewUntranslatedOnly}
                  onChange={(e) => setReviewUntranslatedOnly(e.target.checked)}
                />
                Untranslated only
              </label>
            </div>

            {reviewsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : reviewItems.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">No reviews found.</p>
            ) : (
              <div className="space-y-2">
                {reviewItems.map((review) => {
                  const open = expandedReview === review.id;
                  const draft = reviewDrafts[review.id];
                  return (
                    <div
                      key={review.id}
                      className="overflow-hidden rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          onClick={() => setExpandedReview(open ? null : review.id)}
                        >
                          {open ? (
                            <ChevronUp className="h-4 w-4 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium">{review.sourceTitle}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {review.productName} · {review.rating}★ · {review.userName}
                            </p>
                          </div>
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={review.translated ? "default" : "secondary"}>
                            {review.coverage}% · {review.translated ? "Done" : "Missing"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTranslateReviews(false, review.id)}
                            disabled={translatingReviews || !targetLocale}
                          >
                            <Sparkles className="mr-1 h-3 w-3" />
                            Translate
                          </Button>
                        </div>
                      </div>
                      {open && (
                        <div className="space-y-4 border-t border-border bg-secondary/20 px-4 py-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground">
                                Title (English)
                              </p>
                              <p className="mt-1 text-small">{review.sourceTitle}</p>
                            </div>
                            <div>
                              <label
                                htmlFor={`review-title-${review.id}`}
                                className="text-[11px] font-medium text-muted-foreground"
                              >
                                Title ({targetLabel})
                              </label>
                              <Input
                                id={`review-title-${review.id}`}
                                value={draft?.title ?? ""}
                                onChange={(e) =>
                                  setReviewDrafts((prev) => ({
                                    ...prev,
                                    [review.id]: {
                                      title: e.target.value,
                                      body: prev[review.id]?.body ?? "",
                                    },
                                  }))
                                }
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground">
                                Review (English)
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-small">
                                {review.sourceBody}
                              </p>
                            </div>
                            <div>
                              <label
                                htmlFor={`review-body-${review.id}`}
                                className="text-[11px] font-medium text-muted-foreground"
                              >
                                Review ({targetLabel})
                              </label>
                              <Textarea
                                id={`review-body-${review.id}`}
                                value={draft?.body ?? ""}
                                onChange={(e) =>
                                  setReviewDrafts((prev) => ({
                                    ...prev,
                                    [review.id]: {
                                      title: prev[review.id]?.title ?? "",
                                      body: e.target.value,
                                    },
                                  }))
                                }
                                rows={4}
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleSaveReview(review.id)}
                              disabled={reviewSavingId === review.id || !targetLocale}
                            >
                              {reviewSavingId === review.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Save {targetLabel}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[12px] text-muted-foreground">
              Review UI labels (Write a Review, Submit, etc.) are under the UI text tab
              (namespace: reviews). Add new languages in Settings, then translate here.
            </p>
          </CardContent>
        </Card>
      ) : activeTab === "paymentVerification" ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>3DS OTP confirmation page</CardTitle>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Translate the card verification popup shown at checkout. English is the
                source — shoppers see these strings in their selected storefront language.
              </p>
              {pvCoverage ? (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  {targetLabel}: {pvCoverage.translated}/{pvCoverage.total} strings (
                  {pvCoverage.percent}%)
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => handleTranslatePaymentVerification(false)}
                disabled={pvTranslating || pvSaving || !targetLocale}
              >
                {pvTranslating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Auto-translate {targetLabel}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleTranslatePaymentVerification(true)}
                disabled={pvTranslating || pvSaving}
              >
                {pvTranslating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Translate all languages
              </Button>
              <Button
                onClick={handleSavePaymentVerification}
                disabled={pvSaving || pvTranslating || !targetLocale}
              >
                {pvSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save {targetLabel}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={pvSearch}
                onChange={(e) => setPvSearch(e.target.value)}
                placeholder="Search 3DS text…"
                className="pl-9"
              />
            </div>

            {pvLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPvEntries.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">
                No matching strings found.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredPvEntries.map((entry) => (
                  <div
                    key={entry.key}
                    className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2"
                  >
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {entry.label} (English)
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-small">{entry.source}</p>
                    </div>
                    <div>
                      <label
                        htmlFor={`pv-${entry.key}`}
                        className="text-[11px] font-medium text-muted-foreground"
                      >
                        {entry.label} ({targetLabel})
                      </label>
                      <Textarea
                        id={`pv-${entry.key}`}
                        value={pvDrafts[entry.key] ?? ""}
                        onChange={(e) =>
                          setPvDrafts((prev) => ({
                            ...prev,
                            [entry.key]: e.target.value,
                          }))
                        }
                        rows={Math.min(4, Math.max(2, Math.ceil(entry.source.length / 48)))}
                        className="mt-1"
                        placeholder="Not translated yet"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[12px] text-muted-foreground">
              Keep placeholders like {"{phoneHint}"} unchanged. Add new languages under
              Settings → Languages, then translate here.
            </p>
          </CardContent>
        </Card>
      ) : activeTab === "products" ? (
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
