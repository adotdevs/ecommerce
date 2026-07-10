import { connectDB } from "@/lib/db/mongoose";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess } from "@/lib/api/response";
import { getSiteLanguages } from "@/lib/i18n/locale-registry";
import {
  getUiTranslationCatalog,
  getUiTranslationsForLocales,
} from "@/lib/i18n/ui-messages";
import { getTranslationProviderInfo } from "@/lib/i18n/site-translate";
import { defaultLocale } from "@/config/locales";
import { HomepageSection, CatalogPage, Product } from "@/models";

export const GET = withAuth(async () => {
  await connectDB();

  const languages = await getSiteLanguages();
  const enabled = languages.filter((l) => l.enabled !== false);
  const targetLocales = enabled
    .map((l) => l.code)
    .filter((code) => code !== defaultLocale);

  const catalog = await getUiTranslationCatalog();
  const entries = await getUiTranslationsForLocales(targetLocales);

  const [homepageSections, catalogPages] = await Promise.all([
    HomepageSection.find()
      .select("type translationStatus lastTranslatedAt translations")
      .lean(),
    CatalogPage.find()
      .select("slug translationStatus lastTranslatedAt translations")
      .lean(),
  ]);

  const localeCoverage: Record<
    string,
    { ui: number; uiTotal: number; homepage: number; catalog: number; products: number; productsTotal: number }
  > = {};

  const allProducts = await Product.find()
    .select("translations status")
    .lean();
  const productTotal = allProducts.filter((p) =>
    ["published", "draft"].includes(String(p.status))
  ).length;

  for (const locale of targetLocales) {
    const uiTranslated = entries.filter(
      (e) => e.translations[locale]?.trim()
    ).length;

    localeCoverage[locale] = {
      ui: uiTranslated,
      uiTotal: catalog.totalKeys,
      homepage: homepageSections.filter(
        (s) =>
          (s.translations as Record<string, unknown>)?.[locale] &&
          Object.keys(
            (s.translations as Record<string, unknown>)[locale] as object
          ).length > 0
      ).length,
      catalog: catalogPages.filter(
        (p) =>
          (p.translations as Record<string, unknown>)?.[locale] &&
          Object.keys(
            (p.translations as Record<string, unknown>)[locale] as object
          ).length > 0
      ).length,
      products: allProducts.filter(
        (p) =>
          ["published", "draft"].includes(String(p.status)) &&
          (p.translations as Record<string, unknown>)?.[locale] &&
          Boolean(
            (p.translations as Record<string, { name?: string }>)[locale]?.name
          )
      ).length,
      productsTotal: productTotal,
    };
  }

  return apiSuccess({
    provider: getTranslationProviderInfo(),
    sourceLocale: defaultLocale,
    languages: enabled,
    namespaces: catalog.namespaces,
    totalKeys: catalog.totalKeys,
    entries,
    localeCoverage,
    cms: {
      homepageSections: homepageSections.map((s) => ({
        id: String(s._id),
        type: s.type,
        translationStatus: s.translationStatus,
        locales: Object.keys(s.translations ?? {}),
      })),
      catalogPages: catalogPages.map((p) => ({
        id: String(p._id),
        slug: p.slug,
        translationStatus: p.translationStatus,
        locales: Object.keys(p.translations ?? {}),
      })),
    },
  });
}, PERMISSIONS.CMS_READ);
