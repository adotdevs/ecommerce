import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { defaultLocale } from "@/config/locales";

function deepMergeMessages(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const existing = result[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      result[key] = deepMergeMessages(
        existing as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function loadMessages(locale: string) {
  const english = (await import(`../../messages/${defaultLocale}.json`)).default as Record<
    string,
    unknown
  >;

  if (locale === defaultLocale) {
    return english;
  }

  try {
    const localized = (await import(`../../messages/${locale}.json`))
      .default as Record<string, unknown>;
    return deepMergeMessages(english, localized);
  } catch {
    return english;
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
