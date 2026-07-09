"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Globe, ChevronDown } from "lucide-react";
import { useCurrency, useLocaleStore } from "@/stores/locale-store";
import {
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
  const [languageOptions, setLanguageOptions] = useState<LanguageEntry[]>([]);

  useEffect(() => {
    fetch("/api/v1/settings/languages")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.languages) {
          setLanguageOptions(
            d.data.languages.filter((l: LanguageEntry) => l.enabled !== false)
          );
        }
      })
      .catch(() => {});
  }, []);

  const currency = useCurrency();
  const setLocale = useLocaleStore((s) => s.setLocale);
  const setCurrency = useLocaleStore((s) => s.setCurrency);

  const switchLocale = (newLocale: Locale) => {
    setPrefCookie("preferences-manual-locale", "true");
    setPrefCookie("preferred-locale", newLocale);
    setLocale(newLocale);
    router.replace(pathname, { locale: newLocale });
  };

  const switchCurrency = (code: CurrencyCode) => {
    setPrefCookie("preferences-manual-currency", "true");
    setCurrency(code);
    setPrefCookie("preferred-currency", code);
  };

  const langs =
    languageOptions.length > 0
      ? languageOptions
      : Object.entries(localeConfig).map(([code, meta]) => ({
          code,
          label: meta.label,
          nativeLabel: meta.nativeLabel,
          dir: meta.dir,
          enabled: true,
        }));

  const trigger = compact ? `${triggerClass} h-7` : triggerClassDefault;

  return (
    <div className="flex items-center gap-0.5">
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
          {langs.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => switchLocale(lang.code as Locale)}
              className={cn(routeLocale === lang.code && "bg-secondary")}
            >
              {lang.nativeLabel ??
                localeConfig[lang.code]?.nativeLabel ??
                lang.code}
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
