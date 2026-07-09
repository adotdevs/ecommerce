import type { NextRequest } from "next/server";
import { resolveGeoPreferences } from "@/lib/geo/resolve-preferences";
import { apiSuccess } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const prefs = await resolveGeoPreferences(request);
  return apiSuccess(prefs);
}
