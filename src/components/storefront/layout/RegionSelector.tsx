"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Globe, ChevronDown } from "lucide-react";
import {
  useCountry,
  useCurrency,
  useLocaleStore,
} from "@/stores/locale-store";
import {
  countries,
  currencies,
  localeConfig,
  type Locale,
  type CurrencyCode,
  type LanguageEntry,
} from "@/config/locales";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ds/dropdown";
import { cn } from "@/components/ds/utils";

function setPrefCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=${60 * 60 * 24 * 365}`;
}

const triggerClass =
  "inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const triggerClassDefault =
  "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-small font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function RegionSelector({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("header");
  const routeLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [enabledLanguages, setEnabledLanguages] = useState<LanguageEntry[]>([]);

  useEffect(() => {
    fetch("/api/v1/settings/languages")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.languages) {
          setEnabledLanguages(
            d.data.languages.filter((l: LanguageEntry) => l.enabled !== false)
          );
        }
      })
      .catch(() => {});
  }, []);

  const languageOptions =
    enabledLanguages.length > 0
      ? enabledLanguages
      : Object.entries(localeConfig).map(([code, meta]) => ({
          code,
          label: meta.label,
          nativeLabel: meta.nativeLabel,
          dir: meta.dir,
          enabled: true,
        }));

  const country = useCountry();
  const currency = useCurrency();
  const setCountry = useLocaleStore((s) => s.setCountry);
  const setCurrency = useLocaleStore((s) => s.setCurrency);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const currentCountry =
    countries.find((c) => c.code === country) ?? countries[0];

  const switchLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    setPrefCookie("preferred-locale", newLocale);
    router.replace(pathname, { locale: newLocale });
  };

  const switchCountry = (code: string) => {
    const c = countries.find((x) => x.code === code);
    if (!c) return;
    setCountry(code);
    setPrefCookie("preferred-country", code);
    setPrefCookie("preferred-currency", c.currency);
    switchLocale(c.defaultLocale);
  };

  const switchCurrency = (code: CurrencyCode) => {
    setCurrency(code);
    setPrefCookie("preferred-currency", code);
  };

  const trigger = compact ? `${triggerClass} h-7` : triggerClassDefault;

  return (
    <div className="flex items-center gap-0.5">
      <DropdownMenu>
        <DropdownMenuTrigger className={trigger}>
          <span aria-hidden>{currentCountry.flag}</span>
          <span className="hidden sm:inline max-w-[80px] truncate">{currentCountry.code}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t("selectCountry")}</DropdownMenuLabel>
          {countries.map((c) => (
            <DropdownMenuItem
              key={c.code}
              onClick={() => switchCountry(c.code)}
              className={cn(country === c.code && "bg-secondary")}
            >
              <span>{c.flag}</span>
              <span className="flex-1">{c.name}</span>
              <span className="text-muted-foreground">{c.currency}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className={trigger}>
          <Globe className="h-3 w-3" />
          {!compact && (
            <span>{localeConfig[routeLocale]?.nativeLabel ?? routeLocale}</span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t("selectLanguage")}</DropdownMenuLabel>
          {languageOptions.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => switchLocale(lang.code as Locale)}
              className={cn(routeLocale === lang.code && "bg-secondary")}
            >
              {lang.nativeLabel ?? localeConfig[lang.code]?.nativeLabel ?? lang.code}
              {routeLocale === lang.code && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className={trigger}>
          <span>{currency}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t("selectCurrency")}</DropdownMenuLabel>
          {currencies.map((c) => (
            <DropdownMenuItem
              key={c.code}
              onClick={() => switchCurrency(c.code as CurrencyCode)}
              className={cn(currency === c.code && "bg-secondary")}
            >
              <span>{c.symbol}</span>
              <span>{c.code}</span>
              {currency === c.code && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
