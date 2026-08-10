import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { formatCartCheckoutTelegramMessage } from "@/lib/checkout/format-telegram";
import { getSiteSettings } from "@/lib/data/site-settings";
import { resolveBranding } from "@/lib/site/branding";
import { sendTelegramMessage } from "@/lib/telegram/notify";
import { resolveVisitorGeo } from "@/lib/visitors/geo-details";
import { isLikelyBot } from "@/lib/visitors/user-agent";

export const dynamic = "force-dynamic";

interface CartCheckoutPayload {
  itemCount?: number;
  itemsSummary?: string;
  subtotalDisplay?: string;
  shippingDisplay?: string;
  taxDisplay?: string;
  discountDisplay?: string;
  totalDisplay?: string;
  promoCode?: string;
  path?: string;
}

export async function POST(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (isLikelyBot(userAgent)) {
    return apiSuccess({ sent: false, reason: "bot" });
  }

  let payload: CartCheckoutPayload = {};
  try {
    payload = (await request.json()) as CartCheckoutPayload;
  } catch {
    return apiError("Invalid JSON body");
  }

  const itemCount = payload.itemCount ?? 0;
  if (itemCount < 1) {
    return apiError("Cart must contain at least one item");
  }

  const totalDisplay = payload.totalDisplay?.trim() ?? "";
  if (!totalDisplay) {
    return apiError("Total is required");
  }

  const geo = await resolveVisitorGeo(request);
  const siteSettings = await getSiteSettings();
  const { storeName } = resolveBranding(siteSettings);

  const message = formatCartCheckoutTelegramMessage({
    itemCount,
    itemsSummary: payload.itemsSummary?.trim() || undefined,
    subtotalDisplay: payload.subtotalDisplay?.trim() || undefined,
    shippingDisplay: payload.shippingDisplay?.trim() || undefined,
    taxDisplay: payload.taxDisplay?.trim() || undefined,
    discountDisplay: payload.discountDisplay?.trim() || undefined,
    totalDisplay,
    promoCode: payload.promoCode?.trim() || undefined,
    path: payload.path,
    userAgent,
    acceptLanguage: request.headers.get("accept-language") ?? undefined,
    geo,
    submittedAt: new Date().toISOString(),
    storeName: storeName || undefined,
  });

  const sent = await sendTelegramMessage(message);

  return apiSuccess({
    sent,
    reason: sent ? "sent" : "telegram_not_configured",
  });
}
