"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Badge } from "@/components/ds/badge";
import { Input } from "@/components/ds/input";
import { formatPrice } from "@/lib/utils";
import { Loader2, Search, Star, Sparkles, Tag } from "lucide-react";

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

export default function AdminProductsPage() {
  const { accessToken } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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

  const isOnSale = (p: Product) =>
    p.pricing.compareAtPrice != null &&
    p.pricing.compareAtPrice > p.pricing.price;

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
        <Button asChild>
          <Link href="/admin/products/new">Add product</Link>
        </Button>
      </div>

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
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p._id} className="border-b border-border last:border-0">
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
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/products/${p._id}`}>Edit</Link>
                      </Button>
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
