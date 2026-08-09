import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { routing } from "@/i18n/routing";
import { localeConfig, type Locale } from "@/config/locales";
import { LocaleInitializer } from "@/components/providers/LocaleInitializer";
import { FirstVisitTracker } from "@/components/storefront/tracking/FirstVisitTracker";
import {
  DisplayPreferencesProvider,
  type DisplayPreferences,
} from "@/components/providers/DisplayPreferencesContext";
import type { CurrencyCode } from "@/config/locales";
import { fetchLiveExchangeRates } from "@/lib/currency/live-rates";

export const dynamic = "force-dynamic";

function readPrefCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  name: string
): string | undefined {
  const raw = cookieStore.get(name)?.value;
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

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
      readPrefCookie(cookieStore, "preferred-country") ??
      readPrefCookie(cookieStore, "country-detected") ??
      "US",
    currency: (readPrefCookie(cookieStore, "preferred-currency") ??
      "USD") as CurrencyCode,
    locale: (readPrefCookie(cookieStore, "preferred-locale") ??
      readPrefCookie(cookieStore, "NEXT_LOCALE") ??
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
          <FirstVisitTracker />
          {children}
        </DisplayPreferencesProvider>
      </NextIntlClientProvider>
    </div>
  );
}
