import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api/response";
import { sendTelegramMessage } from "@/lib/telegram/notify";
import { FIRST_VISIT_COOKIE } from "@/lib/visitors/constants";
import { resolveVisitorGeo } from "@/lib/visitors/geo-details";
import { formatFirstVisitTelegramMessage } from "@/lib/visitors/format-telegram";
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
  const message = formatFirstVisitTelegramMessage({
    ...payload,
    userAgent,
    acceptLanguage: request.headers.get("accept-language") ?? undefined,
    geo,
    visitedAt,
  });

  const sent = await sendTelegramMessage(message);
  const response = apiSuccess({
    tracked: sent,
    reason: sent ? "sent" : "telegram_not_configured",
  });

  if (sent) {
    response.cookies.set(FIRST_VISIT_COOKIE, "1", {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}
