import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { getSiteSettings } from "@/lib/data/site-settings";
import { resolveBranding } from "@/lib/site/branding";
import { apiSuccess } from "@/lib/api/response";
import { sendAlert } from "@/lib/notifications/dispatch";
import { FIRST_VISIT_COOKIE } from "@/lib/visitors/constants";
import { resolveVisitorGeo } from "@/lib/visitors/geo-details";
import { formatFirstVisitTelegramMessage } from "@/lib/visitors/format-telegram";
import { formatCampaignVisitorTelegramMessage } from "@/lib/visitors/format-campaign-telegram";
import { saveVisitorLog } from "@/lib/visitors/save-visit";
import { isLikelyBot } from "@/lib/visitors/user-agent";
import type { FirstVisitClientPayload, CampaignAttribution } from "@/lib/visitors/types";

export const dynamic = "force-dynamic";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Resolves campaign attribution from the `em_attr` cookie and/or UTM params.
 * This MUST run BEFORE composing the Telegram message so campaign visitors
 * receive the high-priority campaign notification instead of the generic one.
 */
function resolveCampaignAttribution(
  request: NextRequest,
  payload: FirstVisitClientPayload
): CampaignAttribution {
  const noAttribution: CampaignAttribution = { isCampaignVisit: false };

  // 1. Try to read the em_attr attribution cookie set by click redirect
  const attrCookie = request.cookies.get("em_attr")?.value;
  let cookieData: {
    c?: string;
    m?: string;
    p?: string;
    pn?: string;
    lt?: string;
    cn?: string;
    l?: string;
    at?: string;
    how?: string;
  } | null = null;

  if (attrCookie) {
    try {
      cookieData = JSON.parse(attrCookie);
    } catch {
      // Malformed cookie — ignore
    }
  }

  // 2. Extract UTM params from the payload (client sends from landing URL)
  const utmSource = payload.utm_source;
  const utmMedium = payload.utm_medium;
  const utmCampaign = payload.utm_campaign;
  const utmContent = payload.utm_content;

  // 3. Determine if this is a campaign visit
  //    Priority: cookie attribution (strongest) > UTM email/campaign params
  const hasCookieAttribution = cookieData?.c && cookieData?.m;
  const hasEmailUtm =
    (utmSource === "email" || utmMedium === "campaign" || utmMedium === "email") &&
    utmCampaign;

  if (!hasCookieAttribution && !hasEmailUtm) {
    return noAttribution;
  }

  return {
    isCampaignVisit: true,
    campaignId: cookieData?.c,
    campaignName: cookieData?.cn,
    emailMessageId: cookieData?.m,
    leadId: cookieData?.l,
    productId: cookieData?.p,
    productName: cookieData?.pn,
    linkType: cookieData?.lt,
    landingPage: payload.path,
    utmSource: utmSource || "email",
    utmMedium: utmMedium || "campaign",
    utmCampaign: utmCampaign || cookieData?.cn,
    utmContent,
    campaignClickedAt: cookieData?.at,
    marketingSource: "Email Campaign",
    howTheyCame: cookieData?.how || (hasEmailUtm ? "Campaign link → Landing Page" : undefined),
  };
}

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

  // ── CRITICAL: Resolve campaign attribution BEFORE composing the Telegram message ──
  const attribution = resolveCampaignAttribution(request, payload);

  // Choose the correct Telegram formatter based on attribution
  let message: string;
  let alertSubject: string;

  if (attribution.isCampaignVisit) {
    message = formatCampaignVisitorTelegramMessage(visitContext, attribution);
    alertSubject = `🚨 Campaign visitor — ${attribution.campaignName || "Email Campaign"}`;
  } else {
    message = formatFirstVisitTelegramMessage(visitContext);
    alertSubject = "New visitor — first visit";
  }

  const delivery = await sendAlert(alertSubject, message);

  await connectDB();
  const record = await saveVisitorLog(visitContext, delivery.sent, attribution);

  const response = apiSuccess({
    tracked: true,
    reason: delivery.sent ? delivery.reason : "saved",
    id: String(record._id),
    isCampaignVisit: attribution.isCampaignVisit,
    channels: {
      telegram: delivery.telegram,
      email: delivery.email,
      discord: delivery.discord,
    },
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
