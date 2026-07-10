import type { Locale } from "@/config/locales";
import type { VariantOptionGroup } from "@/lib/catalog/variant-options";
import type { ProductTranslationFields } from "@/lib/i18n/product-translate";

export interface LocalizableProduct {
  name: string;
  description?: string;
  shortDescription?: string;
  warranty?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  specifications?: { key: string; value: string }[];
  faqs?: { question: string; answer: string }[];
  variantOptions?: VariantOptionGroup[];
  variants?: {
    id: string;
    name: string;
    sku?: string;
    price?: number;
    compareAtPrice?: number;
    stock?: number;
    attributes?: Record<string, string>;
  }[];
  translations?: Record<string, ProductTranslationFields>;
}

function mergeVariantOptions(
  base: VariantOptionGroup[] | undefined,
  translated: ProductTranslationFields["variantOptions"]
): VariantOptionGroup[] | undefined {
  if (!base?.length) return base;
  if (!translated?.length) return base;

  return base.map((g) => {
    const tr = translated.find((t) => t.id === g.id);
    if (!tr) return g;
    return {
      ...g,
      name: tr.name ?? g.name,
      values: g.values.map((v) => {
        const trVal = tr.values?.find((tv) => tv.value === v.value);
        return trVal?.label ? { ...v, label: trVal.label } : v;
      }),
    };
  });
}

function mergeVariants(
  base: LocalizableProduct["variants"],
  translated: ProductTranslationFields["variants"]
): LocalizableProduct["variants"] {
  if (!base?.length) return base;
  if (!translated?.length) return base;

  return base.map((v) => {
    const tr = translated.find((t) => t.id === v.id);
    return tr?.name ? { ...v, name: tr.name } : v;
  });
}

export function localizeProduct<T extends LocalizableProduct>(
  product: T,
  locale: Locale
): T {
  if (locale === "en") return product;

  const tr = product.translations?.[locale];
  if (!tr) return product;

  return {
    ...product,
    name: tr.name ?? product.name,
    description: tr.description ?? product.description,
    shortDescription: tr.shortDescription ?? product.shortDescription,
    warranty: tr.warranty ?? product.warranty,
    seo: { ...product.seo, ...tr.seo },
    specifications: tr.specifications?.length
      ? tr.specifications
      : product.specifications,
    faqs: tr.faqs?.length ? tr.faqs : product.faqs,
    variantOptions: mergeVariantOptions(product.variantOptions, tr.variantOptions),
    variants: mergeVariants(product.variants, tr.variants),
  };
}

/** Localize a raw Mongo product document for storefront/API. */
export function localizeProductDoc<T extends Record<string, unknown>>(
  product: T,
  locale: Locale
): T {
  if (locale === "en") return product;
  const localized = localizeProduct(
    product as unknown as LocalizableProduct,
    locale
  );
  return { ...product, ...localized } as T;
}
