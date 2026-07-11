import { connectDB } from "@/lib/db/mongoose";
import { HomepageSection } from "@/models";
import { isSectionVisible, resolveHomepageProducts, resolveHomepageCategories, enrichHeroSlidesFromLinks, enrichConfigFromProductLink } from "@/lib/cms/homepage";
import { localizeHomepageSection } from "@/lib/cms/localize-homepage";
import { HomepageRenderer } from "@/components/storefront/homepage/HomepageRenderer";
import { getSiteSettings } from "@/lib/data/site-settings";
import { resolveBranding } from "@/lib/site/branding";
import type { Locale } from "@/config/locales";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const { seoTitle, seoDescription } = resolveBranding(settings);
  return {
    title: seoTitle || undefined,
    description: seoDescription || undefined,
    keywords: settings?.seo?.keywords,
    openGraph: {
      title: seoTitle || undefined,
      description: seoDescription || undefined,
      images: settings?.seo?.ogImage ? [settings.seo.ogImage] : [],
    },
  };
}

async function getHomepageSections(locale: Locale) {
  await connectDB();
  const sections = await HomepageSection.find().sort({ order: 1 }).lean();
  const visible = sections.filter(isSectionVisible);

  return Promise.all(
    visible.map(async (section) => {
      let localizedConfig = localizeHomepageSection(
        {
          _id: section._id.toString(),
          type: section.type,
          order: section.order,
          enabled: section.enabled,
          config: section.config as Record<string, unknown>,
          translations: section.translations as Partial<
            Record<Locale, Record<string, unknown>>
          >,
          sourceLocale: section.sourceLocale as Locale,
        },
        locale
      );

      if (section.type === "hero_slider") {
        localizedConfig = await enrichHeroSlidesFromLinks(localizedConfig);
      }
      if (section.type === "promo_banner") {
        localizedConfig = await enrichConfigFromProductLink(localizedConfig);
      }
      if (section.type === "featured_products" || section.type === "flash_sale") {
        localizedConfig.products = await resolveHomepageProducts(localizedConfig, locale);
      }
      if (section.type === "category_showcase") {
        localizedConfig.categories = await resolveHomepageCategories(localizedConfig);
      }

      return {
        _id: section._id.toString(),
        type: section.type,
        config: localizedConfig,
      };
    })
  );
}

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  const sections = await getHomepageSections(locale);

  return <HomepageRenderer sections={sections} />;
}
