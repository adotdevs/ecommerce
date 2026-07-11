import { parseUserAgent } from "./user-agent";
import type { FirstVisitContext } from "./types";

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

function displayValue(value?: string | null): string {
  return value?.trim() || "—";
}

export function formatFirstVisitTelegramMessage(ctx: FirstVisitContext): string {
  const { browser, os, device } = parseUserAgent(ctx.userAgent);
  const geo = ctx.geo;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const landingUrl = ctx.path
    ? `${appUrl}${ctx.path.startsWith("/") ? ctx.path : `/${ctx.path}`}`
    : appUrl || "—";

  const locationParts = [
    geo?.city,
    geo?.region,
    geo?.country,
    geo?.countryCode ? `(${geo.countryCode})` : null,
  ].filter(Boolean);

  let message = "<b>🆕 New visitor";
  if (ctx.storeName) {
    message += ` — ${escapeHtml(ctx.storeName)}`;
  }
  message += " (first visit)</b>\n\n";

  message += "<b>📍 Location</b>\n";
  message += line("IP", geo?.ip ?? "Unknown");
  message += line("Location", locationParts.join(", ") || "Unknown");
  message += line("ZIP", geo?.zip);
  message += line(
    "Coordinates",
    geo?.lat != null && geo?.lon != null ? `${geo.lat}, ${geo.lon}` : null
  );
  message += line("Timezone", geo?.timezone ?? ctx.timezone);
  message += line("Continent", geo?.continent);
  message += line("Currency", geo?.currency);
  message += line("ISP", geo?.isp);
  message += line("Organization", geo?.org);
  message += line("ASN", geo?.as);
  message += line("Hostname", geo?.reverse);
  message += line("Mobile network", geo?.mobile);
  message += line("Proxy/VPN", geo?.proxy);
  message += line("Hosting/Datacenter", geo?.hosting);

  message += "\n<b>🌐 Visit</b>\n";
  message += line("Landing page", landingUrl);
  message += line("Referrer", ctx.referrer || "Direct / none");
  message += line("Visited at", ctx.visitedAt);
  message += line("Browser language", ctx.language ?? ctx.acceptLanguage);
  message += line("Screen", ctx.screen);
  message += line("Viewport", ctx.viewport);
  message += line("Platform", ctx.platform);
  message += line("Device", device);
  message += line("Browser", `${browser} on ${os}`);

  message += "\n<b>🧾 User-Agent</b>\n";
  message += `<code>${displayValue(ctx.userAgent).slice(0, 900)}</code>`;

  return message;
}
