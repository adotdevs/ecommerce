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
  productToFormData,
  syncFormPricingFromVariants,
} from "./product-form-data";
import { ImageUpload } from "@/components/admin/homepage/ImageUpload";
import { AiAssistButton, postAiSuggest } from "@/components/admin/AiAssistButton";
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight, ChevronDown, Check, Sparkles } from "lucide-react";
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
  parentId?: string;
  description?: string;
  image?: string;
}

const emptyInlineCategory = {
  name: "",
  slug: "",
  parentId: "",
  description: "",
  image: "",
  sortOrder: 0,
  seoTitle: "",
  seoDescription: "",
};

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
    case "taxonomy":
      if (!form.categoryIds.length) {
        return "Select at least one category (or create one below).";
      }
      return null;
    case "variants":
      if (!form.variants.length) {
        if (!form.pricing.price || parseFloat(form.pricing.price) < 0) {
          return "A valid price is required when the product has no variants.";
        }
      } else {
        if (!form.variants.some((v) => v.isMain)) {
          return "Select one Main variant (required when options exist).";
        }
        const main = form.variants.find((v) => v.isMain)!;
        if (!main.price || parseFloat(main.price) < 0) {
          return "Set a valid price on the Main variant.";
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
  const [newCategory, setNewCategory] = useState(emptyInlineCategory);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryAiLoading, setCategoryAiLoading] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
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
      setCategories(
        (catsRes.data ?? []).map(
          (c: {
            _id: string;
            name: string;
            slug: string;
            parentId?: string;
            description?: string;
            image?: string;
          }) => ({
            _id: String(c._id),
            name: c.name,
            slug: c.slug,
            parentId: c.parentId ? String(c.parentId) : undefined,
            description: c.description,
            image: c.image,
          })
        )
      );
      setBrands(brandsRes.data ?? []);
    });
  }, [accessToken]);

  const update = <K extends keyof ProductFormData>(
    key: K,
    value: ProductFormData[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleVariantsChange = (
    variants: ProductFormData["variants"]
  ) => {
    setForm((f) => ({
      ...f,
      variants,
      pricing: syncFormPricingFromVariants(f.pricing, variants),
    }));
  };

  const handleListingPriceChange = (price: string) => {
    setForm((f) => {
      if (!f.variants.length) {
        return { ...f, pricing: { ...f.pricing, price } };
      }
      // Only update the Main variant — other variants keep their own prices
      let variants = f.variants.map((v) =>
        v.isMain ? { ...v, price } : v
      );
      if (!variants.some((v) => v.isMain)) {
        variants = variants.map((v, i) =>
          i === 0 ? { ...v, price, isMain: true } : { ...v, isMain: false }
        );
      }
      return {
        ...f,
        variants,
        pricing: syncFormPricingFromVariants(f.pricing, variants),
      };
    });
  };

  const handleListingCompareAtChange = (compareAtPrice: string) => {
    setForm((f) => {
      if (!f.variants.length) {
        return { ...f, pricing: { ...f.pricing, compareAtPrice } };
      }
      // Only update the Main variant compare-at
      let variants = f.variants.map((v) =>
        v.isMain ? { ...v, compareAtPrice } : v
      );
      if (!variants.some((v) => v.isMain)) {
        variants = variants.map((v, i) =>
          i === 0
            ? { ...v, compareAtPrice, isMain: true }
            : { ...v, isMain: false }
        );
      }
      return {
        ...f,
        variants,
        pricing: syncFormPricingFromVariants(
          { ...f.pricing, compareAtPrice },
          variants
        ),
      };
    });
  };

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
          variants: (() => {
            const mapped = (s.variants ?? []).map(
              (
                v: {
                  id: string;
                  name: string;
                  sku: string;
                  price: number;
                  compareAtPrice?: number;
                  stock: number;
                  attributes: Record<string, string>;
                  isMain?: boolean;
                },
                index: number,
                arr: { isMain?: boolean }[]
              ) => ({
                id: v.id,
                name: v.name,
                sku: v.sku,
                price: String(v.price),
                compareAtPrice:
                  v.compareAtPrice != null ? String(v.compareAtPrice) : "",
                stock: String(v.stock),
                attributes: v.attributes,
                media: [] as ProductFormData["variants"][number]["media"],
                isMain: arr.some((x) => x.isMain)
                  ? Boolean(v.isMain)
                  : index === 0,
              })
            );
            return mapped;
          })(),
          pricing: (() => {
            const mapped = (s.variants ?? []) as {
              price: number;
              compareAtPrice?: number;
              isMain?: boolean;
            }[];
            if (mapped.length) {
              const main =
                mapped.find((v) => v.isMain) ??
                mapped.reduce((a, b) => (a.price <= b.price ? a : b));
              return {
                price: String(main.price),
                compareAtPrice:
                  main.compareAtPrice != null
                    ? String(main.compareAtPrice)
                    : "",
                currency: s.pricing?.currency ?? current.pricing.currency,
              };
            }
            return {
              price: String(s.pricing?.price ?? current.pricing.price),
              compareAtPrice:
                s.pricing?.compareAtPrice != null
                  ? String(s.pricing.compareAtPrice)
                  : current.pricing.compareAtPrice,
              currency: s.pricing?.currency ?? current.pricing.currency,
            };
          })(),
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
      const catErr = validateStep("taxonomy", form);
      if (catErr) {
        toastError("Validation", catErr);
        return false;
      }
      if (!form.variants.length) {
        const priceErr = validateStep("variants", form);
        if (priceErr) {
          toastError("Validation", priceErr);
          return false;
        }
      } else {
        const variantErr = validateStep("variants", form);
        if (variantErr) {
          toastError("Validation", variantErr);
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

        if (data.data) {
          setForm(productToFormData(data.data));
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

  const fillCategoryAi = async () => {
    if (!accessToken || !newCategory.name.trim()) return;
    setCategoryAiLoading(true);
    try {
      const parentName = newCategory.parentId
        ? categories.find((c) => c._id === newCategory.parentId)?.name
        : undefined;
      const res = await postAiSuggest<{
        description: string;
        seoTitle: string;
        seoDescription: string;
      }>(accessToken, "/api/v1/admin/ai/suggest-category", {
        name: newCategory.name.trim(),
        parentName,
      });
      if (res.success && res.data) {
        setNewCategory((f) => ({
          ...f,
          description: res.data!.description || f.description,
          seoTitle: res.data!.seoTitle || f.seoTitle,
          seoDescription: res.data!.seoDescription || f.seoDescription,
        }));
        toast({ variant: "success", title: "AI filled category copy" });
      } else {
        toastError("AI failed", res.error ?? "Could not generate content.");
      }
    } catch {
      toastError("AI failed", "Network error.");
    } finally {
      setCategoryAiLoading(false);
    }
  };

  const createCategoryInline = async () => {
    if (!accessToken) return;
    const name = newCategory.name.trim();
    if (!name) {
      toastError("Category", "Enter a category name.");
      return;
    }
    setCreatingCategory(true);
    try {
      const res = await fetch("/api/v1/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name,
          slug: newCategory.slug.trim() || slugify(name),
          parentId: newCategory.parentId || undefined,
          description: newCategory.description.trim() || undefined,
          image: newCategory.image.trim() || undefined,
          sortOrder: Number(newCategory.sortOrder) || 0,
          seo: {
            title: newCategory.seoTitle.trim() || undefined,
            description: newCategory.seoDescription.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toastError("Category", data.error ?? "Could not create category.");
        return;
      }
      const created = data.data as {
        _id: string;
        name: string;
        slug: string;
        parentId?: string;
        description?: string;
        image?: string;
      };
      const id = String(created._id);
      setCategories((prev) => {
        if (prev.some((c) => c._id === id)) return prev;
        return [
          ...prev,
          {
            _id: id,
            name: created.name,
            slug: created.slug,
            parentId: created.parentId ? String(created.parentId) : undefined,
            description: created.description,
            image: created.image,
          },
        ].sort((a, b) => a.name.localeCompare(b.name));
      });
      setForm((f) => ({
        ...f,
        categoryIds: f.categoryIds.includes(id)
          ? f.categoryIds
          : [...f.categoryIds, id],
      }));
      setNewCategory(emptyInlineCategory);
      setCreateCategoryOpen(false);
      toast({
        variant: "success",
        title: "Category created",
        description: `"${created.name}" added and selected.`,
      });
    } catch {
      toastError("Category", "Network error.");
    } finally {
      setCreatingCategory(false);
    }
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
            <CardTitle>Categories &amp; brand</CardTitle>
            <p className="text-[12px] text-muted-foreground">
              At least one category is required. Products show up in catalog
              filters and category pages by these names.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>
                  Categories <span className="text-destructive">*</span>
                </Label>
                {form.categoryIds.length > 0 ? (
                  <span className="text-[12px] text-muted-foreground">
                    {form.categoryIds.length} selected
                  </span>
                ) : (
                  <span className="text-[12px] text-destructive">
                    Select or create a category
                  </span>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-secondary/20">
                <button
                  type="button"
                  onClick={() => setCreateCategoryOpen((o) => !o)}
                  aria-expanded={createCategoryOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60"
                >
                  <span className="flex items-center gap-2 text-small font-medium text-foreground">
                    <Plus
                      className={cn(
                        "h-4 w-4 shrink-0 text-primary transition-transform duration-200",
                        createCategoryOpen && "rotate-45"
                      )}
                    />
                    {createCategoryOpen
                      ? "Hide new category"
                      : "Create new category"}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
                      createCategoryOpen && "rotate-180"
                    )}
                  />
                </button>

                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    createCategoryOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
                      <p className="text-[11px] text-muted-foreground">
                        Fill in details, then create — it will be selected on
                        this product immediately.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>
                            Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={newCategory.name}
                            onChange={(e) =>
                              setNewCategory((f) => ({
                                ...f,
                                name: e.target.value,
                              }))
                            }
                            placeholder="e.g. Coconut Water, Vitamins…"
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Slug (optional)</Label>
                          <Input
                            value={newCategory.slug}
                            onChange={(e) =>
                              setNewCategory((f) => ({
                                ...f,
                                slug: e.target.value,
                              }))
                            }
                            placeholder="auto-from-name"
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Parent (optional)</Label>
                          <select
                            className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                            value={newCategory.parentId}
                            onChange={(e) =>
                              setNewCategory((f) => ({
                                ...f,
                                parentId: e.target.value,
                              }))
                            }
                          >
                            <option value="">None (top-level)</option>
                            {categories.map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <div className="flex items-center justify-between gap-2">
                            <Label>Description</Label>
                            <AiAssistButton
                              label="AI write"
                              loading={categoryAiLoading}
                              disabled={!newCategory.name.trim()}
                              onClick={() => void fillCategoryAi()}
                            />
                          </div>
                          <Textarea
                            value={newCategory.description}
                            onChange={(e) =>
                              setNewCategory((f) => ({
                                ...f,
                                description: e.target.value,
                              }))
                            }
                            rows={3}
                            placeholder="Shown on category page and directory cards"
                            className="bg-background"
                          />
                        </div>
                        {accessToken && (
                          <div className="sm:col-span-2">
                            <ImageUpload
                              label="Category image"
                              value={newCategory.image}
                              onChange={(url) =>
                                setNewCategory((f) => ({ ...f, image: url }))
                              }
                              accessToken={accessToken}
                              folder="categories"
                              aspectHint="Upload, paste a live URL, or a local path like /brand/category.png"
                            />
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label>Sort order</Label>
                          <Input
                            type="number"
                            value={newCategory.sortOrder}
                            onChange={(e) =>
                              setNewCategory((f) => ({
                                ...f,
                                sortOrder: Number(e.target.value) || 0,
                              }))
                            }
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>SEO title</Label>
                          <Input
                            value={newCategory.seoTitle}
                            onChange={(e) =>
                              setNewCategory((f) => ({
                                ...f,
                                seoTitle: e.target.value,
                              }))
                            }
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>SEO description</Label>
                          <Textarea
                            value={newCategory.seoDescription}
                            onChange={(e) =>
                              setNewCategory((f) => ({
                                ...f,
                                seoDescription: e.target.value,
                              }))
                            }
                            rows={2}
                            className="bg-background"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          type="button"
                          onClick={() => void createCategoryInline()}
                          disabled={
                            creatingCategory || !newCategory.name.trim()
                          }
                        >
                          {creatingCategory ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating…
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Create &amp; select
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCreateCategoryOpen(false);
                            setNewCategory(emptyInlineCategory);
                          }}
                          disabled={creatingCategory}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {categories.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-small text-muted-foreground">
                  No categories yet — tap{" "}
                  <strong>Create new category</strong> above.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.map((c) => {
                    const selected = form.categoryIds.includes(c._id);
                    return (
                      <label
                        key={c._id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-small transition-colors",
                          selected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:bg-secondary"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={selected}
                          onChange={() => toggleCategory(c._id)}
                        />
                        {c.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.image}
                            alt=""
                            className="h-8 w-10 shrink-0 rounded object-cover"
                          />
                        ) : null}
                        <span className="min-w-0 font-medium leading-snug">
                          {c.name}
                        </span>
                      </label>
                    );
                  })}
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
        <div className="space-y-6">
          <ProductVariantBuilder
            baseSku={form.sku}
            basePrice={form.pricing.price}
            baseCompareAt={form.pricing.compareAtPrice}
            baseStock={form.inventory.stock}
            optionGroups={form.variantOptions}
            variants={form.variants}
            productMedia={form.media}
            onOptionGroupsChange={(groups) => update("variantOptions", groups)}
            onVariantsChange={handleVariantsChange}
            onMainMediaSync={(media) => update("media", media)}
            onBasePriceChange={(price) =>
              update("pricing", { ...form.pricing, price })
            }
            accessToken={accessToken ?? ""}
            productName={form.name}
          />

          {!hasVariants && (
            <Card className="overflow-hidden border-border shadow-[var(--shadow-subtle)]">
              <CardHeader className="border-b border-border bg-secondary/30">
                <CardTitle>Price &amp; compare-at</CardTitle>
                <p className="text-[12px] text-muted-foreground">
                  No variants yet — set the product price here. When you add
                  options, pricing moves to each variant row (with Main).
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.pricing.price}
                      onChange={(e) => handleListingPriceChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Compare at</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.pricing.compareAtPrice}
                      onChange={(e) =>
                        handleListingCompareAtChange(e.target.value)
                      }
                      placeholder="Original / MSRP"
                    />
                    {isOnSale && (
                      <p className="text-[12px] text-green-600">
                        Discount pricing active
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
              </CardContent>
            </Card>
          )}

          {hasVariants && (
            <Card>
              <CardHeader>
                <CardTitle>Currency &amp; deals</CardTitle>
                <p className="text-[12px] text-muted-foreground">
                  Listing price comes from the Main variant. Set currency and deal
                  flags here.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
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
                  <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-small">
                    <p className="font-medium text-foreground">
                      Main listing: {form.pricing.currency}{" "}
                      {form.pricing.price || "—"}
                      {form.pricing.compareAtPrice
                        ? ` · was ${form.pricing.compareAtPrice}`
                        : ""}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      From the Main radio on the variants table
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium">Include in Deals / Sale</p>
                    <p className="text-[12px] text-muted-foreground">
                      List this product on the Deals page.
                    </p>
                  </div>
                  <Switch
                    checked={form.onSale}
                    onCheckedChange={(v) => update("onSale", v)}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
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
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Shipping · weight &amp; size</CardTitle>
              <p className="text-[12px] text-muted-foreground">
                Used for shipping estimates and carrier rules.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
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
        </div>
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
                  <p className="font-medium">Featured on homepage</p>
                  <p className="text-[12px] text-muted-foreground">
                    Shows in the Featured Products section on the homepage.
                  </p>
                </div>
                <Switch
                  checked={form.featured}
                  onCheckedChange={(v) => update("featured", v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium">Flash sale on homepage</p>
                  <p className="text-[12px] text-muted-foreground">
                    Shows in the Flash Sale section on the homepage.
                  </p>
                </div>
                <Switch
                  checked={form.flashSale}
                  onCheckedChange={(v) => update("flashSale", v)}
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
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium">Free delivery</p>
                  <p className="text-[12px] text-muted-foreground">
                    This product ships free when every item in the cart also has
                    free delivery. Mixed carts still use global shipping rates.
                  </p>
                </div>
                <Switch
                  checked={form.freeShipping}
                  onCheckedChange={(v) => update("freeShipping", v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium">Deals / Sale</p>
                  <p className="text-[12px] text-muted-foreground">
                    Include on the Deals page. Compare-at price only controls the
                    discount display — it does not add the product to Deals automatically.
                    {isOnSale ? (
                      <span className="ml-1 font-medium text-green-600">
                        Discount pricing is set.
                      </span>
                    ) : form.onSale ? (
                      <span className="ml-1 text-amber-600">
                        Set compare-at price above sale price to show a discount.
                      </span>
                    ) : null}
                  </p>
                </div>
                <Switch
                  checked={form.onSale}
                  onCheckedChange={(v) => update("onSale", v)}
                />
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
