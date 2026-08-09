const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const LOCALE_STORAGE_KEY = "locale-preferences";

export type PreferencePatch = {
  country?: string;
  currency?: string;
  locale?: string;
};

export type ApplyPreferenceOptions = {
  pathname?: string;
  /** Deliver-to: set currency from country and clear manual-currency override. */
  syncCurrencyToCountry?: boolean;
};

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=;path=/;max-age=0;SameSite=Lax`;
}

/** Keep zustand persist aligned with cookies so rehydrate never wins over a fresh selection. */
function syncLocaleStorage(patch: PreferencePatch) {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      state?: Record<string, unknown>;
      version?: number;
    };
    const nextState = { ...(parsed.state ?? {}), ...patch };
    localStorage.setItem(
      LOCALE_STORAGE_KEY,
      JSON.stringify({ ...parsed, state: nextState })
    );
  } catch {
    /* ignore corrupt storage */
  }
}

export function buildLocalePath(locale: string, pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (path === "/") return `/${locale}`;
  return `/${locale}${path}`;
}

/**
 * Persist preference cookies (+ localStorage) then hard-navigate so the whole
 * page reflects the new country, currency, or language immediately.
 */
export function applyPreferenceChange(
  patch: PreferencePatch,
  options?: ApplyPreferenceOptions
) {
  if (patch.country !== undefined) {
    setCookie("preferences-manual-country", "true");
    setCookie("preferred-country", patch.country);
    setCookie("country-detected", patch.country);
  }

  if (options?.syncCurrencyToCountry && patch.currency !== undefined) {
    setCookie("preferred-currency", patch.currency);
    clearCookie("preferences-manual-currency");
  } else if (patch.currency !== undefined) {
    setCookie("preferences-manual-currency", "true");
    setCookie("preferred-currency", patch.currency);
  }

  if (patch.locale !== undefined) {
    setCookie("preferences-manual-locale", "true");
    setCookie("preferred-locale", patch.locale);
    setCookie("NEXT_LOCALE", patch.locale);
  }

  syncLocaleStorage({
    ...(patch.country !== undefined ? { country: patch.country } : {}),
    ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
    ...(patch.locale !== undefined ? { locale: patch.locale } : {}),
  });

  if (patch.locale !== undefined && options?.pathname !== undefined) {
    window.location.assign(buildLocalePath(patch.locale, options.pathname));
    return;
  }

  window.location.reload();
}
