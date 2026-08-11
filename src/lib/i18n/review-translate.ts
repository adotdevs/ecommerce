import { defaultLocale, type Locale } from "@/config/locales";
import type { ReviewTranslationFields } from "@/models/ProductReview";
import { translateText, type TranslationProvider } from "@/lib/i18n/translate";

export interface TranslatableReview {
  title: string;
  body: string;
  translations?: Record<string, ReviewTranslationFields>;
}

export function resolveReviewDisplay(
  review: TranslatableReview,
  locale: string,
  sourceLocale: string = defaultLocale
): { title: string; body: string } {
  if (locale === sourceLocale) {
    return { title: review.title, body: review.body };
  }

  const overlay = review.translations?.[locale];
  return {
    title: overlay?.title?.trim() || review.title,
    body: overlay?.body?.trim() || review.body,
  };
}

export function reviewTranslationCoverage(
  review: TranslatableReview,
  locale: string
): { translated: number; total: number; percent: number } {
  const total = 2;
  const overlay = review.translations?.[locale];
  let translated = 0;
  if (overlay?.title?.trim()) translated++;
  if (overlay?.body?.trim()) translated++;
  return {
    translated,
    total,
    percent: total > 0 ? Math.round((translated / total) * 100) : 0,
  };
}

export async function buildReviewTranslationOverlay(
  review: TranslatableReview,
  targetLocale: Locale,
  sourceLocale: Locale = defaultLocale,
  provider?: TranslationProvider
): Promise<ReviewTranslationFields> {
  const overlay: ReviewTranslationFields = {};

  if (review.title?.trim()) {
    overlay.title = await translateText(
      review.title,
      targetLocale,
      sourceLocale,
      provider
    );
  }
  if (review.body?.trim()) {
    overlay.body = await translateText(
      review.body,
      targetLocale,
      sourceLocale,
      provider
    );
  }

  return overlay;
}
