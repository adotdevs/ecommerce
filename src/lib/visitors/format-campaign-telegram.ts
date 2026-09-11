import { parseUserAgent } from "./user-agent";
import { getSiteUrl } from "@/lib/url";
import type { FirstVisitContext, CampaignAttribution } from "./types";

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

/**
 * Formats a HIGH-PRIORITY Telegram message for campaign-attributed visitors.
 * The first line must IMMEDIATELY differentiate it from normal visitor messages.
 */
export function formatCampaignVisitorTelegramMessage(
  ctx: FirstVisitContext,
  attr: CampaignAttribution
): string {
  const { browser, os, device } = parseUserAgent(ctx.userAgent);
  const geo = ctx.geo;
  const appUrl = getSiteUrl();
  const landingUrl = ctx.path
    ? `${appUrl}${ctx.path.startsWith("/") ? ctx.path : `/${ctx.path}`}`
    : appUrl || "—";

  const locationParts = [
    geo?.city,
    geo?.region,
    geo?.country,
    geo?.countryCode ? `(${geo.countryCode})` : null,
  ].filter(Boolean);

  // ── HIGH-PRIORITY CAMPAIGN HEADER ──
  let message = "🚨🔥 <b>EMAIL CAMPAIGN VISITOR</b> 🔥🚨\n";
  message += "A visitor just landed from a marketing campaign.\n\n";

  // ── CAMPAIGN SECTION ──
  message += "<b>📧 Campaign</b>\n";
  message += line("Campaign", attr.campaignName);
  message += line("Source", attr.marketingSource || attr.utmSource || "Email");
  if (attr.howTheyCame) {
    message += line("How they came", attr.howTheyCame);
  }
  if (attr.linkType) {
    message += line("Click type", attr.linkType);
  }

  // ── PRODUCT SECTION (if applicable) ──
  if (attr.productName || attr.productId) {
    message += "\n<b>🏷️ Product</b>\n";
    message += line("Product", attr.productName);
    if (attr.productId) {
      message += line("Product ID", attr.productId);
    }
  }

  // ── LANDING & UTM ──
  message += "\n<b>🌐 Visit</b>\n";
  message += line("Landing page", landingUrl);
  if (attr.utmSource || attr.utmMedium || attr.utmCampaign) {
    const utmParts = [attr.utmSource, attr.utmMedium, attr.utmCampaign].filter(Boolean);
    message += line("UTM", utmParts.join(" / "));
  }
  if (attr.utmContent) {
    message += line("UTM content", attr.utmContent);
  }
  message += line("Campaign attribution", "Confirmed ✓");
  message += line("First campaign visit", "Yes");
  if (attr.campaignClickedAt) {
    message += line("Clicked at", attr.campaignClickedAt);
  }
  message += line("Visited at", ctx.visitedAt);

  // ── LOCATION ──
  if (locationParts.length > 0 || geo?.ip) {
    message += "\n<b>📍 Location</b>\n";
    message += line("IP", geo?.ip ?? "Unknown");
    message += line("Location", locationParts.join(", ") || "Unknown");
    message += line("Timezone", geo?.timezone ?? ctx.timezone);
  }

  // ── DEVICE ──
  message += "\n<b>📱 Device</b>\n";
  message += line("Device", device);
  message += line("Browser", `${browser} on ${os}`);
  message += line("Screen", ctx.screen);

  return message;
}
