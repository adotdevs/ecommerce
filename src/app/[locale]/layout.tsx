import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { routing } from "@/i18n/routing";
import { localeConfig, type Locale } from "@/config/locales";
import { LocaleInitializer } from "@/components/providers/LocaleInitializer";
import {
  DisplayPreferencesProvider,
  type DisplayPreferences,
} from "@/components/providers/DisplayPreferencesContext";
import type { CurrencyCode } from "@/config/locales";
import { fetchLiveExchangeRates } from "@/lib/currency/live-rates";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = localeConfig[locale as Locale]?.dir ?? "ltr";

  const cookieStore = await cookies();
  const exchangeRates = await fetchLiveExchangeRates();

  const serverPreferences = {
    country:
      cookieStore.get("preferred-country")?.value ??
      cookieStore.get("country-detected")?.value ??
      "US",
    currency: (cookieStore.get("preferred-currency")?.value ?? "USD") as CurrencyCode,
    locale: (cookieStore.get("preferred-locale")?.value ??
      cookieStore.get("NEXT_LOCALE")?.value ??
      locale) as Locale,
  };

  const displayPrefs: DisplayPreferences = {
    country: serverPreferences.country,
    currency: serverPreferences.currency,
    locale: locale as Locale,
    exchangeRates,
  };

  return (
    <div lang={locale} dir={dir}>
      <NextIntlClientProvider messages={messages}>
        <DisplayPreferencesProvider value={displayPrefs}>
          <LocaleInitializer
            locale={locale as Locale}
            serverPreferences={serverPreferences}
          />
          {children}
        </DisplayPreferencesProvider>
      </NextIntlClientProvider>
    </div>
  );
}
