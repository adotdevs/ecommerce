import type { Locale } from "@/config/locales";

export interface LocalizableProduct {
  name: string;
  description?: string;
  shortDescription?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  translations?: Record<
    string,
    {
      name?: string;
      description?: string;
      shortDescription?: string;
      seo?: { title?: string; description?: string; keywords?: string[] };
    }
  >;
}

export function localizeProduct<T extends LocalizableProduct>(
  product: T,
  locale: Locale
): T {
  const tr = product.translations?.[locale];
  if (!tr) return product;
  return {
    ...product,
    name: tr.name ?? product.name,
    description: tr.description ?? product.description,
    shortDescription: tr.shortDescription ?? product.shortDescription,
    seo: { ...product.seo, ...tr.seo },
  };
}
