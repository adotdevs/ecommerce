"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Badge } from "@/components/ds/badge";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Textarea } from "@/components/ds/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { Switch } from "@/components/ds/switch";
import { formatPrice } from "@/lib/utils";
import { toast, toastError } from "@/hooks/use-toast";
import { Loader2, Search, Star, Sparkles, Tag, Upload, MessageSquare, Trash2 } from "lucide-react";
import { ProductReviewsManager } from "@/components/admin/products/ProductReviewsManager";

interface Product {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  pricing: { price: number; compareAtPrice?: number };
  status: string;
  inventory: { stock: number };
  featured?: boolean;
  isNewArrival?: boolean;
  categoryNames?: string[];
  media?: { url: string }[];
}

interface BulkImportResult {
  name: string;
  success: boolean;
  productId?: string;
  error?: string;
}

export default function AdminProductsPage() {
  const { accessToken } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkPublish, setBulkPublish] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkImportResult[] | null>(null);
  const [reviewsProduct, setReviewsProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = () => {
    if (!accessToken) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (search.trim()) params.set("q", search.trim());
    if (statusFilter) params.set("status", statusFilter);

    fetch(`/api/v1/admin/products?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.data?.products ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [accessToken, search, statusFilter]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const visible = new Set(products.map((p) => p._id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [products]);

  const allSelected =
    products.length > 0 && products.every((p) => selectedIds.has(p._id));
  const someSelected = products.some((p) => selectedIds.has(p._id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p._id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteProducts = async (ids: string[], label: string) => {
    if (!accessToken || ids.length === 0) return false;
    const message =
      ids.length === 1
        ? `Delete "${label}"? This cannot be undone.`
        : `Delete ${ids.length} selected products? This cannot be undone.`;
    if (!confirm(message)) return false;

    if (ids.length === 1) setDeletingId(ids[0]);
    else setBulkDeleting(true);

    try {
      const res = await fetch(
        ids.length === 1
          ? `/api/v1/admin/products/${ids[0]}`
          : "/api/v1/admin/products/bulk-delete",
        {
          method: ids.length === 1 ? "DELETE" : "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(ids.length > 1 ? { "Content-Type": "application/json" } : {}),
          },
          body: ids.length > 1 ? JSON.stringify({ ids }) : undefined,
        }
      );
      const data = await res.json();
      if (data.success) {
        const deleted =
          ids.length === 1 ? 1 : (data.data?.deleted ?? ids.length);
        toast({
          variant: "success",
          title: deleted === 1 ? "Product deleted" : `${deleted} products deleted`,
        });
        setSelectedIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        if (reviewsProduct && ids.includes(reviewsProduct._id)) {
          setReviewsProduct(null);
        }
        load();
        return true;
      }
      toastError("Delete failed", data.error ?? "Could not delete products.");
      return false;
    } catch {
      toastError("Delete failed", "Network error.");
      return false;
    } finally {
      setDeletingId(null);
      setBulkDeleting(false);
    }
  };

  const handleDeleteOne = (product: Product) => {
    void deleteProducts([product._id], product.name);
  };

  const handleBulkDelete = () => {
    void deleteProducts([...selectedIds], "");
  };

  const isOnSale = (p: Product) =>
    p.pricing.compareAtPrice != null &&
    p.pricing.compareAtPrice > p.pricing.price;

  const runBulkImport = async () => {
    if (!accessToken || !bulkInput.trim()) return;
    setBulkImporting(true);
    setBulkResults(null);
    try {
      const res = await fetch("/api/v1/admin/products/bulk-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          input: bulkInput,
          publish: bulkPublish,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBulkResults(data.data?.results ?? []);
        toast({
          variant: "success",
          title: "Bulk import complete",
          description: `${data.data?.created ?? 0} created, ${data.data?.failed ?? 0} failed`,
        });
        load();
      } else {
        toastError("Import failed", data.error ?? "Could not import products.");
      }
    } catch {
      toastError("Import failed", "Network error.");
    } finally {
      setBulkImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display-h2 text-foreground">Products</h1>
          <p className="mt-1 text-body text-muted-foreground">
            Manage your catalog. Use{" "}
            <Link href="/admin/merchandising" className="underline-offset-2 hover:underline">
              Merchandising
            </Link>{" "}
            to curate Best Sellers, New Arrivals, and Deals.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen((o) => !o)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk AI import
          </Button>
          <Button asChild>
            <Link href="/admin/products/new">Add product</Link>
          </Button>
        </div>
      </div>

      {bulkOpen && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Bulk AI product import
            </CardTitle>
            <p className="text-[13px] text-muted-foreground">
              Paste product names (one per line or comma-separated). AI generates full catalog
              entries — up to 30 at a time.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Product names</Label>
              <Textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                rows={8}
                placeholder={`Nike Air Max 90\nAdidas Ultraboost\nLevi's 501 Jeans`}
                disabled={bulkImporting}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="bulk-publish"
                checked={bulkPublish}
                onCheckedChange={setBulkPublish}
                disabled={bulkImporting}
              />
              <Label htmlFor="bulk-publish" className="cursor-pointer">
                Publish immediately (otherwise saved as drafts)
              </Label>
            </div>
            <Button onClick={runBulkImport} disabled={bulkImporting || !bulkInput.trim()}>
              {bulkImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {bulkImporting ? "Generating products…" : "Generate all with AI"}
            </Button>
            {bulkResults && (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-3 text-[12px]">
                {bulkResults.map((r) => (
                  <div
                    key={r.name}
                    className={r.success ? "text-green-700" : "text-destructive"}
                  >
                    {r.success ? "✓" : "✗"} {r.name}
                    {r.error ? ` — ${r.error}` : r.productId ? (
                      <Link
                        href={`/admin/products/${r.productId}`}
                        className="ml-1 underline"
                      >
                        Edit
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {reviewsProduct && accessToken && (
        <Card className="border-primary/25">
          <CardContent className="pt-6">
            <ProductReviewsManager
              productId={reviewsProduct._id}
              productName={reviewsProduct.name}
              accessToken={accessToken}
              onClose={() => setReviewsProduct(null)}
              compact
            />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, slug…"
            className="pl-9"
          />
        </div>
        <select
          className="flex h-10 rounded-lg border border-border bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
          >
            {bulkDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete selected ({selectedIds.size})
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all products"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="hidden px-4 py-3 text-left font-medium md:table-cell">SKU</th>
                <th className="px-4 py-3 text-left font-medium">Price</th>
                <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Stock</th>
                <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Categories</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p._id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.name}`}
                        checked={selectedIds.has(p._id)}
                        onChange={() => toggleSelect(p._id)}
                        className="h-4 w-4 rounded border-border"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.media?.[0]?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.media[0].url}
                            alt=""
                            className="h-10 w-10 rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-[11px] text-muted-foreground">
                            —
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">{p.name}</p>
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {p.featured && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
                                <Star className="h-2.5 w-2.5" /> Best
                              </span>
                            )}
                            {p.isNewArrival && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600">
                                <Sparkles className="h-2.5 w-2.5" /> New
                              </span>
                            )}
                            {isOnSale(p) && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600">
                                <Tag className="h-2.5 w-2.5" /> Deal
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {p.sku}
                    </td>
                    <td className="px-4 py-3">
                      <span>{formatPrice(p.pricing.price)}</span>
                      {isOnSale(p) && p.pricing.compareAtPrice && (
                        <span className="ml-1 text-[11px] text-muted-foreground line-through">
                          {formatPrice(p.pricing.compareAtPrice)}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {p.inventory?.stock ?? 0}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="flex max-w-[180px] flex-wrap gap-1">
                        {(p.categoryNames ?? []).slice(0, 2).map((c) => (
                          <span
                            key={c}
                            className="rounded bg-secondary px-1.5 py-0.5 text-[10px]"
                          >
                            {c}
                          </span>
                        ))}
                        {(p.categoryNames?.length ?? 0) > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{(p.categoryNames?.length ?? 0) - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={p.status === "published" ? "default" : "secondary"}
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReviewsProduct(p)}
                        >
                          <MessageSquare className="mr-1 h-3.5 w-3.5" />
                          Reviews
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/products/${p._id}`}>Edit</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === p._id || bulkDeleting}
                          onClick={() => handleDeleteOne(p)}
                          aria-label={`Delete ${p.name}`}
                        >
                          {deletingId === p._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
