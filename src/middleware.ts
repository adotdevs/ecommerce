import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import {
  detectLocaleFromCountry,
  detectLocaleFromAcceptLanguage,
  getCountryByCode,
} from "@/config/locales";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip i18n for admin and API
  if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
    if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
      const token = request.cookies.get("access_token")?.value;
      if (!token) {
        return NextResponse.redirect(
          new URL("/en/login?redirect=/admin", request.url)
        );
      }
    }
    return NextResponse.next();
  }

  const response = intlMiddleware(request);

  // Geo detection on first visit
  const countryHeader =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    "US";

  if (!request.cookies.get("country-detected")) {
    const country = getCountryByCode(countryHeader) ? countryHeader : "US";
    const countryConfig = getCountryByCode(country);
    const acceptLang = request.headers.get("accept-language");
    const locale =
      detectLocaleFromAcceptLanguage(acceptLang) ||
      detectLocaleFromCountry(country);

    response.cookies.set("country-detected", country, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    response.cookies.set("preferred-country", country, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    response.cookies.set(
      "preferred-currency",
      countryConfig?.currency ?? "USD",
      { path: "/", maxAge: 60 * 60 * 24 * 365 }
    );
    response.cookies.set("preferred-locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand).*)"],
};
