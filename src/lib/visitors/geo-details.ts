import { getClientIp } from "@/lib/geo/ip-api";
import type { VisitorGeoDetails } from "./types";

const VISITOR_GEO_FIELDS = [
  "status",
  "message",
  "continent",
  "continentCode",
  "country",
  "countryCode",
  "region",
  "regionName",
  "city",
  "district",
  "zip",
  "lat",
  "lon",
  "timezone",
  "offset",
  "currency",
  "isp",
  "org",
  "as",
  "asname",
  "reverse",
  "mobile",
  "proxy",
  "hosting",
  "query",
].join(",");

const TIMEOUT_MS = 5000;

interface IpApiVisitorResponse {
  status: string;
  message?: string;
  continent?: string;
  continentCode?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  district?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  offset?: number;
  currency?: string;
  isp?: string;
  org?: string;
  as?: string;
  asname?: string;
  reverse?: string;
  mobile?: boolean;
  proxy?: boolean;
  hosting?: boolean;
  query?: string;
}

interface IpapiCoVisitorResponse {
  ip?: string;
  city?: string;
  region?: string;
  region_code?: string;
  country_name?: string;
  country_code?: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  currency?: string;
  org?: string;
  asn?: string;
  error?: boolean;
  reason?: string;
}

function mapIpApiResponse(data: IpApiVisitorResponse): VisitorGeoDetails | null {
  if (data.status !== "success" || !data.query) return null;
  return {
    ip: data.query,
    continent: data.continent,
    country: data.country,
    countryCode: data.countryCode,
    region: data.regionName ?? data.region,
    city: data.city,
    district: data.district,
    zip: data.zip,
    lat: data.lat,
    lon: data.lon,
    timezone: data.timezone,
    offset: data.offset,
    currency: data.currency,
    isp: data.isp,
    org: data.org,
    as: data.as,
    asname: data.asname,
    reverse: data.reverse,
    mobile: data.mobile,
    proxy: data.proxy,
    hosting: data.hosting,
  };
}

function mapIpapiCoResponse(
  ip: string,
  data: IpapiCoVisitorResponse
): VisitorGeoDetails | null {
  if (data.error || !data.country_code) return null;
  return {
    ip: data.ip ?? ip,
    country: data.country_name,
    countryCode: data.country_code,
    region: data.region,
    city: data.city,
    zip: data.postal,
    lat: data.latitude,
    lon: data.longitude,
    timezone: data.timezone,
    currency: data.currency,
    org: data.org,
    as: data.asn,
  };
}

async function fetchFromIpApi(ip: string): Promise<VisitorGeoDetails | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${VISITOR_GEO_FIELDS}`,
      { signal: controller.signal, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as IpApiVisitorResponse;
    return mapIpApiResponse(data);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromIpapiCo(ip: string): Promise<VisitorGeoDetails | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as IpapiCoVisitorResponse;
    return mapIpapiCoResponse(ip, data);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveVisitorGeo(
  request: Request
): Promise<VisitorGeoDetails | null> {
  const ip = getClientIp(request);
  if (!ip) return null;
  return (await fetchFromIpApi(ip)) ?? (await fetchFromIpapiCo(ip));
}
