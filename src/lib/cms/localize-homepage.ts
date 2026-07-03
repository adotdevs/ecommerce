import type { Locale } from "@/config/locales";
import { defaultLocale } from "@/config/locales";
import { mergeLocalizedConfig } from "@/lib/i18n/content-translations";

export interface HomepageSectionDoc {
  _id: string;
  type: string;
  order: number;
  enabled: boolean;
  config: Record<string, unknown>;
  translations?: Partial<Record<Locale, Record<string, unknown>>>;
  sourceLocale?: Locale;
}

export function localizeHomepageSection(
  section: HomepageSectionDoc,
  locale: Locale
): Record<string, unknown> {
  const source = section.sourceLocale ?? defaultLocale;
  if (locale === source) return section.config;

  const overlay = section.translations?.[locale];
  return mergeLocalizedConfig(section.config, overlay) as Record<string, unknown>;
}
