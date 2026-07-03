import { Header } from "@/components/storefront/layout/Header";
import { Footer } from "@/components/storefront/layout/Footer";
import { MobileBottomBar } from "@/components/storefront/layout/MobileBottomBar";
import { getSiteSettings } from "@/lib/data/site-settings";
import type { SiteSettingsPublic } from "@/types";

export const dynamic = "force-dynamic";

function toPublicSettings(settings: Awaited<ReturnType<typeof getSiteSettings>>): SiteSettingsPublic | null {
  if (!settings) return null;
  return {
    announcement: settings.announcement,
    supportPhone: settings.supportPhone,
    supportEmail: settings.supportEmail,
    deliveryInfo: settings.deliveryInfo,
    logo: settings.logo,
    logoDark: settings.logoDark,
    currencies: settings.currencies ?? [],
    languages: settings.languages ?? [],
    countries: settings.countries ?? [],
    defaultCurrency: settings.defaultCurrency,
    defaultLanguage: settings.defaultLanguage,
    defaultCountry: settings.defaultCountry,
    seo: settings.seo ?? {},
    navigation: settings.navigation ?? [],
  };
}

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = toPublicSettings(await getSiteSettings());

  return (
    <>
      <Header settings={settings} />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer settings={settings} />
      <MobileBottomBar />
    </>
  );
}
