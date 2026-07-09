import type { IpApiResult } from "./types";

const IP_API_FIELDS = "status,countryCode,currency,query";
const IP_API_TIMEOUT_MS = 4000;

function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "unknown") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.")) {
    return true;
  }
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  return false;
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip && !isPrivateOrLocalIp(ip)) return ip;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && !isPrivateOrLocalIp(realIp)) return realIp;

  // Next.js / Vercel
  const vercelIp = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercelIp && !isPrivateOrLocalIp(vercelIp)) return vercelIp;

  return null;
}

export async function fetchGeoFromIpApi(ip: string): Promise<IpApiResult | null> {
  if (isPrivateOrLocalIp(ip)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IP_API_TIMEOUT_MS);

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${IP_API_FIELDS}`,
      { signal: controller.signal, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as IpApiResult;
    if (data.status !== "success" || !data.countryCode) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface IpapiCoResult {
  country_code?: string;
  currency?: string;
  error?: boolean;
}

/** HTTPS fallback when ip-api.com is unavailable. */
export async function fetchGeoFromIpapiCo(ip: string): Promise<IpApiResult | null> {
  if (isPrivateOrLocalIp(ip)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IP_API_TIMEOUT_MS);

  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as IpapiCoResult;
    if (data.error || !data.country_code) return null;
    return {
      status: "success",
      countryCode: data.country_code,
      currency: data.currency,
      query: ip,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchGeoByIp(ip: string): Promise<IpApiResult | null> {
  return (await fetchGeoFromIpApi(ip)) ?? (await fetchGeoFromIpapiCo(ip));
}
