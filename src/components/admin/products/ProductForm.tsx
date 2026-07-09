"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Textarea } from "@/components/ds/textarea";
import { Switch } from "@/components/ds/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ds/tabs";
import { ProductMediaGallery, type ProductMediaItem } from "./ProductMediaGallery";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toastError, toastSaveSuccess } from "@/hooks/use-toast";
import { slugify } from "@/lib/utils";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface Brand {
  _id: string;
  name: string;
  slug: string;
}

interface KeyValue {
  key: string;
  value: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

export interface ProductFormData {
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  description: string;
  shortDescription: string;
  brandId: string;
  categoryIds: string[];
  tags: string;
  media: ProductMediaItem[];
  pricing: {
    price: string;
    compareAtPrice: string;
    currency: string;
  };
  inventory: {
    stock: string;
    lowStockThreshold: string;
    trackInventory: boolean;
  };
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
    unit: string;
  };
  specifications: KeyValue[];
  faqs: FaqItem[];
  warranty: string;
  status: "draft" | "published" | "archived";
  featured: boolean;
  isNewArrival: boolean;
  seo: {
    title: string;
    description: string;
    keywords: string;
    canonical: string;
    ogImage: string;
  };
}

export const emptyProductForm = (): ProductFormData => ({
  name: "",
  slug: "",
  sku: "",
  barcode: "",
  description: "",
  shortDescription: "",
  brandId: "",
  categoryIds: [],
  tags: "",
  media: [],
  pricing: { price: "", compareAtPrice: "", currency: "USD" },
  inventory: { stock: "0", lowStockThreshold: "5", trackInventory: true },
  weight: "",
  dimensions: { length: "", width: "", height: "", unit: "cm" },
  specifications: [],
  faqs: [],
  warranty: "",
  status: "draft",
  featured: false,
  isNewArrival: false,
  seo: {
    title: "",
    description: "",
    keywords: "",
    canonical: "",
    ogImage: "",
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function productToFormData(product: Record<string, any>): ProductFormData {
  return {
    name: product.name ?? "",
    slug: product.slug ?? "",
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    description: product.description ?? "",
    shortDescription: product.shortDescription ?? "",
    brandId: product.brandId ? String(product.brandId) : "",
    categoryIds: (product.categoryIds ?? []).map((id: { toString(): string }) =>
      String(id)
    ),
    tags: (product.tags ?? []).join(", "),
    media: (product.media ?? []).map(
      (m: ProductMediaItem, i: number) => ({
        url: m.url,
        alt: m.alt ?? "",
        type: m.type ?? "image",
        sortOrder: m.sortOrder ?? i,
      })
    ),
    pricing: {
      price: String(product.pricing?.price ?? ""),
      compareAtPrice:
        product.pricing?.compareAtPrice != null
          ? String(product.pricing.compareAtPrice)
          : "",
      currency: product.pricing?.currency ?? "USD",
    },
    inventory: {
      stock: String(product.inventory?.stock ?? 0),
      lowStockThreshold: String(product.inventory?.lowStockThreshold ?? 5),
      trackInventory: product.inventory?.trackInventory ?? true,
    },
    weight: product.weight != null ? String(product.weight) : "",
    dimensions: {
      length:
        product.dimensions?.length != null
          ? String(product.dimensions.length)
          : "",
      width:
        product.dimensions?.width != null ? String(product.dimensions.width) : "",
      height:
        product.dimensions?.height != null
          ? String(product.dimensions.height)
          : "",
      unit: product.dimensions?.unit ?? "cm",
    },
    specifications: product.specifications?.length
      ? product.specifications
      : [],
    faqs: product.faqs?.length ? product.faqs : [],
    warranty: product.warranty ?? "",
    status: product.status ?? "draft",
    featured: product.featured ?? false,
    isNewArrival: product.isNewArrival ?? false,
    seo: {
      title: product.seo?.title ?? "",
      description: product.seo?.description ?? "",
      keywords: (product.seo?.keywords ?? []).join(", "),
      canonical: product.seo?.canonical ?? "",
      ogImage: product.seo?.ogImage ?? "",
    },
  };
}

function formToPayload(form: ProductFormData) {
  const compareAt = form.pricing.compareAtPrice.trim();
  return {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    sku: form.sku.trim(),
    barcode: form.barcode.trim() || undefined,
    description: form.description.trim() || undefined,
    shortDescription: form.shortDescription.trim() || undefined,
    brandId: form.brandId || null,
    categoryIds: form.categoryIds,
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    media: form.media,
    pricing: {
      price: parseFloat(form.pricing.price) || 0,
      compareAtPrice: compareAt ? parseFloat(compareAt) : null,
      currency: form.pricing.currency || "USD",
    },
    inventory: {
      stock: parseInt(form.inventory.stock) || 0,
      lowStockThreshold: parseInt(form.inventory.lowStockThreshold) || 5,
      trackInventory: form.inventory.trackInventory,
    },
    weight: form.weight.trim() ? parseFloat(form.weight) : null,
    dimensions:
      form.dimensions.length || form.dimensions.width || form.dimensions.height
        ? {
            length: parseFloat(form.dimensions.length) || undefined,
            width: parseFloat(form.dimensions.width) || undefined,
            height: parseFloat(form.dimensions.height) || undefined,
            unit: form.dimensions.unit || "cm",
          }
        : null,
    specifications: form.specifications.filter((s) => s.key && s.value),
    faqs: form.faqs.filter((f) => f.question && f.answer),
    warranty: form.warranty.trim() || undefined,
    status: form.status,
    featured: form.featured,
    isNewArrival: form.isNewArrival,
    seo: {
      title: form.seo.title.trim() || undefined,
      description: form.seo.description.trim() || undefined,
      keywords: form.seo.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      canonical: form.seo.canonical.trim() || undefined,
      ogImage: form.seo.ogImage.trim() || undefined,
    },
  };
}

interface ProductFormProps {
  productId?: string;
  initialData?: ProductFormData;
}

export function ProductForm({ productId, initialData }: ProductFormProps) {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [form, setForm] = useState<ProductFormData>(
    initialData ?? emptyProductForm()
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!productId);

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      fetch("/api/v1/admin/categories", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json()),
      fetch("/api/v1/admin/brands", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json()),
    ]).then(([catsRes, brandsRes]) => {
      setCategories(catsRes.data ?? []);
      setBrands(brandsRes.data ?? []);
    });
  }, [accessToken]);

  const update = <K extends keyof ProductFormData>(
    key: K,
    value: ProductFormData[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: autoSlug ? slugify(name) : f.slug,
    }));
  };

  const toggleCategory = (id: string) => {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((c) => c !== id)
        : [...f.categoryIds, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!form.name.trim() || !form.sku.trim()) {
      toastError("Validation", "Name and SKU are required.");
      return;
    }
    if (!form.pricing.price || parseFloat(form.pricing.price) < 0) {
      toastError("Validation", "A valid price is required.");
      return;
    }

    setSaving(true);
    try {
      const url = productId
        ? `/api/v1/admin/products/${productId}`
        : "/api/v1/admin/products";
      const res = await fetch(url, {
        method: productId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formToPayload(form)),
      });
      const data = await res.json();
      if (data.success) {
        toastSaveSuccess({
          sectionName: productId ? "Product updated" : "Product created",
          englishOnly: true,
        });
        router.push(
          productId ? `/admin/products/${productId}` : `/admin/products/${data.data._id}`
        );
      } else {
        toastError("Save failed", data.error ?? "Could not save product.");
      }
    } catch {
      toastError("Save failed", "Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isOnSale =
    form.pricing.compareAtPrice &&
    parseFloat(form.pricing.compareAtPrice) > parseFloat(form.pricing.price || "0");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="general">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="pricing">Pricing & Stock</TabsTrigger>
          <TabsTrigger value="categories">Categories & Brand</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="merchandising">Merchandising</TabsTrigger>
          <TabsTrigger value="details">Specs & FAQs</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Basic information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Product name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    placeholder="e.g. Wireless Bluetooth Headphones"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>SKU *</Label>
                  <Input
                    value={form.sku}
                    onChange={(e) => update("sku", e.target.value)}
                    required
                    placeholder="e.g. WH-1000XM5-BLK"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>URL slug</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.slug}
                      onChange={(e) => {
                        setAutoSlug(false);
                        update("slug", e.target.value);
                      }}
                      placeholder="auto-generated-from-name"
                    />
                    {!productId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAutoSlug(true);
                          update("slug", slugify(form.name));
                        }}
                      >
                        Auto
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Barcode (optional)</Label>
                  <Input
                    value={form.barcode}
                    onChange={(e) => update("barcode", e.target.value)}
                    placeholder="UPC / EAN"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Short description</Label>
                <Textarea
                  value={form.shortDescription}
                  onChange={(e) => update("shortDescription", e.target.value)}
                  rows={2}
                  placeholder="Brief summary shown on product cards"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Full description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={6}
                  placeholder="Detailed product description"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tags</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => update("tags", e.target.value)}
                  placeholder="wireless, audio, premium (comma-separated)"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  className="flex h-10 w-full max-w-xs rounded-lg border border-border bg-background px-3 text-sm"
                  value={form.status}
                  onChange={(e) =>
                    update("status", e.target.value as ProductFormData["status"])
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Pricing & inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.pricing.price}
                    onChange={(e) =>
                      update("pricing", { ...form.pricing, price: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Compare at price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.pricing.compareAtPrice}
                    onChange={(e) =>
                      update("pricing", {
                        ...form.pricing,
                        compareAtPrice: e.target.value,
                      })
                    }
                    placeholder="Original price for deals"
                  />
                  {isOnSale && (
                    <p className="text-[12px] text-green-600">
                      This product will appear in Deals
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Input
                    value={form.pricing.currency}
                    onChange={(e) =>
                      update("pricing", {
                        ...form.pricing,
                        currency: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Stock quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.inventory.stock}
                    onChange={(e) =>
                      update("inventory", {
                        ...form.inventory,
                        stock: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Low stock threshold</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.inventory.lowStockThreshold}
                    onChange={(e) =>
                      update("inventory", {
                        ...form.inventory,
                        lowStockThreshold: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex items-end gap-3 pb-1">
                  <Switch
                    checked={form.inventory.trackInventory}
                    onCheckedChange={(v) =>
                      update("inventory", {
                        ...form.inventory,
                        trackInventory: v,
                      })
                    }
                  />
                  <Label>Track inventory</Label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.weight}
                    onChange={(e) => update("weight", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Length</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.dimensions.length}
                    onChange={(e) =>
                      update("dimensions", {
                        ...form.dimensions,
                        length: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Width</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.dimensions.width}
                    onChange={(e) =>
                      update("dimensions", {
                        ...form.dimensions,
                        width: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Height</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.dimensions.height}
                    onChange={(e) =>
                      update("dimensions", {
                        ...form.dimensions,
                        height: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Warranty</Label>
                <Input
                  value={form.warranty}
                  onChange={(e) => update("warranty", e.target.value)}
                  placeholder="e.g. 2-year manufacturer warranty"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Categories & brand</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Categories</Label>
                <p className="text-[12px] text-muted-foreground">
                  Products appear in catalog filters and category pages by category name.
                </p>
                {categories.length === 0 ? (
                  <p className="text-small text-muted-foreground">
                    No categories yet.{" "}
                    <a href="/admin/categories" className="underline">
                      Create categories
                    </a>
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map((c) => (
                      <label
                        key={c._id}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-small hover:bg-secondary"
                      >
                        <input
                          type="checkbox"
                          checked={form.categoryIds.includes(c._id)}
                          onChange={() => toggleCategory(c._id)}
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Brand</Label>
                <select
                  className="flex h-10 w-full max-w-md rounded-lg border border-border bg-background px-3 text-sm"
                  value={form.brandId}
                  onChange={(e) => update("brandId", e.target.value)}
                >
                  <option value="">No brand</option>
                  {brands.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardContent className="pt-6">
              {accessToken && (
                <ProductMediaGallery
                  value={form.media}
                  onChange={(media) => update("media", media)}
                  accessToken={accessToken}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="merchandising">
          <Card>
            <CardHeader>
              <CardTitle>Storefront placement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium">Best Seller</p>
                  <p className="text-[12px] text-muted-foreground">
                    Featured products appear on the Best Sellers page and homepage.
                  </p>
                </div>
                <Switch
                  checked={form.featured}
                  onCheckedChange={(v) => update("featured", v)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium">New Arrival</p>
                  <p className="text-[12px] text-muted-foreground">
                    Pinned to the New Arrivals collection regardless of creation date.
                  </p>
                </div>
                <Switch
                  checked={form.isNewArrival}
                  onCheckedChange={(v) => update("isNewArrival", v)}
                />
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="font-medium">Deals / On Sale</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Set a compare-at price higher than the sale price in the Pricing tab.
                  {isOnSale ? (
                    <span className="ml-1 font-medium text-green-600">
                      Active — will show on Deals page.
                    </span>
                  ) : (
                    <span className="ml-1">Not active.</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Specifications</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update("specifications", [
                      ...form.specifications,
                      { key: "", value: "" },
                    ])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.specifications.length === 0 ? (
                  <p className="text-small text-muted-foreground">
                    No specifications yet.
                  </p>
                ) : (
                  form.specifications.map((spec, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={spec.key}
                        onChange={(e) => {
                          const next = [...form.specifications];
                          next[i] = { ...next[i], key: e.target.value };
                          update("specifications", next);
                        }}
                        placeholder="Key"
                      />
                      <Input
                        value={spec.value}
                        onChange={(e) => {
                          const next = [...form.specifications];
                          next[i] = { ...next[i], value: e.target.value };
                          update("specifications", next);
                        }}
                        placeholder="Value"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          update(
                            "specifications",
                            form.specifications.filter((_, j) => j !== i)
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>FAQs</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update("faqs", [...form.faqs, { question: "", answer: "" }])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.faqs.length === 0 ? (
                  <p className="text-small text-muted-foreground">No FAQs yet.</p>
                ) : (
                  form.faqs.map((faq, i) => (
                    <div key={i} className="space-y-2 rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <Input
                          value={faq.question}
                          onChange={(e) => {
                            const next = [...form.faqs];
                            next[i] = { ...next[i], question: e.target.value };
                            update("faqs", next);
                          }}
                          placeholder="Question"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            update(
                              "faqs",
                              form.faqs.filter((_, j) => j !== i)
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <Textarea
                        value={faq.answer}
                        onChange={(e) => {
                          const next = [...form.faqs];
                          next[i] = { ...next[i], answer: e.target.value };
                          update("faqs", next);
                        }}
                        rows={2}
                        placeholder="Answer"
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>Search engine optimization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>SEO title</Label>
                <Input
                  value={form.seo.title}
                  onChange={(e) =>
                    update("seo", { ...form.seo, title: e.target.value })
                  }
                  placeholder="Defaults to product name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>SEO description</Label>
                <Textarea
                  value={form.seo.description}
                  onChange={(e) =>
                    update("seo", { ...form.seo, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Keywords</Label>
                <Input
                  value={form.seo.keywords}
                  onChange={(e) =>
                    update("seo", { ...form.seo, keywords: e.target.value })
                  }
                  placeholder="comma-separated"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Canonical URL</Label>
                <Input
                  value={form.seo.canonical}
                  onChange={(e) =>
                    update("seo", { ...form.seo, canonical: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>OG image URL</Label>
                <Input
                  value={form.seo.ogImage}
                  onChange={(e) =>
                    update("seo", { ...form.seo, ogImage: e.target.value })
                  }
                  placeholder="Social share image"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {productId ? "Save changes" : "Create product"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
