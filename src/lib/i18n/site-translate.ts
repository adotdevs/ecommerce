import { connectDB } from "@/lib/db/mongoose";
import { HomepageSection, CatalogPage } from "@/models";
import { defaultLocale, type Locale } from "@/config/locales";
import {
  isAutoTranslationAvailable,
  getTranslationProviderLabel,
} from "@/lib/i18n/translate";
import {
  translateUiMessagesToLocale,
  translateConfigToLocale,
} from "@/lib/i18n/ui-messages";
import { normalizeSectionConfig } from "@/lib/cms/normalize-section-config";
import { collectTranslatableStrings } from "@/lib/i18n/content-translations";

export interface SiteTranslationResult {
  targetLocale: string;
  ui: { translated: number; success: boolean; error?: string };
  homepage: { sections: number; success: boolean; error?: string };
  catalogPages: { pages: number; success: boolean; error?: string };
}

export async function runFullSiteTranslation(
  targetLocale: Locale
): Promise<SiteTranslationResult> {
  const result: SiteTranslationResult = {
    targetLocale,
    ui: { translated: 0, success: false },
    homepage: { sections: 0, success: false },
    catalogPages: { pages: 0, success: false },
  };

  if (!isAutoTranslationAvailable()) {
    const msg =
      "Auto-translate is disabled. Set TRANSLATION_PROVIDER=mymemory in .env.local";
    result.ui.error = msg;
    result.homepage.error = msg;
    result.catalogPages.error = msg;
    return result;
  }

  try {
    const ui = await translateUiMessagesToLocale(targetLocale);
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
        (section.sourceLocale as Locale) ?? defaultLocale
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
        (page.sourceLocale as Locale) ?? defaultLocale
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

  return result;
}

export function getTranslationProviderInfo() {
  return {
    provider: getTranslationProviderLabel(),
    available: isAutoTranslationAvailable(),
  };
}
