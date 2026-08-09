import { connectDB } from "@/lib/db/mongoose";
import { CmsPage } from "@/models/CmsPage";
import {
  collectTranslatableStrings,
  translateConfigToAllLocales,
  mergeLocalizedConfig,
} from "@/lib/i18n/content-translations";
import {
  isAutoTranslationAvailable,
} from "@/lib/i18n/translate";
import {
  DEFAULT_CMS_PAGES,
  isCmsPageSlug,
  type CmsPageContent,
  type CmsPageSlug,
} from "@/lib/cms/cms-pages";
import { defaultLocale, type Locale } from "@/config/locales";

export async function ensureCmsPages() {
  await connectDB();
  const slugs = Object.keys(DEFAULT_CMS_PAGES) as CmsPageSlug[];

  await Promise.all(
    slugs.map(async (slug) => {
      const defaults = DEFAULT_CMS_PAGES[slug];
      const existing = await CmsPage.findOne({ slug }).lean();

      if (!existing) {
        await CmsPage.create({
          title: stringOr(defaults.pageTitle, CMS_PAGE_META_TITLE[slug]),
          slug,
          content: defaults,
          seo: {
            title: stringOr(defaults.seoTitle, CMS_PAGE_META_TITLE[slug]),
            description: stringOr(defaults.seoDescription, ""),
          },
          status: "published",
          publishedAt: new Date(),
          sourceLocale: "en",
          translationStatus: "idle",
        });
        return;
      }

      const updates: Record<string, unknown> = {};

      if (!existing.content || Object.keys(existing.content).length === 0) {
        updates.content = defaults;
      }

      if (existing.status !== "published") {
        updates.status = "published";
        updates.publishedAt = existing.publishedAt ?? new Date();
      }

      if (Object.keys(updates).length > 0) {
        await CmsPage.updateOne({ slug }, { $set: updates });
      }
    })
  );
}

const CMS_PAGE_META_TITLE: Record<CmsPageSlug, string> = {
  about: "About Us",
  contact: "Contact",
  privacy: "Privacy Policy",
};

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export async function getLocalizedCmsPage(slug: string, locale: Locale) {
  if (!isCmsPageSlug(slug)) return null;

  await ensureCmsPages();
  const page = await CmsPage.findOne({ slug, status: "published" }).lean();
  if (!page) return null;

  const base: CmsPageContent = {
    ...DEFAULT_CMS_PAGES[slug],
    ...(page.content ?? {}),
  };

  const source = (page.sourceLocale as Locale) ?? defaultLocale;
  let content = base;

  if (locale !== source && page.translations?.[locale]) {
    content = mergeLocalizedConfig(
      base,
      page.translations[locale] as Record<string, unknown>
    ) as CmsPageContent;
  }

  return {
    slug,
    title: stringOr(content.pageTitle, page.title),
    content,
    seo: {
      title: stringOr(content.seoTitle, page.seo?.title ?? page.title),
      description: stringOr(content.seoDescription, page.seo?.description ?? ""),
    },
  };
}

export async function runCmsPageTranslation(pageId: string) {
  await connectDB();
  const page = await CmsPage.findById(pageId);
  if (!page) return;

  if (!isAutoTranslationAvailable()) {
    await CmsPage.findByIdAndUpdate(pageId, {
      $set: {
        translationStatus: "idle",
        translationError:
          "Auto-translate is disabled. Edit translations manually in the admin panel.",
      },
    });
    return;
  }

  const content = {
    ...DEFAULT_CMS_PAGES[page.slug as CmsPageSlug],
    ...(page.content ?? {}),
  } as Record<string, unknown>;

  const fields = collectTranslatableStrings(content).filter(
    (f) => f.path !== "email" && f.path !== "phone"
  );
  if (fields.length === 0) {
    await CmsPage.findByIdAndUpdate(pageId, {
      $set: {
        translationStatus: "failed",
        translationError: "No translatable text found.",
      },
    });
    return;
  }

  try {
    await CmsPage.findByIdAndUpdate(pageId, {
      $set: { translationStatus: "pending", translationError: null },
    });

    const sourceLocale = (page.sourceLocale as Locale) ?? defaultLocale;
    const translations = await translateConfigToAllLocales(
      content,
      sourceLocale
    );

    await CmsPage.findByIdAndUpdate(pageId, {
      $set: {
        translations,
        translationStatus: "completed",
        translationError: null,
        lastTranslatedAt: new Date(),
      },
    });
  } catch (err) {
    await CmsPage.findByIdAndUpdate(pageId, {
      $set: {
        translationStatus: "failed",
        translationError:
          err instanceof Error ? err.message : "Translation failed",
      },
    });
  }
}
