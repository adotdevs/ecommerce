/** Hostnames allowed for next/image optimization (must match next.config.ts). */
const OPTIMIZED_HOSTS = new Set([
  "images.unsplash.com",
  "plus.unsplash.com",
  "source.unsplash.com",
  "res.cloudinary.com",
]);

function hostnameMatchesPattern(hostname: string, pattern: string): boolean {
  if (pattern === hostname) return true;
  if (pattern.startsWith("**.")) {
    const root = pattern.slice(3);
    return hostname === root || hostname.endsWith(`.${root}`);
  }
  if (pattern.startsWith("*.")) {
    const root = pattern.slice(2);
    const suffix = `.${root}`;
    if (!hostname.endsWith(suffix)) return false;
    const prefix = hostname.slice(0, -suffix.length);
    return prefix.length > 0 && !prefix.includes(".");
  }
  return false;
}

const OPTIMIZED_HOST_PATTERNS = [
  "**.public.blob.vercel-storage.com",
  "**.gsmarena.com",
  "**.amazonaws.com",
  "**.media-amazon.com",
  "**.ssl-images-amazon.com",
  "**.images-amazon.com",
  "**.googleusercontent.com",
  "**.wikimedia.org",
];

/** Same-origin /public files — do not send through /_next/image. */
export function isLocalPublicSrc(src: string): boolean {
  if (!src) return false;
  let clean = src.trim();
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(clean)) {
    clean = clean.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, "");
  }
  if (clean.startsWith("brand/") || clean.startsWith("uploads/") || clean.startsWith("images/")) {
    clean = `/${clean}`;
  }
  return clean.startsWith("/") && !clean.startsWith("//");
}

/**
 * Whether to use next/image optimization.
 * Local `/brand/...` (and other public) paths use a plain <img> — the live
 * optimizer often 400s while the raw file URL still works (e.g. magnifier).
 */
export function shouldUseNextImage(src: string): boolean {
  if (!src) return false;
  if (isLocalPublicSrc(src)) return false;

  try {
    const { hostname, protocol } = new URL(src);
    if (protocol !== "http:" && protocol !== "https:") return false;
    if (OPTIMIZED_HOSTS.has(hostname)) return true;
    return OPTIMIZED_HOST_PATTERNS.some((pattern) =>
      hostnameMatchesPattern(hostname, pattern)
    );
  } catch {
    return false;
  }
}
