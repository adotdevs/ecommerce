import { connectDB } from "@/lib/db/mongoose";
import { HomepageSection } from "@/models";
import {
  collectTranslatableStrings,
  translateConfigToAllLocales,
} from "@/lib/i18n/content-translations";
import {
  isAutoTranslationAvailable,
  getTranslationProviderLabel,
} from "@/lib/i18n/translate";
import { normalizeSectionConfig } from "@/lib/cms/normalize-section-config";
import type { Locale } from "@/config/locales";

function countTranslatedLocales(
  translations: Partial<Record<Locale, Record<string, unknown>>>
) {
  return Object.keys(translations).filter(
    (l) => translations[l] && Object.keys(translations[l]!).length > 0
  ).length;
}

export async function runSectionTranslation(sectionId: string) {
  await connectDB();
  const section = await HomepageSection.findById(sectionId);
  if (!section) return;

  if (!isAutoTranslationAvailable()) {
    await HomepageSection.findByIdAndUpdate(sectionId, {
      $set: {
        translationStatus: "idle",
        translationError:
          "Auto-translate is disabled (TRANSLATION_PROVIDER=none). Edit translations manually in the admin panel.",
      },
    });
    return;
  }

  const config = normalizeSectionConfig(
    section.type,
    section.config as Record<string, unknown>
  );
  const sourceLocale = (section.sourceLocale as Locale) ?? "en";
  const fields = collectTranslatableStrings(config);

  if (fields.length === 0) {
    await HomepageSection.findByIdAndUpdate(sectionId, {
      $set: {
        translationStatus: "failed",
        translationError:
          "No translatable text found in this section. Add text fields in the English editor first.",
      },
    });
    return;
  }

  try {
    await HomepageSection.findByIdAndUpdate(sectionId, {
      $set: { translationStatus: "pending", translationError: null },
    });

    const translations = await translateConfigToAllLocales(config, sourceLocale);
    const localeCount = countTranslatedLocales(translations);

    if (localeCount === 0) {
      throw new Error(
        "Translation provider returned no results. Check TRANSLATION_PROVIDER or try again later."
      );
    }

    await HomepageSection.findByIdAndUpdate(sectionId, {
      $set: {
        config,
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
    await HomepageSection.findByIdAndUpdate(sectionId, {
      $set: {
        translationStatus: "failed",
        translationError: `${err instanceof Error ? err.message : "Translation failed"}${hint}`,
      },
    });
  }
}
