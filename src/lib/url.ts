/**
 * Central URL helpers for the application.
 *
 * – `getSiteUrl()` returns the canonical site URL (server-side SITE_URL takes priority).
 * – `toAbsoluteUrl(path)` converts relative paths to absolute URLs.
 * – `isInternalUrl(url)` validates a URL belongs to our configured domain.
 */

/**
 * Returns the canonical site URL.
 * Server-side: prefers SITE_URL, falls back to NEXT_PUBLIC_APP_URL.
 * Always strips trailing slashes.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/**
 * Converts a relative path to an absolute URL using the canonical site URL.
 *
 * - `/products/leather-bag` → `https://findora.market/products/leather-bag`
 * - `products/leather-bag`  → `https://findora.market/products/leather-bag`
 * - Already absolute URL with same origin → returned as-is
 * - Preserves existing query parameters and hash fragments
 */
export function toAbsoluteUrl(path: string): string {
  if (!path) return getSiteUrl();

  const base = getSiteUrl();

  // Already an absolute URL
  if (/^https?:\/\//i.test(path)) {
    // Validate it's our domain or return as-is (external URLs are OK for product images etc.)
    return path;
  }

  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  try {
    const url = new URL(normalizedPath, base);
    return url.toString();
  } catch {
    // Fallback: simple concatenation
    return `${base}${normalizedPath}`;
  }
}

/**
 * Validates that a URL belongs to our configured site domain.
 * Used to prevent open redirects in tracking endpoints.
 */
export function isInternalUrl(url: string): boolean {
  const base = getSiteUrl();
  try {
    const parsed = new URL(url, base);
    const baseParsed = new URL(base);
    return parsed.origin === baseParsed.origin;
  } catch {
    return false;
  }
}
