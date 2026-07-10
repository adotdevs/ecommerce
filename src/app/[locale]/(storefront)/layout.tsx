import { Header } from "@/components/storefront/layout/Header";
import { Footer } from "@/components/storefront/layout/Footer";
import { MobileBottomBar } from "@/components/storefront/layout/MobileBottomBar";
import { NavigationProgress } from "@/components/storefront/layout/NavigationProgress";
import { ThemePreferencePrompt } from "@/components/storefront/layout/ThemePreferencePrompt";
import { getSiteSettings } from "@/lib/data/site-settings";
import type { SiteSettingsPublic } from "@/types";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

function toPublicSettings(
  settings: Awaited<ReturnType<typeof getSiteSettings>>
): SiteSettingsPublic | null {
  if (!settings) return null;

  // Strip Mongo subdocument _ids — Client Components only accept plain JSON.
  const currencies = (settings.currencies ?? []).map((c) => ({
    code: String(c.code ?? ""),
    symbol: String(c.symbol ?? ""),
    rate: Number(c.rate ?? 1),
  }));
  const languages = (settings.languages ?? []).map((l) => ({
    code: String(l.code ?? ""),
    label: String(l.label ?? ""),
    nativeLabel: l.nativeLabel ? String(l.nativeLabel) : undefined,
    dir: l.dir === "rtl" ? ("rtl" as const) : ("ltr" as const),
    enabled: l.enabled !== false,
  }));
  const countries = (settings.countries ?? []).map((c) => ({
    code: String(c.code ?? ""),
    label: String(c.label ?? ""),
    currency: String(c.currency ?? ""),
    language: String(c.language ?? ""),
  }));
  const navigation = (settings.navigation ?? []).map((item) => ({
    label: String(item.label ?? ""),
    href: String(item.href ?? ""),
    children: item.children?.map((child) => ({
      label: String(child.label ?? ""),
      href: String(child.href ?? ""),
    })),
  }));
  const seo = settings.seo
    ? {
        title: settings.seo.title ? String(settings.seo.title) : undefined,
        description: settings.seo.description
          ? String(settings.seo.description)
          : undefined,
        keywords: Array.isArray(settings.seo.keywords)
          ? settings.seo.keywords.map(String)
          : undefined,
      }
    : {};

  return {
    announcement: settings.announcement,
    supportPhone: settings.supportPhone,
    supportEmail: settings.supportEmail,
    deliveryInfo: settings.deliveryInfo,
    logo: settings.logo,
    logoDark: settings.logoDark,
    currencies,
    languages,
    countries,
    defaultCurrency: String(settings.defaultCurrency ?? "USD"),
    defaultLanguage: String(settings.defaultLanguage ?? "en"),
    defaultCountry: String(settings.defaultCountry ?? "US"),
    seo,
    navigation,
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
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Header settings={settings} />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer settings={settings} />
      <MobileBottomBar />
      <ThemePreferencePrompt />
    </>
  );
}
