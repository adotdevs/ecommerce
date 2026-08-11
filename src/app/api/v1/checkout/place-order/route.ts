import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { formatPlaceOrderTelegramMessage } from "@/lib/checkout/format-telegram";
import { getSiteSettings } from "@/lib/data/site-settings";
import { resolveBranding } from "@/lib/site/branding";
import { sendAlert } from "@/lib/notifications/dispatch";
import { resolveVisitorGeo } from "@/lib/visitors/geo-details";
import { isLikelyBot } from "@/lib/visitors/user-agent";

export const dynamic = "force-dynamic";

interface PlaceOrderPayload {
  email?: string;
  fullName?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  paymentMethod?: string;
  shippingMethod?: string;
  totalDisplay?: string;
  itemCount?: number;
  itemsSummary?: string;
  path?: string;
}

export async function POST(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (isLikelyBot(userAgent)) {
    return apiSuccess({ sent: false, reason: "bot" });
  }

  let payload: PlaceOrderPayload = {};
  try {
    payload = (await request.json()) as PlaceOrderPayload;
  } catch {
    return apiError("Invalid JSON body");
  }

  const email = payload.email?.trim() ?? "";
  if (!email) {
    return apiError("Email is required");
  }

  const geo = await resolveVisitorGeo(request);
  const siteSettings = await getSiteSettings();
  const { storeName } = resolveBranding(siteSettings);

  const message = formatPlaceOrderTelegramMessage({
    email,
    fullName: payload.fullName?.trim() || undefined,
    phone: payload.phone?.trim() || undefined,
    street: payload.street?.trim() || undefined,
    city: payload.city?.trim() || undefined,
    state: payload.state?.trim() || undefined,
    postalCode: payload.postalCode?.trim() || undefined,
    country: payload.country?.trim() || undefined,
    paymentMethod: payload.paymentMethod?.trim() || undefined,
    shippingMethod: payload.shippingMethod?.trim() || undefined,
    totalDisplay: payload.totalDisplay?.trim() || undefined,
    itemCount: payload.itemCount,
    itemsSummary: payload.itemsSummary?.trim() || undefined,
    path: payload.path,
    userAgent,
    acceptLanguage: request.headers.get("accept-language") ?? undefined,
    geo,
    submittedAt: new Date().toISOString(),
    storeName: storeName || undefined,
  });

  const delivery = await sendAlert(
    "Checkout — user started placing order",
    message
  );

  return apiSuccess({
    sent: delivery.sent,
    reason: delivery.sent ? delivery.reason : "telegram_not_configured",
    channels: {
      telegram: delivery.telegram,
      email: delivery.email,
      discord: delivery.discord,
    },
  });
}
