import type { Locale } from "@/config/locales";
import type { VariantOptionGroup } from "@/lib/catalog/variant-options";
import { translateText, type TranslationProvider } from "@/lib/i18n/translate";

export interface ProductTranslationFields {
  name?: string;
  description?: string;
  shortDescription?: string;
  highlights?: string[];
  warranty?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  specifications?: { section?: string; key: string; value: string }[];
  faqs?: { question: string; answer: string }[];
  variantOptions?: {
    id: string;
    name?: string;
    values?: { value: string; label?: string }[];
  }[];
  variants?: { id: string; name?: string }[];
}

export interface TranslatableProduct {
  name: string;
  description?: string;
  shortDescription?: string;
  highlights?: string[];
  warranty?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  specifications?: { section?: string; key: string; value: string }[];
  faqs?: { question: string; answer: string }[];
  variantOptions?: VariantOptionGroup[];
  variants?: { id: string; name: string }[];
  translations?: Record<string, ProductTranslationFields>;
}

export async function buildProductTranslationOverlay(
  product: TranslatableProduct,
  targetLocale: Locale,
  sourceLocale: Locale = "en",
  provider?: TranslationProvider
): Promise<ProductTranslationFields> {
  const overlay: ProductTranslationFields = {};

  if (product.name?.trim()) {
    overlay.name = await translateText(
      product.name,
      targetLocale,
      sourceLocale,
      provider
    );
  }
  if (product.shortDescription?.trim()) {
    overlay.shortDescription = await translateText(
      product.shortDescription,
      targetLocale,
      sourceLocale,
      provider
    );
  }
  if (product.highlights?.length) {
    overlay.highlights = await Promise.all(
      product.highlights.map((h) =>
        translateText(h, targetLocale, sourceLocale, provider)
      )
    );
  }
  if (product.description?.trim()) {
    overlay.description = await translateText(
      product.description,
      targetLocale,
      sourceLocale,
      provider
    );
  }
  if (product.warranty?.trim()) {
    overlay.warranty = await translateText(
      product.warranty,
      targetLocale,
      sourceLocale,
      provider
    );
  }

  if (product.seo) {
    overlay.seo = {};
    if (product.seo.title?.trim()) {
      overlay.seo.title = await translateText(
        product.seo.title,
        targetLocale,
        sourceLocale,
        provider
      );
    }
    if (product.seo.description?.trim()) {
      overlay.seo.description = await translateText(
        product.seo.description,
        targetLocale,
        sourceLocale,
        provider
      );
    }
    if (product.seo.keywords?.length) {
      overlay.seo.keywords = await Promise.all(
        product.seo.keywords.map((k) =>
          translateText(k, targetLocale, sourceLocale, provider)
        )
      );
    }
  }

  if (product.specifications?.length) {
    overlay.specifications = await Promise.all(
      product.specifications.map(async (s) => ({
        section: s.section
          ? await translateText(s.section, targetLocale, sourceLocale, provider)
          : undefined,
        key: await translateText(s.key, targetLocale, sourceLocale, provider),
        value: await translateText(s.value, targetLocale, sourceLocale, provider),
      }))
    );
  }

  if (product.faqs?.length) {
    overlay.faqs = await Promise.all(
      product.faqs.map(async (f) => ({
        question: await translateText(
          f.question,
          targetLocale,
          sourceLocale,
          provider
        ),
        answer: await translateText(f.answer, targetLocale, sourceLocale, provider),
      }))
    );
  }

  if (product.variantOptions?.length) {
    overlay.variantOptions = await Promise.all(
      product.variantOptions.map(async (g) => ({
        id: g.id,
        name: g.name
          ? await translateText(g.name, targetLocale, sourceLocale, provider)
          : undefined,
        values: g.values?.length
          ? await Promise.all(
              g.values.map(async (v) => ({
                value: v.value,
                label: v.label
                  ? await translateText(
                      v.label,
                      targetLocale,
                      sourceLocale,
                      provider
                    )
                  : v.value,
              }))
            )
          : [],
      }))
    );
  }

  if (product.variants?.length) {
    overlay.variants = await Promise.all(
      product.variants.map(async (v) => ({
        id: v.id,
        name: v.name
          ? await translateText(v.name, targetLocale, sourceLocale, provider)
          : undefined,
      }))
    );
  }

  return overlay;
}
