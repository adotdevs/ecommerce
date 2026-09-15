/**
 * Central URL helpers for the application.
 *
 * – `getSiteUrl()` returns the canonical site URL with smart production/client resolution.
 * – `getRequestSiteUrl(req)` extracts the active site URL from an incoming HTTP request.
 * – `toAbsoluteUrl(path, customBase)` converts relative paths to absolute URLs and cleans accidental localhost origins.
 * – `isInternalUrl(url, customBase)` validates a URL belongs to our configured domain.
 */

import type { NextRequest } from "next/server";

/**
 * Returns the canonical site URL.
 * 1. In the browser (client-side): returns window.location.origin.
 * 2. Server-side: prefers explicit non-localhost SITE_URL / NEXT_PUBLIC_APP_URL,
 *    then Vercel production domains, then fallback.
 * Always strips trailing slashes.
 */
export function getSiteUrl(): string {
  // 1. In browser environment (client-side):
  // window.location.origin is always the exact live origin the user is currently browsing.
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin.trim();
    if (origin) {
      return origin.replace(/\/+$/, "");
    }
  }

  const isProd = process.env.NODE_ENV === "production";
  const envSiteUrl = process.env.SITE_URL?.trim();
  const envPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  // 2. Explicit server environment variables (if real domain, or in dev)
  if (envSiteUrl && (!isProd || (!envSiteUrl.includes("localhost") && !envSiteUrl.includes("127.0.0.1")))) {
    return envSiteUrl.replace(/\/+$/, "");
  }
  if (envPublicAppUrl && (!isProd || (!envPublicAppUrl.includes("localhost") && !envPublicAppUrl.includes("127.0.0.1")))) {
    return envPublicAppUrl.replace(/\/+$/, "");
  }

  // 3. Vercel deployment automatic environment variables
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) {
    const host = process.env.VERCEL_PROJECT_PRODUCTION_URL.trim().replace(/\/+$/, "");
    return `https://${host}`;
  }
  if (process.env.VERCEL_URL?.trim()) {
    const host = process.env.VERCEL_URL.trim().replace(/\/+$/, "");
    return `https://${host}`;
  }

  // 4. Fallback when env vars were specified:
  if (envSiteUrl && (!isProd || (!envSiteUrl.includes("localhost") && !envSiteUrl.includes("127.0.0.1")))) {
    return envSiteUrl.replace(/\/+$/, "");
  }
  if (envPublicAppUrl && (!isProd || (!envPublicAppUrl.includes("localhost") && !envPublicAppUrl.includes("127.0.0.1")))) {
    return envPublicAppUrl.replace(/\/+$/, "");
  }

  // In production if no host configured or env vars are localhost, fallback to canonical store domain
  if (isProd) {
    return "https://findora.market";
  }

  return envSiteUrl || envPublicAppUrl || "http://localhost:3000";
}

/**
 * Extracts the active site URL from an incoming Next.js / Fetch request headers.
 * Useful in API route handlers and Server Actions to guarantee the exact domain used by the client.
 */
export function getRequestSiteUrl(request?: Request | NextRequest | null): string {
  if (request) {
    try {
      const headers = "headers" in request ? request.headers : null;
      if (headers) {
        const proto = headers.get("x-forwarded-proto") || "https";
        const host = headers.get("x-forwarded-host") || headers.get("host");
        if (host) {
          const cleanHost = host.split(",")[0].trim();
          if (cleanHost) {
            return `${proto}://${cleanHost}`.replace(/\/+$/, "");
          }
        }
      }
      if ("nextUrl" in request && (request as NextRequest).nextUrl?.origin) {
        const origin = (request as NextRequest).nextUrl.origin.replace(/\/+$/, "");
        if (origin && !origin.includes("localhost:3000")) {
          return origin;
        }
      }
    } catch {
      // ignore and fallback
    }
  }
  return getSiteUrl();
}

/**
 * Converts a relative path to an absolute URL using the canonical site URL.
 *
 * - `/products/leather-bag` → `https://findora.market/products/leather-bag`
 * - `brand/coco1.png`       → `https://findora.market/brand/coco1.png`
 * - `http://localhost:3000/brand/coco1.png` (in production) → rewritten to `https://findora.market/brand/coco1.png`
 */
export function toAbsoluteUrl(path: string, customBase?: string): string {
  const base = (customBase || getSiteUrl()).replace(/\/+$/, "");
  if (!path) return base;

  const baseIsLocalhost = base.includes("localhost") || base.includes("127.0.0.1");

  // Check if already an absolute URL
  if (/^https?:\/\//i.test(path)) {
    try {
      const parsed = new URL(path);
      // If path was saved with localhost in dev but we are in production / live domain, rewrite origin
      if ((parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && !baseIsLocalhost) {
        return `${base}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      return path;
    } catch {
      return path;
    }
  }

  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  try {
    const url = new URL(normalizedPath, base);
    return url.toString();
  } catch {
    return `${base}${normalizedPath}`;
  }
}

/**
 * Validates that a URL belongs to our configured site domain.
 * Used to prevent open redirects in tracking endpoints.
 */
export function isInternalUrl(url: string, customBase?: string): boolean {
  const base = (customBase || getSiteUrl()).replace(/\/+$/, "");
  try {
    const parsed = new URL(url, base);
    const baseParsed = new URL(base);
    return parsed.hostname === baseParsed.hostname;
  } catch {
    return false;
  }
}

