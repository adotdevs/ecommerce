"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Globe, ChevronDown, MapPin } from "lucide-react";
import { useDisplayPreferences } from "@/components/providers/DisplayPreferencesContext";
import { CountryFlag } from "@/components/ui/CountryFlag";
import {
  currencies,
  getCountryByCode,
  getCurrencyCountryCode,
  getCurrencyMeta,
  getSortedCountries,
  localeConfig,
  type CurrencyCode,
  type Locale,
  type LanguageEntry,
} from "@/config/locales";
import { applyPreferenceChange } from "@/lib/preferences/apply-change";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ds/dropdown";
import { cn } from "@/components/ds/utils";

function useLanguageOptions() {
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

  return useMemo(
    () =>
      languageOptions.length > 0
        ? languageOptions
        : Object.entries(localeConfig).map(([code, meta]) => ({
            code,
            label: meta.label,
            nativeLabel: meta.nativeLabel,
            dir: meta.dir,
            enabled: true,
          })),
    [languageOptions]
  );
}

function useRegionState() {
  const { country: countryCode, currency } = useDisplayPreferences();

  const activeCountry = useMemo(
    () => getCountryByCode(countryCode) ?? getCountryByCode("US")!,
    [countryCode]
  );

  const regionOptions = useMemo(() => getSortedCountries(), []);

  const switchCountry = (code: string) => {
    const country = getCountryByCode(code);
    if (!country) return;
    if (code === countryCode && country.currency === currency) return;
    applyPreferenceChange(
      { country: code, currency: country.currency },
      { syncCurrencyToCountry: true }
    );
  };

  return { activeCountry, countryCode, regionOptions, switchCountry };
}

function useCurrencyState() {
  const { currency } = useDisplayPreferences();

  const switchCurrency = (code: CurrencyCode) => {
    if (code === currency) return;
    applyPreferenceChange({ currency: code });
  };

  return { currency, switchCurrency };
}

function CountryCurrencyMenu({
  align = "start",
  children,
}: {
  align?: "start" | "end" | "center";
  children: React.ReactNode;
}) {
  const t = useTranslations("header");
  const { countryCode, regionOptions, switchCountry } = useRegionState();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[16rem]">
        <DropdownMenuLabel className="sticky top-0 z-10 -mx-2 bg-popover px-4">
          {t("selectCountry")}
        </DropdownMenuLabel>
        {regionOptions.map((c) => {
          const meta = getCurrencyMeta(c.currency);
          const isActive = countryCode === c.code;
          return (
            <DropdownMenuItem
              key={c.code}
              onClick={() => switchCountry(c.code)}
              className={cn("items-start gap-3 py-2.5", isActive && "bg-secondary")}
            >
              <CountryFlag countryCode={c.code} size="md" className="mt-0.5" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground">
                  {c.name}
                </span>
                <span className="block text-[12px] text-muted-foreground">
                  {c.currency}
                  {meta?.symbol ? ` · ${meta.symbol}` : ""}
                </span>
              </span>
              {isActive && (
                <span className="ml-auto shrink-0 self-center text-primary">✓</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Amazon-style “Deliver to [Country]” in the main header. */
export function DeliverToSelector({
  className,
  align = "start",
}: {
  className?: string;
  align?: "start" | "end" | "center";
}) {
  const t = useTranslations("header");
  const { activeCountry } = useRegionState();

  return (
    <CountryCurrencyMenu align={align}>
      <button
        type="button"
        className={cn(
          "group flex max-w-[6rem] items-start gap-1.5 rounded-[var(--radius-sm)] px-1.5 py-1 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[9.5rem] sm:gap-2 sm:px-2 sm:py-1.5 md:max-w-[11rem]",
          className
        )}
        aria-label={`${t("deliverTo")} ${activeCountry.name}`}
      >
        <MapPin
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground sm:h-[18px] sm:w-[18px]"
          strokeWidth={2}
          aria-hidden
        />
        <span className="min-w-0 leading-tight">
          <span className="hidden text-[11px] text-muted-foreground sm:block">
            {t("deliverTo")}
          </span>
          <span className="flex items-center gap-1 truncate text-[12px] font-semibold text-foreground sm:text-[13px]">
            <CountryFlag
              countryCode={activeCountry.code}
              size="sm"
              className="shrink-0 sm:hidden"
            />
            <span className="hidden truncate sm:inline">{activeCountry.name}</span>
            <span className="truncate sm:hidden">{activeCountry.code}</span>
            <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 opacity-60 sm:block" aria-hidden />
          </span>
        </span>
      </button>
    </CountryCurrencyMenu>
  );
}

/** Compact deliver-to row for mobile drawer. */
export function DeliverToSelectorMobile() {
  const t = useTranslations("header");
  const { activeCountry } = useRegionState();

  return (
    <CountryCurrencyMenu align="start">
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-secondary/40 px-3 py-2.5 text-left transition-colors hover:bg-secondary"
        aria-label={`${t("deliverTo")} ${activeCountry.name}`}
      >
        <CountryFlag countryCode={activeCountry.code} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-muted-foreground">
            {t("deliverTo")}
          </span>
          <span className="block truncate text-sm font-semibold text-foreground">
            {activeCountry.name}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
      </button>
    </CountryCurrencyMenu>
  );
}

function CurrencyMenu({
  align = "start",
  children,
}: {
  align?: "start" | "end" | "center";
  children: React.ReactNode;
}) {
  const t = useTranslations("header");
  const { currency, switchCurrency } = useCurrencyState();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[14rem]">
        <DropdownMenuLabel className="sticky top-0 z-10 -mx-2 bg-popover px-4">
          {t("selectCurrency")}
        </DropdownMenuLabel>
        {currencies.map((c) => {
          const isActive = currency === c.code;
          return (
            <DropdownMenuItem
              key={c.code}
              onClick={() => switchCurrency(c.code)}
              className={cn("items-center gap-3 py-2.5", isActive && "bg-secondary")}
            >
              <CountryFlag countryCode={getCurrencyCountryCode(c.code)} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-foreground">{c.code}</span>
                <span className="block text-[12px] text-muted-foreground">
                  {c.symbol}
                </span>
              </span>
              {isActive && (
                <span className="ml-auto shrink-0 text-primary">✓</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Separate currency picker with flag — independent from delivery country. */
export function CurrencySelector({
  className,
  align = "start",
  compact = false,
  topBar = false,
}: {
  className?: string;
  align?: "start" | "end" | "center";
  compact?: boolean;
  topBar?: boolean;
}) {
  const t = useTranslations("header");
  const { currency } = useCurrencyState();
  const meta = getCurrencyMeta(currency);
  const currencyCountryCode = getCurrencyCountryCode(currency);

  const triggerClass = topBar
    ? "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-[12px] font-medium transition-colors hover:bg-background/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    : compact
      ? "inline-flex h-8 max-w-[5rem] items-center gap-1 rounded-[var(--radius-sm)] px-1.5 text-[12px] font-medium transition-colors hover:bg-background/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[5.5rem] sm:gap-1.5 sm:px-2"
      : "inline-flex h-9 max-w-[5.5rem] items-center gap-1 rounded-[var(--radius-sm)] px-1.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[6.5rem] sm:gap-1.5 sm:px-2";

  return (
    <CurrencyMenu align={align}>
      <button
        type="button"
        className={cn(triggerClass, className)}
        aria-label={`${t("selectCurrency")}: ${currency}`}
      >
        <CountryFlag
          countryCode={currencyCountryCode}
          size={topBar ? "sm" : "sm"}
          className="shrink-0"
        />
        <span className="shrink-0">{currency}</span>
        {(topBar || !compact) && meta?.symbol && (
          <span
            className={cn(
              "shrink-0",
              topBar ? "hidden opacity-80 sm:inline" : "hidden text-muted-foreground sm:inline"
            )}
          >
            {meta.symbol}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
      </button>
    </CurrencyMenu>
  );
}

/** Full-width currency row for mobile drawer. */
export function CurrencySelectorMobile() {
  const t = useTranslations("header");
  const { currency } = useCurrencyState();
  const meta = getCurrencyMeta(currency);
  const currencyCountryCode = getCurrencyCountryCode(currency);

  return (
    <CurrencyMenu align="start">
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-secondary/40 px-3 py-2.5 text-left transition-colors hover:bg-secondary"
        aria-label={`${t("selectCurrency")}: ${currency}`}
      >
        <CountryFlag countryCode={currencyCountryCode} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-muted-foreground">
            {t("currency")}
          </span>
          <span className="block truncate text-sm font-semibold text-foreground">
            {currency}
            {meta?.symbol ? ` · ${meta.symbol}` : ""}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
      </button>
    </CurrencyMenu>
  );
}

/** Language picker — kept separate from country/currency. */
export function LanguageSelector({
  compact = false,
  align = "end",
}: {
  compact?: boolean;
  align?: "start" | "end" | "center";
}) {
  const t = useTranslations("header");
  const routeLocale = useLocale() as Locale;
  const pathname = usePathname();
  const langs = useLanguageOptions();

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === routeLocale) return;
    applyPreferenceChange({ locale: newLocale }, { pathname });
  };

  const triggerClass = compact
    ? "inline-flex h-8 max-w-[9rem] items-center gap-1 rounded-[var(--radius-sm)] px-1.5 text-[12px] font-medium transition-colors hover:bg-background/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-none sm:gap-1.5 sm:px-2"
    : "inline-flex h-9 max-w-[12rem] items-center gap-2 rounded-[var(--radius-sm)] px-2.5 text-small font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-none";

  const languageLabel =
    localeConfig[routeLocale]?.nativeLabel ??
    localeConfig[routeLocale]?.label ??
    routeLocale;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass} aria-label={t("selectLanguage")}>
        <Globe className="h-5 w-5 shrink-0" strokeWidth={2.25} />
        {!compact && <span className="truncate">{languageLabel}</span>}
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" strokeWidth={2.25} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[14rem]">
        <DropdownMenuLabel className="sticky top-0 z-10 -mx-2 bg-popover px-4">
          {t("selectLanguage")}
        </DropdownMenuLabel>
        {langs.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLocale(lang.code as Locale)}
            className={cn(routeLocale === lang.code && "bg-secondary")}
          >
            <span className="min-w-0 flex-1 truncate">
              {lang.nativeLabel ??
                localeConfig[lang.code]?.nativeLabel ??
                lang.label ??
                lang.code}
            </span>
            {routeLocale === lang.code && (
              <span className="ml-auto shrink-0 text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Mobile drawer: deliver-to, currency, and language stacked. */
export function RegionSelector() {
  return (
    <div className="space-y-3">
      <DeliverToSelectorMobile />
      <CurrencySelectorMobile />
      <LanguageSelector align="start" />
    </div>
  );
}

/** Top bar: currency + language (deliver-to lives in main navbar). */
export function TopBarCurrencySelector() {
  return <CurrencySelector topBar align="end" />;
}

export function TopBarLocaleSelector() {
  return <LanguageSelector compact align="end" />;
}

export function TopBarPreferences() {
  return (
    <>
      <TopBarCurrencySelector />
      <div className="mx-0.5 h-5 w-px bg-background/20" />
      <TopBarLocaleSelector />
    </>
  );
}
