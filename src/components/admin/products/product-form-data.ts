"use client";

import {
  type VariantOptionGroup,
  sanitizeOptionGroups,
} from "@/lib/catalog/variant-options";
import { resolveCatalogPricing } from "@/lib/catalog/product-pricing";
import type { AdminVariantRow } from "./ProductVariantBuilder";
import type { ProductMediaItem } from "./ProductMediaGallery";

export interface ProductFormData {
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  description: string;
  shortDescription: string;
  highlights: string[];
  brandId: string;
  categoryIds: string[];
  tags: string;
  media: ProductMediaItem[];
  variantOptions: VariantOptionGroup[];
  variants: AdminVariantRow[];
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
  specifications: { section: string; key: string; value: string }[];
  faqs: { question: string; answer: string }[];
  warranty: string;
  status: "draft" | "published" | "archived";
  featured: boolean;
  isNewArrival: boolean;
  onSale: boolean;
  flashSale: boolean;
  seo: {
    title: string;
    description: string;
    keywords: string;
    canonical: string;
    ogImage: string;
  };
}

export const PRODUCT_FORM_STEPS = [
  { id: "basic", label: "Basic info" },
  { id: "taxonomy", label: "Categories" },
  { id: "media", label: "Images" },
  { id: "variants", label: "Options" },
  { id: "pricing", label: "Pricing" },
  { id: "details", label: "Specs" },
  { id: "publish", label: "Publish" },
] as const;

export type ProductFormStepId = (typeof PRODUCT_FORM_STEPS)[number]["id"];

export const emptyProductForm = (): ProductFormData => ({
  name: "",
  slug: "",
  sku: "",
  barcode: "",
  description: "",
  shortDescription: "",
  highlights: [],
  brandId: "",
  categoryIds: [],
  tags: "",
  media: [],
  variantOptions: [],
  variants: [],
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
  onSale: false,
  flashSale: false,
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
    highlights: product.highlights ?? [],
    brandId: product.brandId ? String(product.brandId) : "",
    categoryIds: (product.categoryIds ?? []).map((id: { toString(): string }) =>
      String(id)
    ),
    tags: (product.tags ?? []).join(", "),
    media: (product.media ?? []).map((m: ProductMediaItem, i: number) => ({
      url: m.url,
      alt: m.alt ?? "",
      type: m.type ?? "image",
      sortOrder: m.sortOrder ?? i,
    })),
    variantOptions: (product.variantOptions ?? []).map(
      (g: VariantOptionGroup) => ({
        id: g.id,
        name: g.name,
        type: g.type,
        values: (g.values ?? []).map((v) => ({ ...v })),
      })
    ),
    variants: (product.variants ?? []).map(
      (v: {
        id: string;
        name: string;
        sku: string;
        price: number;
        compareAtPrice?: number;
        stock: number;
        attributes: Record<string, string>;
      }) => ({
        id: String(v.id),
        name: String(v.name),
        sku: String(v.sku),
        price: String(v.price),
        compareAtPrice:
          v.compareAtPrice != null ? String(v.compareAtPrice) : "",
        stock: String(v.stock),
        attributes: v.attributes ?? {},
      })
    ),
    pricing: (() => {
      const variants = (product.variants ?? []) as {
        price: number;
        compareAtPrice?: number;
      }[];
      const resolved = resolveCatalogPricing(
        {
          price: Number(product.pricing?.price ?? 0),
          compareAtPrice: product.pricing?.compareAtPrice,
          currency: product.pricing?.currency ?? "USD",
        },
        variants
      );
      return {
        price: String(resolved.price),
        compareAtPrice:
          resolved.compareAtPrice != null ? String(resolved.compareAtPrice) : "",
        currency: resolved.currency ?? "USD",
      };
    })(),
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
    onSale: product.onSale ?? false,
    flashSale: product.flashSale ?? false,
    seo: {
      title: product.seo?.title ?? "",
      description: product.seo?.description ?? "",
      keywords: (product.seo?.keywords ?? []).join(", "),
      canonical: product.seo?.canonical ?? "",
      ogImage: product.seo?.ogImage ?? "",
    },
  };
}

export function syncFormPricingFromVariants(
  pricing: ProductFormData["pricing"],
  variants: AdminVariantRow[]
): ProductFormData["pricing"] {
  if (!variants.length) return pricing;

  const resolved = resolveCatalogPricing(
    {
      price: parseFloat(pricing.price) || 0,
      compareAtPrice: pricing.compareAtPrice.trim()
        ? parseFloat(pricing.compareAtPrice)
        : undefined,
      currency: pricing.currency || "USD",
    },
    variants.map((v) => ({
      price: v.price,
      compareAtPrice: v.compareAtPrice,
    }))
  );

  return {
    price: String(resolved.price),
    compareAtPrice:
      resolved.compareAtPrice != null ? String(resolved.compareAtPrice) : "",
    currency: resolved.currency ?? pricing.currency ?? "USD",
  };
}

export function formToPayload(form: ProductFormData) {
  const compareAt = form.pricing.compareAtPrice.trim();
  const totalVariantStock = form.variants.reduce(
    (sum, v) => sum + (parseInt(v.stock) || 0),
    0
  );

  const variants = form.variants.map((v) => {
    const suffix = Object.values(v.attributes).filter(Boolean).join("-");
    const fallbackSku = suffix
      ? `${form.sku.trim()}-${suffix}`.toUpperCase().slice(0, 48)
      : form.sku.trim();
    return {
      id: v.id,
      name: v.name,
      sku: v.sku.trim() || fallbackSku,
      price: parseFloat(v.price) || parseFloat(form.pricing.price) || 0,
      compareAtPrice: v.compareAtPrice.trim()
        ? parseFloat(v.compareAtPrice)
        : compareAt
          ? parseFloat(compareAt)
          : undefined,
      stock: parseInt(v.stock) || 0,
      attributes: v.attributes,
    };
  });

  const pricing = resolveCatalogPricing(
    {
      price: parseFloat(form.pricing.price) || 0,
      compareAtPrice: compareAt ? parseFloat(compareAt) : undefined,
      currency: form.pricing.currency || "USD",
    },
    variants
  );

  return {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    sku: form.sku.trim(),
    barcode: form.barcode.trim() || undefined,
    description: form.description.trim() || undefined,
    shortDescription: form.shortDescription.trim() || undefined,
    highlights: form.highlights.filter((h) => h.trim()),
    brandId: form.brandId || null,
    categoryIds: form.categoryIds,
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    media: form.media.filter((m) => m.url?.trim()),
    variantOptions: sanitizeOptionGroups(form.variantOptions),
    variants,
    pricing: {
      price: pricing.price,
      compareAtPrice: pricing.compareAtPrice ?? null,
      currency: pricing.currency ?? "USD",
    },
    inventory: {
      stock: form.variants.length
        ? totalVariantStock
        : parseInt(form.inventory.stock) || 0,
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
    onSale: form.onSale,
    flashSale: form.flashSale,
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
