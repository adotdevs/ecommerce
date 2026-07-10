"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Textarea } from "@/components/ds/textarea";
import { Switch } from "@/components/ds/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { ProductMediaGallery } from "./ProductMediaGallery";
import { ProductVariantBuilder } from "./ProductVariantBuilder";
import {
  type ProductFormData,
  type ProductFormStepId,
  PRODUCT_FORM_STEPS,
  emptyProductForm,
  formToPayload,
} from "./product-form-data";
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight, Check, Sparkles } from "lucide-react";
import { toast, toastError, toastSaveSuccess } from "@/hooks/use-toast";
import { slugify } from "@/lib/utils";
import { cn } from "@/components/ds/utils";
import { generateUniqueSku } from "@/lib/admin/product-copy-suggest";

export type { ProductFormData } from "./product-form-data";
export {
  emptyProductForm,
  productToFormData,
  formToPayload,
  PRODUCT_FORM_STEPS,
} from "./product-form-data";

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

interface ProductFormProps {
  productId?: string;
  initialData?: ProductFormData;
}

function validateStep(step: ProductFormStepId, form: ProductFormData): string | null {
  switch (step) {
    case "basic":
      if (!form.name.trim()) return "Product name is required.";
      if (!form.sku.trim()) return "SKU is required.";
      return null;
    case "pricing":
      if (!form.variants.length) {
        if (!form.pricing.price || parseFloat(form.pricing.price) < 0) {
          return "A valid price is required.";
        }
      }
      return null;
    default:
      return null;
  }
}

export function ProductForm({ productId: productIdProp, initialData }: ProductFormProps) {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [savedProductId, setSavedProductId] = useState<string | undefined>(
    productIdProp
  );
  const productId = savedProductId ?? productIdProp;
  const [form, setForm] = useState<ProductFormData>(() => {
    const base = initialData ?? emptyProductForm();
    if (!productIdProp && !base.sku.trim()) {
      return { ...base, sku: generateUniqueSku() };
    }
    return base;
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(() =>
    productIdProp ? PRODUCT_FORM_STEPS.length - 1 : 0
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!productIdProp);
  const [suggesting, setSuggesting] = useState(false);
  const [autoSku, setAutoSku] = useState(!productIdProp);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSuggestedName = useRef("");
  const formRef = useRef(form);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const currentStep = PRODUCT_FORM_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === PRODUCT_FORM_STEPS.length - 1;

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

  const fetchFullAiSuggestions = useCallback(
    async (name: string, opts?: { force?: boolean }) => {
      if (!accessToken || !name.trim()) return;
      const f = formRef.current;
      if (lastSuggestedName.current === name.trim() && !opts?.force) return;

      setSuggesting(true);
      try {
        const categoryNames = f.categoryIds
          .map((id) => categories.find((c) => c._id === id)?.name)
          .filter(Boolean) as string[];
        const brandName = brands.find((b) => b._id === f.brandId)?.name;

        const res = await fetch("/api/v1/admin/products/suggest-full", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            sku: f.sku.trim() || undefined,
            categories: categoryNames.length ? categoryNames : undefined,
            brand: brandName,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          toastError("AI suggest failed", data.error ?? "Could not generate suggestions.");
          return;
        }

        const s = data.data;
        lastSuggestedName.current = name.trim();
        setForm((current) => ({
          ...current,
          name:
            s.name && (opts?.force || current.name.trim() === name.trim())
              ? s.name
              : current.name,
          shortDescription: opts?.force || !current.shortDescription.trim()
            ? s.shortDescription
            : current.shortDescription,
          description: opts?.force || !current.description.trim()
            ? s.description
            : current.description,
          highlights:
            s.highlights?.length && (opts?.force || !current.highlights.length)
              ? s.highlights
              : current.highlights,
          tags: opts?.force || !current.tags.trim()
            ? (s.tags ?? []).join(", ")
            : current.tags,
          variantOptions: s.variantOptions ?? current.variantOptions,
          variants: (s.variants ?? []).map(
            (v: {
              id: string;
              name: string;
              sku: string;
              price: number;
              compareAtPrice?: number;
              stock: number;
              attributes: Record<string, string>;
            }) => ({
              id: v.id,
              name: v.name,
              sku: v.sku,
              price: String(v.price),
              compareAtPrice:
                v.compareAtPrice != null ? String(v.compareAtPrice) : "",
              stock: String(v.stock),
              attributes: v.attributes,
            })
          ),
          pricing: {
            price: String(s.pricing?.price ?? current.pricing.price),
            compareAtPrice:
              s.pricing?.compareAtPrice != null
                ? String(s.pricing.compareAtPrice)
                : current.pricing.compareAtPrice,
            currency: s.pricing?.currency ?? current.pricing.currency,
          },
          specifications: s.specifications?.length
            ? s.specifications
            : current.specifications,
          faqs: s.faqs?.length ? s.faqs : current.faqs,
          warranty: s.warranty ?? current.warranty,
          weight: s.weight != null ? String(s.weight) : current.weight,
          seo: {
            title: opts?.force || !current.seo.title.trim()
              ? s.seo?.title ?? ""
              : current.seo.title,
            description: opts?.force || !current.seo.description.trim()
              ? s.seo?.description ?? ""
              : current.seo.description,
            keywords: opts?.force || !current.seo.keywords.trim()
              ? (s.seo?.keywords ?? []).join(", ")
              : current.seo.keywords,
            canonical: current.seo.canonical,
            ogImage: current.seo.ogImage,
          },
        }));
      } catch {
        toastError("AI suggest failed", "Network error.");
      } finally {
        setSuggesting(false);
      }
    },
    [accessToken, categories, brands]
  );

  useEffect(() => {
    if (!form.name.trim() || form.name.trim().length < 4) return;
    if (form.variantOptions.length > 0 && form.description.trim()) return;

    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(() => {
      fetchFullAiSuggestions(form.name);
    }, 1800);

    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, [form.name, form.variantOptions.length, form.description, fetchFullAiSuggestions]);

  const saveProduct = async (opts?: { draft?: boolean; navigate?: boolean }) => {
    if (!accessToken) return false;

    const draft = opts?.draft ?? false;
    const navigate = opts?.navigate ?? false;
    if (!draft) {
      const err = validateStep("basic", form);
      if (err) {
        toastError("Validation", err);
        return false;
      }
      if (!form.variants.length) {
        const priceErr = validateStep("pricing", form);
        if (priceErr) {
          toastError("Validation", priceErr);
          return false;
        }
      }
    } else if (!form.name.trim()) {
      toastError("Validation", "Enter a product name to save as draft.");
      return false;
    }

    setSaving(true);
    try {
      const payload = formToPayload({
        ...form,
        status: draft ? "draft" : form.status,
      });

      const url = productId
        ? `/api/v1/admin/products/${productId}`
        : "/api/v1/admin/products";
      const res = await fetch(url, {
        method: productId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        const id = productId ?? String(data.data._id);
        if (!savedProductId && data.data?._id) {
          setSavedProductId(String(data.data._id));
        }

        const meta = data.data?._meta as
          | { slugAdjusted?: boolean; skuAdjusted?: boolean; slug?: string; sku?: string }
          | undefined;
        if (meta?.slugAdjusted && meta.slug) {
          setAutoSlug(false);
          setForm((f) => ({ ...f, slug: meta.slug! }));
          toast({
            variant: "info",
            title: "URL slug adjusted",
            description: `Another product already used that slug. Saved as "${meta.slug}".`,
          });
        } else if (data.data?.slug && data.data.slug !== form.slug) {
          setAutoSlug(false);
          setForm((f) => ({ ...f, slug: String(data.data.slug) }));
        }
        if (meta?.skuAdjusted && meta.sku) {
          setAutoSku(false);
          setForm((f) => ({ ...f, sku: meta.sku! }));
        }

        toastSaveSuccess({
          sectionName: draft
            ? "Draft saved"
            : productId
              ? "Product updated"
              : "Product created",
          englishOnly: true,
        });
        if (navigate && !productIdProp && id) {
          router.replace(`/admin/products/${id}`);
        }
        if (!draft && payload.status === "published" && id) {
          fetch(`/api/v1/admin/products/${id}/translate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ provider: "openai" }),
          }).catch(() => undefined);
        }
        return true;
      }
      toastError("Save failed", data.error ?? "Could not save product.");
      return false;
    } catch {
      toastError("Save failed", "Network error. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const goToStep = (index: number) => {
    if (index < 0 || index >= PRODUCT_FORM_STEPS.length) return;
    if (index > maxStepReached) return;
    setStepIndex(index);
  };

  const goNext = async () => {
    const err = validateStep(currentStep.id, form);
    if (err) {
      toastError("Validation", err);
      return;
    }
    if (!productId && currentStep.id === "basic" && form.name.trim()) {
      const ok = await saveProduct({ draft: true, navigate: false });
      if (!ok) return;
    }
    const nextIndex = Math.min(stepIndex + 1, PRODUCT_FORM_STEPS.length - 1);
    setMaxStepReached((max) => Math.max(max, nextIndex));
    setStepIndex(nextIndex);
  };

  const goBack = () => goToStep(stepIndex - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProduct();
  };

  const toggleCategory = (id: string) => {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((c) => c !== id)
        : [...f.categoryIds, id],
    }));
  };

  const isOnSale =
    form.pricing.compareAtPrice &&
    parseFloat(form.pricing.compareAtPrice) > parseFloat(form.pricing.price || "0");

  const hasVariants = form.variants.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress bar */}
      <nav aria-label="Product form progress" className="rounded-xl border border-border bg-card p-4">
        <ol className="flex flex-wrap items-center gap-2 md:gap-0">
          {PRODUCT_FORM_STEPS.map((step, i) => {
            const active = i === stepIndex;
            const reachable = i <= maxStepReached;
            const done = reachable && !active;
            return (
              <li key={step.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => reachable && goToStep(i)}
                  disabled={!reachable}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors md:px-3",
                    active && "bg-primary/10 text-primary",
                    done && "text-foreground hover:bg-secondary",
                    reachable && !active && "hover:bg-secondary/60",
                    !reachable && "cursor-not-allowed text-muted-foreground opacity-60"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      active && "bg-primary text-white",
                      done && "bg-green-600 text-white",
                      !active && !done && "border border-border bg-background"
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="hidden text-small font-medium sm:inline">{step.label}</span>
                </button>
                {i < PRODUCT_FORM_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-1 hidden h-px w-6 bg-border md:block lg:w-10",
                      done && "bg-green-600"
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-small text-muted-foreground sm:hidden">
          Step {stepIndex + 1} of {PRODUCT_FORM_STEPS.length}: {currentStep.label}
        </p>
      </nav>

      {/* Step content */}
      {currentStep.id === "basic" && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>Basic information</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!form.name.trim() || suggesting}
              onClick={() => fetchFullAiSuggestions(form.name, { force: true })}
            >
              {suggesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Auto-complete with AI
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Product name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Wireless Bluetooth Headphones"
                />
                {suggesting && (
                  <p className="text-[11px] text-muted-foreground">
                    AI is filling description, colors, sizes, prices, specs…
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>SKU *</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.sku}
                    onChange={(e) => {
                      setAutoSku(false);
                      update("sku", e.target.value);
                    }}
                    placeholder="e.g. WH-1000XM5-BLK"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAutoSku(true);
                      update("sku", generateUniqueSku());
                    }}
                  >
                    Generate
                  </Button>
                </div>
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
                rows={8}
                placeholder="Detailed product description (AI generates 4-6 paragraphs)"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Feature highlights</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update("highlights", [...form.highlights, ""])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add
                </Button>
              </div>
              {form.highlights.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">
                  Bullet points shown on the product page. AI fills these automatically.
                </p>
              ) : (
                form.highlights.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={h}
                      onChange={(e) => {
                        const next = [...form.highlights];
                        next[i] = e.target.value;
                        update("highlights", next);
                      }}
                      placeholder="e.g. 48MP camera with night mode"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        update(
                          "highlights",
                          form.highlights.filter((_, j) => j !== i)
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <Input
                value={form.tags}
                onChange={(e) => update("tags", e.target.value)}
                placeholder="wireless, audio, premium (comma-separated)"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep.id === "taxonomy" && (
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
      )}

      {currentStep.id === "media" && (
        <Card>
          <CardHeader>
            <CardTitle>Product images</CardTitle>
          </CardHeader>
          <CardContent>
            {accessToken ? (
              <ProductMediaGallery
                value={form.media}
                onChange={(media) => update("media", media)}
                accessToken={accessToken}
                productName={form.name}
              />
            ) : (
              <p className="text-small text-muted-foreground">Sign in to upload images.</p>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep.id === "variants" && (
        <ProductVariantBuilder
          baseSku={form.sku}
          basePrice={form.pricing.price}
          baseCompareAt={form.pricing.compareAtPrice}
          baseStock={form.inventory.stock}
          optionGroups={form.variantOptions}
          variants={form.variants}
          onOptionGroupsChange={(groups) => update("variantOptions", groups)}
          onVariantsChange={(variants) => update("variants", variants)}
        />
      )}

      {currentStep.id === "pricing" && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing & inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasVariants && (
              <p className="rounded-lg border border-border bg-secondary/50 px-4 py-3 text-small text-muted-foreground">
                This product has {form.variants.length} variants. Base price is used when
                generating variants; per-variant prices are set in the Options step.
                Total stock is summed from all variants.
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Base price {!hasVariants && "*"}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.pricing.price}
                  onChange={(e) =>
                    update("pricing", { ...form.pricing, price: e.target.value })
                  }
                  disabled={hasVariants}
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
                    update("pricing", { ...form.pricing, currency: e.target.value })
                  }
                />
              </div>
            </div>
            {!hasVariants && (
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
            )}
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
      )}

      {currentStep.id === "details" && (
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
                    { section: "Additional details", key: "", value: "" },
                  ])
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.specifications.length === 0 ? (
                <p className="text-small text-muted-foreground">No specifications yet.</p>
              ) : (
                form.specifications.map((spec, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center">
                    <Input
                      value={spec.section ?? ""}
                      onChange={(e) => {
                        const next = [...form.specifications];
                        next[i] = { ...next[i], section: e.target.value };
                        update("specifications", next);
                      }}
                      placeholder="Section (e.g. Camera)"
                      className="sm:max-w-[140px]"
                    />
                    <Input
                      value={spec.key}
                      onChange={(e) => {
                        const next = [...form.specifications];
                        next[i] = { ...next[i], key: e.target.value };
                        update("specifications", next);
                      }}
                      placeholder="Spec name"
                      className="sm:flex-1"
                    />
                    <Input
                      value={spec.value}
                      onChange={(e) => {
                        const next = [...form.specifications];
                        next[i] = { ...next[i], value: e.target.value };
                        update("specifications", next);
                      }}
                      placeholder="Value"
                      className="sm:flex-1"
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
                          update("faqs", form.faqs.filter((_, j) => j !== i))
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
      )}

      {currentStep.id === "publish" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publish settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium">Best Seller</p>
                  <p className="text-[12px] text-muted-foreground">
                    Featured on Best Sellers page and homepage.
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
                    Pinned to the New Arrivals collection.
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
                  Set compare-at price higher than sale price.
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
        </div>
      )}

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <div className="flex flex-wrap gap-2">
          {!isFirst && (
            <Button type="button" variant="outline" onClick={goBack} disabled={saving}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => saveProduct({ draft: true, navigate: false })}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save draft
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          {!isLast ? (
            <Button type="button" onClick={goNext} disabled={saving}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {form.status === "published"
                ? productId
                  ? "Publish changes"
                  : "Publish product"
                : productId
                  ? "Save changes"
                  : "Create product"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
