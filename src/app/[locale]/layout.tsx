import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { localeConfig, type Locale } from "@/config/locales";
import { LocaleInitializer } from "@/components/providers/LocaleInitializer";

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

  return (
    <div lang={locale} dir={dir}>
      <NextIntlClientProvider messages={messages}>
        <LocaleInitializer locale={locale as Locale} />
        {children}
      </NextIntlClientProvider>
    </div>
  );
}
