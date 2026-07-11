import type { SiteSettingsPublic } from "@/types";

type RawSiteSettings = {
  announcement?: string;
  supportPhone?: string;
  supportEmail?: string;
  deliveryInfo?: string;
  logo?: string;
  logoDark?: string;
  storeName?: string;
  storeTagline?: string;
  adminBrandShort?: string;
  currencies?: { code?: string; symbol?: string; rate?: number }[];
  languages?: {
    code?: string;
    label?: string;
    nativeLabel?: string;
    dir?: string;
    enabled?: boolean;
  }[];
  countries?: {
    code?: string;
    label?: string;
    currency?: string;
    language?: string;
  }[];
  defaultCurrency?: string;
  defaultLanguage?: string;
  defaultCountry?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    canonical?: string;
    ogImage?: string;
  };
  navigation?: {
    label?: string;
    href?: string;
    children?: { label?: string; href?: string }[];
  }[];
} | null;

export function resolveStoreName(settings: RawSiteSettings): string {
  const explicit = settings?.storeName?.trim();
  if (explicit) return explicit;
  const seoTitle = settings?.seo?.title?.trim();
  if (seoTitle) {
    const short = seoTitle.split(/[|—–-]/)[0]?.trim();
    if (short) return short;
  }
  return "";
}

export function resolveStoreTagline(settings: RawSiteSettings): string {
  const explicit = settings?.storeTagline?.trim();
  if (explicit) return explicit;
  return settings?.seo?.description?.trim() ?? "";
}

export function resolveAdminBrandShort(settings: RawSiteSettings): string {
  const explicit = settings?.adminBrandShort?.trim();
  if (explicit) return explicit.slice(0, 3).toUpperCase();
  const name = resolveStoreName(settings);
  if (!name) return "";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function resolveBranding(settings: RawSiteSettings) {
  const storeName = resolveStoreName(settings);
  return {
    storeName,
    storeTagline: resolveStoreTagline(settings),
    adminBrandShort: resolveAdminBrandShort(settings),
    seoTitle: settings?.seo?.title?.trim() || storeName,
    seoDescription: settings?.seo?.description?.trim() || resolveStoreTagline(settings),
  };
}

export function toPublicSiteSettings(
  settings: RawSiteSettings
): SiteSettingsPublic | null {
  if (!settings) return null;

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
        canonical: settings.seo.canonical
          ? String(settings.seo.canonical)
          : undefined,
        ogImage: settings.seo.ogImage ? String(settings.seo.ogImage) : undefined,
      }
    : {};

  const branding = resolveBranding(settings);

  return {
    announcement: settings.announcement,
    supportPhone: settings.supportPhone,
    supportEmail: settings.supportEmail,
    deliveryInfo: settings.deliveryInfo,
    logo: settings.logo,
    logoDark: settings.logoDark,
    storeName: branding.storeName,
    storeTagline: branding.storeTagline,
    adminBrandShort: branding.adminBrandShort,
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
