import { defaultLanguages, defaultLocale } from "@/config/locales";

/** Locales the store has enabled (edge-safe, mirrors Site Settings defaults). */
export function getStoreEnabledLocales(): string[] {
  return defaultLanguages
    .filter((l) => l.enabled !== false)
    .map((l) => l.code);
}

/**
 * Pick the best storefront locale when the country's ideal language isn't available.
 * e.g. Germany + German disabled → English, but currency stays EUR.
 */
export function resolveStoreLocale(
  idealLocale: string,
  enabledLocales: string[] = getStoreEnabledLocales()
): string {
  const ideal = idealLocale.toLowerCase().split("-")[0];
  if (enabledLocales.includes(ideal)) return ideal;
  if (enabledLocales.includes(defaultLocale)) return defaultLocale;
  return enabledLocales[0] ?? defaultLocale;
}
