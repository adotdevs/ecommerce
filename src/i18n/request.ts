import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { defaultLocale } from "@/config/locales";

async function loadMessages(locale: string) {
  try {
    return (await import(`../../messages/${locale}.json`)).default;
  } catch {
    return (await import(`../../messages/${defaultLocale}.json`)).default;
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
