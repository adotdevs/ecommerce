import type { NextRequest } from "next/server";
import { resolveGeoPreferences } from "@/lib/geo/resolve-preferences";
import { fetchGeoForRequest, getClientIp } from "@/lib/geo/ip-api";
import { apiSuccess } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const prefs = await resolveGeoPreferences(request);
  const ip = getClientIp(request);
  const consensus = await fetchGeoForRequest(request);

  return apiSuccess({
    ...prefs,
    meta: consensus
      ? {
          sources: consensus.sources,
          agreement: consensus.agreement,
          totalProbes: consensus.totalProbes,
          ip: ip ?? undefined,
        }
      : { ip: ip ?? undefined },
  });
}
