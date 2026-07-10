"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Badge } from "@/components/ds/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ds/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { formatPrice } from "@/lib/utils";
import { toast, toastError } from "@/hooks/use-toast";
import type { MerchandisingAutopilotResult } from "@/lib/admin/merchandising-ai";
import { AiAssistButton } from "@/components/admin/AiAssistButton";
import {
  Loader2,
  Search,
  Star,
  Sparkles,
  Tag,
  Plus,
  X,
  ExternalLink,
} from "lucide-react";

type Section = "bestsellers" | "new-arrivals" | "deals";

interface MerchProduct {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  pricing: { price: number; compareAtPrice?: number };
  status: string;
  featured?: boolean;
  isNewArrival?: boolean;
  media?: { url: string }[];
}

interface SearchProduct {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  pricing: { price: number; compareAtPrice?: number };
  media?: { url: string }[];
  featured?: boolean;
  isNewArrival?: boolean;
}

const SECTION_META: Record<
  Section,
  { title: string; description: string; icon: typeof Star; flag?: string }
> = {
  bestsellers: {
    title: "Best Sellers",
    description:
      "Featured products shown on /bestsellers and homepage featured sections. Toggle the Best Seller flag on each product.",
    icon: Star,
    flag: "featured",
  },
  "new-arrivals": {
    title: "New Arrivals",
    description:
      "Pinned products on /new-arrivals. Products with the New Arrival flag appear here regardless of creation date.",
    icon: Sparkles,
    flag: "isNewArrival",
  },
  deals: {
    title: "Deals",
    description:
      "Products with a compare-at price higher than the sale price appear on /deals automatically.",
    icon: Tag,
  },
};

function ProductRow({
  product,
  section,
  onRemove,
  onUpdateDeal,
  removing,
}: {
  product: MerchProduct;
  section: Section;
  onRemove: (id: string) => void;
  onUpdateDeal?: (id: string, compareAt: number) => void;
  removing: string | null;
}) {
  const thumb = product.media?.[0]?.url;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="h-12 w-12 rounded-md object-cover" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary text-[11px] text-muted-foreground">
          —
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{product.name}</p>
        <p className="text-[12px] text-muted-foreground">{product.sku}</p>
        {section === "deals" && (
          <p className="text-[12px]">
            <span className="font-medium text-green-600">
              {formatPrice(product.pricing.price)}
            </span>
            {product.pricing.compareAtPrice && (
              <span className="ml-1 text-muted-foreground line-through">
                {formatPrice(product.pricing.compareAtPrice)}
              </span>
            )}
          </p>
        )}
      </div>
      <Badge variant={product.status === "published" ? "default" : "secondary"}>
        {product.status}
      </Badge>
      <Button variant="ghost" size="icon-sm" asChild title="Edit product">
        <Link href={`/admin/products/${product._id}`}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </Button>
      {section !== "deals" && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(product._id)}
          disabled={removing === product._id}
          title="Remove from section"
        >
          {removing === product._id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5 text-destructive" />
          )}
        </Button>
      )}
      {section === "deals" && onUpdateDeal && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(product._id)}
          disabled={removing === product._id}
          title="Remove deal (clear compare-at price)"
        >
          Remove deal
        </Button>
      )}
    </div>
  );
}

function SectionPanel({ section }: { section: Section }) {
  const { accessToken } = useAuthStore();
  const [products, setProducts] = useState<MerchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [dealCompareAt, setDealCompareAt] = useState("");

  const meta = SECTION_META[section];
  const Icon = meta.icon;

  const load = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    fetch(`/api/v1/admin/merchandising?section=${section}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.data?.products ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [accessToken, section]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!accessToken || search.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/v1/admin/products?q=${encodeURIComponent(search)}&limit=10`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((r) => r.json())
        .then((d) => {
          setSearchResults(d.data?.products ?? []);
          setSearching(false);
        })
        .catch(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, accessToken]);

  const updateMerch = async (
    productId: string,
    patch: Record<string, unknown>
  ) => {
    const res = await fetch("/api/v1/admin/merchandising", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ productId, ...patch }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  };

  const addProduct = async (product: SearchProduct) => {
    if (!accessToken) return;
    try {
      if (section === "bestsellers") {
        await updateMerch(product._id, { featured: true });
      } else if (section === "new-arrivals") {
        await updateMerch(product._id, { isNewArrival: true });
      } else if (section === "deals") {
        const compareAt = parseFloat(dealCompareAt);
        if (!compareAt || compareAt <= product.pricing.price) {
          toastError(
            "Invalid deal price",
            "Compare-at price must be higher than the sale price."
          );
          return;
        }
        await updateMerch(product._id, { compareAtPrice: compareAt });
      }
      toast({ variant: "success", title: `Added to ${meta.title}` });
      setSearch("");
      setSearchResults([]);
      setDealCompareAt("");
      load();
    } catch (err) {
      toastError("Failed", err instanceof Error ? err.message : "Could not add");
    }
  };

  const removeProduct = async (productId: string) => {
    if (!accessToken) return;
    setRemoving(productId);
    try {
      if (section === "bestsellers") {
        await updateMerch(productId, { featured: false });
      } else if (section === "new-arrivals") {
        await updateMerch(productId, { isNewArrival: false });
      } else if (section === "deals") {
        await updateMerch(productId, { compareAtPrice: null });
      }
      toast({ variant: "success", title: "Removed from section" });
      load();
    } catch (err) {
      toastError("Failed", err instanceof Error ? err.message : "Could not remove");
    } finally {
      setRemoving(null);
    }
  };

  const isInSection = (p: SearchProduct) => {
    if (section === "bestsellers") return p.featured;
    if (section === "new-arrivals") return p.isNewArrival;
    if (section === "deals") {
      return (
        p.pricing.compareAtPrice != null &&
        p.pricing.compareAtPrice > p.pricing.price
      );
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {meta.title}
          </CardTitle>
          <p className="text-[13px] text-muted-foreground">{meta.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-small font-medium">Add product</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name or SKU…"
                className="pl-9"
              />
            </div>
            {section === "deals" && search.trim().length >= 2 && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={dealCompareAt}
                  onChange={(e) => setDealCompareAt(e.target.value)}
                  placeholder="Compare-at price (original)"
                  className="max-w-xs"
                />
                <span className="text-[12px] text-muted-foreground">
                  Must be higher than sale price
                </span>
              </div>
            )}
            {searching && (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching…
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="space-y-1 rounded-lg border border-border p-2">
                {searchResults.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-secondary"
                  >
                    <div className="flex items-center gap-2">
                      {p.media?.[0]?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.media[0].url}
                          alt=""
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-secondary" />
                      )}
                      <div>
                        <p className="text-small font-medium">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatPrice(p.pricing.price)} · {p.sku}
                        </p>
                      </div>
                    </div>
                    {isInSection(p) ? (
                      <Badge variant="secondary">Already added</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addProduct(p)}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <p className="mb-3 text-small font-medium">
          Current products ({products.length})
        </p>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-muted-foreground">
            No products in this section yet. Search above to add products.
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <ProductRow
                key={p._id}
                product={p}
                section={section}
                onRemove={removeProduct}
                removing={removing}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MerchandisingPage() {
  const { accessToken } = useAuthStore();
  const [counts, setCounts] = useState({
    bestsellers: 0,
    newArrivals: 0,
    deals: 0,
  });
  const [autopilotPreview, setAutopilotPreview] =
    useState<MerchandisingAutopilotResult | null>(null);
  const [autopilotLoading, setAutopilotLoading] = useState(false);
  const [autopilotApplying, setAutopilotApplying] = useState(false);

  const loadCounts = () => {
    if (!accessToken) return;
    fetch("/api/v1/admin/merchandising", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.counts) setCounts(d.data.counts);
      });
  };

  useEffect(() => {
    loadCounts();
  }, [accessToken]);

  const runAutopilot = async (apply: boolean) => {
    if (!accessToken) return;
    if (apply) setAutopilotApplying(true);
    else setAutopilotLoading(true);
    try {
      const res = await fetch("/api/v1/admin/merchandising/autopilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ apply }),
      });
      const data = await res.json();
      if (data.success) {
        if (apply) {
          setAutopilotPreview(null);
          toast({
            variant: "success",
            title: "Merchandising applied",
            description: `Updated ${data.data?.updated ?? 0} product flags and deals.`,
          });
          loadCounts();
        } else {
          setAutopilotPreview(data.data as MerchandisingAutopilotResult);
          toast({
            variant: "success",
            title: "AI suggestions ready",
            description: "Review below, then apply with one click.",
          });
        }
      } else {
        toastError("Autopilot failed", data.error ?? "Could not run autopilot.");
      }
    } catch {
      toastError("Autopilot failed", "Network error.");
    } finally {
      setAutopilotLoading(false);
      setAutopilotApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-h2 text-foreground">Merchandising</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Curate which products appear in Best Sellers, New Arrivals, and Deals
          collections — or let AI autopilot pick them for you.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Merchandising Autopilot
          </CardTitle>
          <p className="text-[13px] text-muted-foreground">
            Analyzes stock, price, ratings, and tags to suggest Best Sellers, New Arrivals, and
            Deals — one click to apply.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <AiAssistButton
              label="Preview suggestions"
              loading={autopilotLoading}
              disabled={autopilotApplying}
              onClick={() => runAutopilot(false)}
            />
            {autopilotPreview && (
              <Button
                onClick={() => runAutopilot(true)}
                disabled={autopilotApplying}
              >
                {autopilotApplying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Apply all suggestions
              </Button>
            )}
          </div>
          {autopilotPreview && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="mb-2 text-small font-semibold">
                  Best Sellers ({autopilotPreview.bestsellers.length})
                </p>
                <ul className="space-y-1 text-[12px] text-muted-foreground">
                  {autopilotPreview.bestsellers.map((p) => (
                    <li key={p.productId} className="truncate">
                      {p.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="mb-2 text-small font-semibold">
                  New Arrivals ({autopilotPreview.newArrivals.length})
                </p>
                <ul className="space-y-1 text-[12px] text-muted-foreground">
                  {autopilotPreview.newArrivals.map((p) => (
                    <li key={p.productId} className="truncate">
                      {p.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="mb-2 text-small font-semibold">
                  Deals ({autopilotPreview.deals.length})
                </p>
                <ul className="space-y-1 text-[12px] text-muted-foreground">
                  {autopilotPreview.deals.map((p) => (
                    <li key={p.productId} className="truncate">
                      {p.name} — {formatPrice(p.salePrice)} →{" "}
                      {formatPrice(p.compareAtPrice)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Star className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{counts.bestsellers}</p>
              <p className="text-[12px] text-muted-foreground">Best Sellers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Sparkles className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{counts.newArrivals}</p>
              <p className="text-[12px] text-muted-foreground">New Arrivals</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Tag className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{counts.deals}</p>
              <p className="text-[12px] text-muted-foreground">Deals</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bestsellers">
        <TabsList>
          <TabsTrigger value="bestsellers">
            <Star className="mr-1.5 h-3.5 w-3.5" /> Best Sellers
          </TabsTrigger>
          <TabsTrigger value="new-arrivals">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> New Arrivals
          </TabsTrigger>
          <TabsTrigger value="deals">
            <Tag className="mr-1.5 h-3.5 w-3.5" /> Deals
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bestsellers">
          <SectionPanel section="bestsellers" />
        </TabsContent>
        <TabsContent value="new-arrivals">
          <SectionPanel section="new-arrivals" />
        </TabsContent>
        <TabsContent value="deals">
          <SectionPanel section="deals" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
