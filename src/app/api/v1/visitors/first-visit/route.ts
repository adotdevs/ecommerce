import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { getSiteSettings } from "@/lib/data/site-settings";
import { resolveBranding } from "@/lib/site/branding";
import { apiSuccess } from "@/lib/api/response";
import { sendTelegramMessage } from "@/lib/telegram/notify";
import { FIRST_VISIT_COOKIE } from "@/lib/visitors/constants";
import { resolveVisitorGeo } from "@/lib/visitors/geo-details";
import { formatFirstVisitTelegramMessage } from "@/lib/visitors/format-telegram";
import { saveVisitorLog } from "@/lib/visitors/save-visit";
import { isLikelyBot } from "@/lib/visitors/user-agent";
import type { FirstVisitClientPayload } from "@/lib/visitors/types";

export const dynamic = "force-dynamic";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function POST(request: NextRequest) {
  if (request.cookies.get(FIRST_VISIT_COOKIE)?.value === "1") {
    return apiSuccess({ tracked: false, reason: "already_tracked" });
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  if (isLikelyBot(userAgent)) {
    return apiSuccess({ tracked: false, reason: "bot" });
  }

  let payload: FirstVisitClientPayload = {};
  try {
    payload = (await request.json()) as FirstVisitClientPayload;
  } catch {
    payload = {};
  }

  const geo = await resolveVisitorGeo(request);
  const visitedAt = new Date().toISOString();
  const siteSettings = await getSiteSettings();
  const { storeName } = resolveBranding(siteSettings);
  const visitContext = {
    ...payload,
    userAgent,
    acceptLanguage: request.headers.get("accept-language") ?? undefined,
    geo,
    visitedAt,
    storeName: storeName || undefined,
  };

  const message = formatFirstVisitTelegramMessage(visitContext);
  const telegramSent = await sendTelegramMessage(message);

  await connectDB();
  const record = await saveVisitorLog(visitContext, telegramSent);

  const response = apiSuccess({
    tracked: true,
    reason: telegramSent ? "sent" : "saved",
    id: String(record._id),
  });

  response.cookies.set(FIRST_VISIT_COOKIE, "1", {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
