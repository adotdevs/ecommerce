import { connectDB } from "@/lib/db/mongoose";
import { HomepageSection, CatalogPage, Product } from "@/models";
import { defaultLocale, type Locale } from "@/config/locales";
import {
  isAutoTranslationAvailable,
  getTranslationProviderLabel,
  getAvailableTranslationProviders,
  getTranslationProvider,
  type TranslationProvider,
} from "@/lib/i18n/translate";
import {
  translateUiMessagesToLocale,
  translateConfigToLocale,
} from "@/lib/i18n/ui-messages";
import { normalizeSectionConfig } from "@/lib/cms/normalize-section-config";
import { collectTranslatableStrings } from "@/lib/i18n/content-translations";
import { buildProductTranslationOverlay } from "@/lib/i18n/product-translate";

export interface SiteTranslationResult {
  targetLocale: string;
  provider: string;
  ui: { translated: number; success: boolean; error?: string };
  homepage: { sections: number; success: boolean; error?: string };
  catalogPages: { pages: number; success: boolean; error?: string };
  products: { products: number; success: boolean; error?: string };
}

export async function runFullSiteTranslation(
  targetLocale: Locale,
  providerOverride?: TranslationProvider
): Promise<SiteTranslationResult> {
  const provider = providerOverride ?? getTranslationProvider();

  const result: SiteTranslationResult = {
    targetLocale,
    provider: getTranslationProviderLabel(provider),
    ui: { translated: 0, success: false },
    homepage: { sections: 0, success: false },
    catalogPages: { pages: 0, success: false },
    products: { products: 0, success: false },
  };

  if (!isAutoTranslationAvailable(provider)) {
    const msg = "Auto-translate is disabled. Choose a provider or set OPENAI_API_KEY.";
    result.ui.error = msg;
    result.homepage.error = msg;
    result.catalogPages.error = msg;
    result.products.error = msg;
    return result;
  }

  try {
    const ui = await translateUiMessagesToLocale(
      targetLocale,
      defaultLocale,
      provider
    );
    result.ui = { translated: ui.translated, success: true };
  } catch (err) {
    result.ui.error = err instanceof Error ? err.message : "UI translation failed";
  }

  await connectDB();

  try {
    const sections = await HomepageSection.find().lean();
    let count = 0;
    for (const section of sections) {
      const config = normalizeSectionConfig(
        section.type,
        section.config as Record<string, unknown>
      );
      const fields = collectTranslatableStrings(config);
      if (fields.length === 0) continue;

      const overlay = await translateConfigToLocale(
        config,
        targetLocale,
        (section.sourceLocale as Locale) ?? defaultLocale,
        provider
      );

      const existing =
        (section.translations as Record<string, Record<string, unknown>>) ?? {};
      existing[targetLocale] = overlay;

      await HomepageSection.findByIdAndUpdate(section._id, {
        $set: {
          translations: existing,
          translationStatus: "completed",
          lastTranslatedAt: new Date(),
          translationError: null,
        },
      });
      count++;
    }
    result.homepage = { sections: count, success: true };
  } catch (err) {
    result.homepage.error =
      err instanceof Error ? err.message : "Homepage translation failed";
  }

  try {
    const pages = await CatalogPage.find().lean();
    let count = 0;
    for (const page of pages) {
      const config = page.config as unknown as Record<string, unknown>;
      const fields = collectTranslatableStrings(config);
      if (fields.length === 0) continue;

      const overlay = await translateConfigToLocale(
        config,
        targetLocale,
        (page.sourceLocale as Locale) ?? defaultLocale,
        provider
      );

      const existing =
        (page.translations as Record<string, Record<string, unknown>>) ?? {};
      existing[targetLocale] = overlay;

      await CatalogPage.findByIdAndUpdate(page._id, {
        $set: {
          translations: existing,
          translationStatus: "completed",
          lastTranslatedAt: new Date(),
          translationError: null,
        },
      });
      count++;
    }
    result.catalogPages = { pages: count, success: true };
  } catch (err) {
    result.catalogPages.error =
      err instanceof Error ? err.message : "Catalog page translation failed";
  }

  try {
    const products = await Product.find({ status: { $in: ["published", "draft"] } }).lean();
    let count = 0;
    for (const product of products) {
      const overlay = await buildProductTranslationOverlay(
        {
          name: product.name,
          description: product.description,
          shortDescription: product.shortDescription,
          highlights: product.highlights as string[] | undefined,
          warranty: product.warranty,
          seo: product.seo,
          specifications: product.specifications,
          faqs: product.faqs,
          variantOptions: product.variantOptions as never,
          variants: product.variants,
        },
        targetLocale,
        defaultLocale,
        provider
      );

      const existing =
        (product.translations as Record<string, Record<string, unknown>>) ?? {};
      existing[targetLocale] = overlay as Record<string, unknown>;

      await Product.findByIdAndUpdate(product._id, {
        $set: { translations: existing },
      });
      count++;
    }
    result.products = { products: count, success: true };
  } catch (err) {
    result.products.error =
      err instanceof Error ? err.message : "Product translation failed";
  }

  return result;
}

export function getTranslationProviderInfo() {
  return {
    provider: getTranslationProviderLabel(),
    activeProvider: getTranslationProvider(),
    availableProviders: getAvailableTranslationProviders(),
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    available: isAutoTranslationAvailable(),
  };
}
