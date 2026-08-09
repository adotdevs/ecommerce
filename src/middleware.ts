import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { decodeAccessTokenPayload } from "@/lib/auth/decode-token";
import { hasAnyAdminRole, isCustomerUser } from "@/lib/auth/roles";
import { currencyFromCountry } from "@/lib/geo/country-preferences";
import { GEO_COOKIE_VERSION } from "@/lib/geo/constants";
import {
  resolveGeoPreferences,
  buildPreferencesFromCookies,
  isManualLocale,
  isManualCurrency,
  isManualCountry,
  isGeoReady,
} from "@/lib/geo/resolve-preferences";

const intlMiddleware = createMiddleware(routing);

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function setPreferenceCookies(
  response: NextResponse,
  prefs: { country: string; currency: string; locale: string },
  manualLocale: boolean
) {
  response.cookies.set("geo-preferences-set", "1", {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  response.cookies.set("geo-version", GEO_COOKIE_VERSION, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  response.cookies.set("country-detected", prefs.country, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  response.cookies.set("preferred-country", prefs.country, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  response.cookies.set("preferred-currency", prefs.currency, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  if (!manualLocale) {
    response.cookies.set("preferred-locale", prefs.locale, {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
    response.cookies.set("NEXT_LOCALE", prefs.locale, {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  }
}

function getPathnameLocale(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first && routing.locales.includes(first)) return first;
  return null;
}

function stripLocaleFromPathname(pathname: string, locale: string | null): string {
  if (!locale) return pathname;
  const stripped = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "") || "/";
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

function buildLocalizedPath(
  locale: string,
  pathname: string,
  pathnameLocale: string | null
): string {
  const pathWithoutLocale = stripLocaleFromPathname(pathname, pathnameLocale);
  return pathWithoutLocale === "/"
    ? `/${locale}`
    : `/${locale}${pathWithoutLocale}`;
}

function isAccountPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return false;
  const [locale, section] = segments;
  return routing.locales.includes(locale as (typeof routing.locales)[number]) && section === "account";
}

function getLocaleFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first && routing.locales.includes(first as (typeof routing.locales)[number])) {
    return first;
  }
  return routing.defaultLocale;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  const authUser = token ? decodeAccessTokenPayload(token) : null;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
    if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
      if (!authUser) {
        const locale = routing.defaultLocale;
        return NextResponse.redirect(
          new URL(`/${locale}/login?redirect=/admin`, request.url)
        );
      }
      if (!hasAnyAdminRole(authUser.roles)) {
        const locale = routing.defaultLocale;
        return NextResponse.redirect(
          new URL(`/${locale}/account`, request.url)
        );
      }
    }
    return NextResponse.next();
  }

  if (isAccountPath(pathname)) {
    const locale = getLocaleFromPath(pathname);
    if (!authUser) {
      return NextResponse.redirect(
        new URL(`/${locale}/login?redirect=/${locale}/account`, request.url)
      );
    }
    if (!isCustomerUser(authUser.roles)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  const manualLocale = isManualLocale(request);
  const manualCurrency = isManualCurrency(request);
  const manualCountry = isManualCountry(request);
  const geoReady = isGeoReady(request);
  const pathnameLocale = getPathnameLocale(pathname);

  let prefs = geoReady
    ? buildPreferencesFromCookies(
        request,
        manualLocale,
        manualCurrency,
        manualCountry
      )
    : await resolveGeoPreferences(request);

  if (geoReady && !manualCurrency && !manualCountry) {
    prefs = { ...prefs, currency: currencyFromCountry(prefs.country) };
  }

  const targetLocale = prefs.locale;

  if (!pathnameLocale) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = buildLocalizedPath(targetLocale, pathname, null);
    const response = NextResponse.redirect(redirectUrl);
    setPreferenceCookies(response, prefs, manualLocale);
    return response;
  }

  if (!manualLocale && pathnameLocale !== targetLocale) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = buildLocalizedPath(
      targetLocale,
      pathname,
      pathnameLocale
    );
    const response = NextResponse.redirect(redirectUrl);
    setPreferenceCookies(response, prefs, manualLocale);
    return response;
  }

  const response = intlMiddleware(request);

  if (!geoReady) {
    setPreferenceCookies(response, prefs, manualLocale);
  } else {
    if (!manualCountry) {
      response.cookies.set("preferred-country", prefs.country, {
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
      response.cookies.set("country-detected", prefs.country, {
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
    }
    if (!manualCurrency) {
      response.cookies.set("preferred-currency", prefs.currency, {
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
    }
    if (!manualLocale) {
      response.cookies.set("preferred-locale", prefs.locale, {
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
      response.cookies.set("NEXT_LOCALE", prefs.locale, {
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
    }
  }

  if (pathnameLocale) {
    response.cookies.set("NEXT_LOCALE", pathnameLocale, {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand|payments).*)"],
};
