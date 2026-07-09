import { connectDB } from "@/lib/db/mongoose";
import { CatalogPage, type CatalogPageSlug } from "@/models/CatalogPage";
import {
  collectTranslatableStrings,
  translateConfigToAllLocales,
  mergeLocalizedConfig,
} from "@/lib/i18n/content-translations";
import {
  isAutoTranslationAvailable,
  getTranslationProviderLabel,
} from "@/lib/i18n/translate";
import {
  DEFAULT_CATALOG_PAGES,
  type CatalogPageConfig,
} from "@/lib/cms/catalog-pages";
import { defaultLocale, type Locale } from "@/config/locales";

function countTranslatedLocales(
  translations: Partial<Record<Locale, Record<string, unknown>>>
) {
  return Object.keys(translations).filter(
    (l) => translations[l] && Object.keys(translations[l]!).length > 0
  ).length;
}

export async function ensureCatalogPages() {
  await connectDB();
  const slugs = Object.keys(DEFAULT_CATALOG_PAGES) as CatalogPageSlug[];
  await Promise.all(
    slugs.map(async (slug) => {
      const existing = await CatalogPage.findOne({ slug }).lean();
      if (!existing) {
        await CatalogPage.create({
          slug,
          config: DEFAULT_CATALOG_PAGES[slug],
          sourceLocale: "en",
          translationStatus: "idle",
        });
      }
    })
  );
}

export async function getLocalizedCatalogPage(
  slug: CatalogPageSlug,
  locale: Locale
): Promise<CatalogPageConfig> {
  await ensureCatalogPages();
  const page = await CatalogPage.findOne({ slug }).lean();
  const base: CatalogPageConfig = {
    ...DEFAULT_CATALOG_PAGES[slug],
    ...(page?.config ?? {}),
  };

  const source = (page?.sourceLocale as Locale) ?? defaultLocale;
  if (!page || locale === source) return base;

  const overlay = page.translations?.[locale] as CatalogPageConfig | undefined;
  return mergeLocalizedConfig(
    base as unknown as Record<string, unknown>,
    overlay as Record<string, unknown> | undefined
  ) as unknown as CatalogPageConfig;
}

export async function runCatalogPageTranslation(pageId: string) {
  await connectDB();
  const page = await CatalogPage.findById(pageId);
  if (!page) return;

  if (!isAutoTranslationAvailable()) {
    await CatalogPage.findByIdAndUpdate(pageId, {
      $set: {
        translationStatus: "idle",
        translationError:
          "Auto-translate is disabled (TRANSLATION_PROVIDER=none). Edit translations manually in the admin panel.",
      },
    });
    return;
  }

  const config = page.config as unknown as Record<string, unknown>;
  const sourceLocale = (page.sourceLocale as Locale) ?? "en";
  const fields = collectTranslatableStrings(config);

  if (fields.length === 0) {
    await CatalogPage.findByIdAndUpdate(pageId, {
      $set: {
        translationStatus: "failed",
        translationError:
          "No translatable text found. Add text fields in the English editor first.",
      },
    });
    return;
  }

  try {
    await CatalogPage.findByIdAndUpdate(pageId, {
      $set: { translationStatus: "pending", translationError: null },
    });

    const translations = await translateConfigToAllLocales(config, sourceLocale);
    const localeCount = countTranslatedLocales(translations);

    if (localeCount === 0) {
      throw new Error(
        "Translation provider returned no results. Check TRANSLATION_PROVIDER or try again later."
      );
    }

    await CatalogPage.findByIdAndUpdate(pageId, {
      $set: {
        translations,
        translationStatus: "completed",
        lastTranslatedAt: new Date(),
        translationError: null,
      },
    });
  } catch (err) {
    const hint =
      getTranslationProviderLabel() === "MyMemory (free)"
        ? " Free tier limit may be reached — wait or add MYMEMORY_EMAIL to .env.local, or edit translations manually."
        : "";
    await CatalogPage.findByIdAndUpdate(pageId, {
      $set: {
        translationStatus: "failed",
        translationError: `${err instanceof Error ? err.message : "Translation failed"}${hint}`,
      },
    });
  }
}
