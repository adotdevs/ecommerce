import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { defaultLocale, type Locale } from "@/config/locales";
import { getSiteLanguages } from "@/lib/i18n/locale-registry";
import {
  getPaymentVerificationCatalog,
  getPaymentVerificationForLocales,
  savePaymentVerificationLocale,
  translatePaymentVerificationToLocale,
  paymentVerificationCoverage,
} from "@/lib/i18n/payment-verification-messages";
import {
  getTranslationProviderInfo,
} from "@/lib/i18n/site-translate";
import {
  isAutoTranslationAvailable,
  type TranslationProvider,
} from "@/lib/i18n/translate";

export const GET = withAuth(async () => {
  const languages = await getSiteLanguages();
  const enabled = languages.filter((l) => l.enabled !== false);
  const targetLocales = enabled
    .map((l) => l.code)
    .filter((code) => code !== defaultLocale);

  const catalog = await getPaymentVerificationCatalog();
  const entries = await getPaymentVerificationForLocales(targetLocales);

  const localeCoverage: Record<
    string,
    { translated: number; total: number; percent: number }
  > = {};
  for (const locale of targetLocales) {
    localeCoverage[locale] = paymentVerificationCoverage(entries, locale);
  }

  return apiSuccess({
    sourceLocale: defaultLocale,
    languages: enabled,
    totalKeys: catalog.totalKeys,
    entries,
    localeCoverage,
    provider: getTranslationProviderInfo(),
  });
}, PERMISSIONS.CMS_READ);

const patchSchema = z.object({
  locale: z.string().min(2),
  values: z.record(z.string(), z.string()),
});

export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const { locale, values } = parsed.data;
    if (locale === defaultLocale) {
      return apiError("English is the source language.", 400);
    }

    const result = await savePaymentVerificationLocale(locale, values);
    return apiSuccess(result);
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Could not save translations",
      500
    );
  }
}, PERMISSIONS.CMS_WRITE);

const translateSchema = z.object({
  targetLocale: z.string().min(2).optional(),
  allLocales: z.boolean().optional(),
  provider: z.enum(["openai", "mymemory", "google", "none"]).optional(),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const parsed = translateSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const { targetLocale, allLocales, provider } = parsed.data;

    if (!isAutoTranslationAvailable(provider)) {
      return apiError(
        provider === "openai"
          ? "OpenAI not configured. Add OPENAI_API_KEY to .env.local"
          : "Auto-translate is disabled for the selected provider.",
        400
      );
    }

    const languages = await getSiteLanguages();
    const locales = languages
      .filter((l) => l.enabled !== false && l.code !== defaultLocale)
      .map((l) => l.code);

    const targets = allLocales
      ? locales
      : targetLocale
        ? [targetLocale]
        : [];

    if (targets.length === 0) {
      return apiError("Pick a target language or use allLocales.", 400);
    }

    const results: { locale: string; translated: number }[] = [];
    for (const locale of targets) {
      const result = await translatePaymentVerificationToLocale(
        locale as Locale,
        defaultLocale,
        provider as TranslationProvider | undefined
      );
      results.push(result);
    }

    return apiSuccess({ results });
  } catch (err) {
    console.error(err);
    return apiError(
      err instanceof Error ? err.message : "Translation failed",
      500
    );
  }
}, PERMISSIONS.CMS_WRITE);
