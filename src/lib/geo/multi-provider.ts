import type { NextRequest } from "next/server";
import type { GeoProbe } from "./types";

const PROBE_TIMEOUT_MS = 4500;

function normalizeCountry(code: string | null | undefined): string | null {
  if (!code || code.length !== 2 || code === "XX" || code === "T1") return null;
  return code.toUpperCase();
}

function normalizeCurrency(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  const upper = code.toUpperCase();
  return upper.length === 3 ? upper : undefined;
}

async function withTimeout<T>(promise: Promise<T>, ms = PROBE_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("geo probe timeout")), ms)
    ),
  ]);
}

function probe(source: string, countryCode: string, currency?: string): GeoProbe {
  return {
    source,
    countryCode: countryCode.toUpperCase(),
    currency: normalizeCurrency(currency),
  };
}

/** CDN / edge headers — instant, no network. */
export function probeCdnHeaders(request: NextRequest): GeoProbe[] {
  const probes: GeoProbe[] = [];
  const headers: Array<[string, string]> = [
    ["x-vercel-ip-country", "vercel-cdn"],
    ["cf-ipcountry", "cloudflare-cdn"],
    ["cloudfront-viewer-country", "cloudfront-cdn"],
    ["x-country-code", "edge-country"],
  ];

  for (const [header, source] of headers) {
    const cc = normalizeCountry(request.headers.get(header));
    if (cc) probes.push(probe(source, cc));
  }

  return probes;
}

export async function fetchGeoFromIpApi(ip: string): Promise<GeoProbe | null> {
  try {
    const res = await withTimeout(
      fetch(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,currency`,
        { cache: "no-store" }
      )
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      countryCode?: string;
      currency?: string;
    };
    const cc = normalizeCountry(data.countryCode);
    if (data.status !== "success" || !cc) return null;
    return probe("ip-api.com", cc, data.currency);
  } catch {
    return null;
  }
}

export async function fetchGeoFromIpapiCo(ip?: string): Promise<GeoProbe | null> {
  try {
    const url = ip
      ? `https://ipapi.co/${encodeURIComponent(ip)}/json/`
      : "https://ipapi.co/json/";
    const res = await withTimeout(
      fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      country_code?: string;
      currency?: string;
      error?: boolean;
    };
    const cc = normalizeCountry(data.country_code);
    if (data.error || !cc) return null;
    return probe("ipapi.co", cc, data.currency);
  } catch {
    return null;
  }
}

export async function fetchGeoFromIpWhoIs(ip?: string): Promise<GeoProbe | null> {
  try {
    const url = ip ? `https://ipwho.is/${encodeURIComponent(ip)}` : "https://ipwho.is/";
    const res = await withTimeout(fetch(url, { cache: "no-store" }));
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      country_code?: string;
      currency?: { code?: string } | string;
    };
    const cc = normalizeCountry(data.country_code);
    if (!data.success || !cc) return null;
    const currency =
      typeof data.currency === "string" ? data.currency : data.currency?.code;
    return probe("ipwho.is", cc, currency);
  } catch {
    return null;
  }
}

export async function fetchGeoFromFreeIpApi(ip?: string): Promise<GeoProbe | null> {
  try {
    const url = ip
      ? `https://free.freeipapi.com/api/json/${encodeURIComponent(ip)}`
      : "https://free.freeipapi.com/api/json";
    const res = await withTimeout(fetch(url, { cache: "no-store" }));
    if (!res.ok) return null;
    const data = (await res.json()) as {
      countryCode?: string;
      currencies?: string[];
    };
    const cc = normalizeCountry(data.countryCode);
    if (!cc) return null;
    return probe("freeipapi.com", cc, data.currencies?.[0]);
  } catch {
    return null;
  }
}

/** Browser-only: Cloudflare trace endpoint (no API key). */
export async function fetchGeoFromCloudflareTrace(): Promise<GeoProbe | null> {
  try {
    const res = await withTimeout(
      fetch("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store" })
    );
    if (!res.ok) return null;
    const text = await res.text();
    const locLine = text.split("\n").find((line) => line.startsWith("loc="));
    const cc = normalizeCountry(locLine?.slice(4).trim());
    if (!cc) return null;
    return probe("cloudflare-trace", cc);
  } catch {
    return null;
  }
}

/** Run every IP provider in parallel (server-side, known IP). */
export async function fetchAllIpProbes(ip: string): Promise<GeoProbe[]> {
  const results = await Promise.allSettled([
    fetchGeoFromIpApi(ip),
    fetchGeoFromIpapiCo(ip),
    fetchGeoFromIpWhoIs(ip),
    fetchGeoFromFreeIpApi(ip),
  ]);

  return results
    .filter(
      (r): r is PromiseFulfilledResult<GeoProbe | null> => r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((v): v is GeoProbe => v !== null);
}

/** Browser-side probes (no IP required — each service resolves caller IP). */
export async function fetchAllBrowserProbes(): Promise<GeoProbe[]> {
  const results = await Promise.allSettled([
    fetchGeoFromIpapiCo(),
    fetchGeoFromIpWhoIs(),
    fetchGeoFromFreeIpApi(),
    fetchGeoFromCloudflareTrace(),
  ]);

  return results
    .filter(
      (r): r is PromiseFulfilledResult<GeoProbe | null> => r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((v): v is GeoProbe => v !== null);
}

function pickMostCommon(values: string[]): string | undefined {
  if (values.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export interface GeoConsensus {
  countryCode: string;
  currency?: string;
  sources: string[];
  agreement: number;
  totalProbes: number;
}

/**
 * Pick country by majority vote across probes.
 * Requires 2+ agreeing sources when multiple probes respond; single probe accepted alone.
 */
export function resolveGeoConsensus(probes: GeoProbe[]): GeoConsensus | null {
  if (probes.length === 0) return null;

  const tally = new Map<
    string,
    { votes: number; sources: string[]; currencies: string[] }
  >();

  for (const p of probes) {
    const cc = p.countryCode.toUpperCase();
    const entry = tally.get(cc) ?? { votes: 0, sources: [], currencies: [] };
    entry.votes += 1;
    entry.sources.push(p.source);
    if (p.currency) entry.currencies.push(p.currency);
    tally.set(cc, entry);
  }

  const ranked = [...tally.entries()].sort(
    (a, b) => b[1].votes - a[1].votes || b[1].sources.length - a[1].sources.length
  );

  const [countryCode, stats] = ranked[0];
  const runnerUp = ranked[1];

  const needsAgreement = probes.length >= 2 ? 2 : 1;
  if (stats.votes < needsAgreement) return null;
  if (runnerUp && stats.votes === runnerUp[1].votes && probes.length >= 2) {
    return null;
  }

  return {
    countryCode,
    currency: pickMostCommon(stats.currencies),
    sources: stats.sources,
    agreement: stats.votes,
    totalProbes: probes.length,
  };
}

export async function resolveGeoFromRequest(
  request: NextRequest,
  ip: string | null
): Promise<GeoConsensus | null> {
  const probes: GeoProbe[] = [...probeCdnHeaders(request)];

  if (ip) {
    const ipProbes = await fetchAllIpProbes(ip);
    probes.push(...ipProbes);
  }

  return resolveGeoConsensus(probes);
}

export async function resolveGeoFromBrowser(): Promise<GeoConsensus | null> {
  const probes = await fetchAllBrowserProbes();
  return resolveGeoConsensus(probes);
}
