import type { NextRequest } from "next/server";
import { resolveGeoFromRequest, fetchAllIpProbes, resolveGeoConsensus } from "./multi-provider";
import type { IpApiResult } from "./types";

const IP_API_TIMEOUT_MS = 4500;

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

  const vercelIp = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercelIp && !isPrivateOrLocalIp(vercelIp)) return vercelIp;

  return null;
}

/** Consensus across ip-api.com, ipapi.co, ipwho.is, and freeipapi.com. */
export async function fetchGeoByIp(ip: string): Promise<IpApiResult | null> {
  if (isPrivateOrLocalIp(ip)) return null;

  const probes = await fetchAllIpProbes(ip);
  const consensus = resolveGeoConsensus(probes);
  if (!consensus) return null;

  return {
    status: "success",
    countryCode: consensus.countryCode,
    currency: consensus.currency,
    query: ip,
  };
}

export async function fetchGeoForRequest(request: NextRequest) {
  return resolveGeoFromRequest(request, getClientIp(request));
}

export { isPrivateOrLocalIp, IP_API_TIMEOUT_MS };
