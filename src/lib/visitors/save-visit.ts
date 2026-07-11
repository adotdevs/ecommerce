import { VisitorLog } from "@/models";
import { parseUserAgent } from "@/lib/visitors/user-agent";
import type { FirstVisitContext } from "@/lib/visitors/types";

export async function saveVisitorLog(
  ctx: FirstVisitContext,
  telegramSent: boolean
) {
  const { browser, os, device } = parseUserAgent(ctx.userAgent);
  const geo = ctx.geo;

  return VisitorLog.create({
    ip: geo?.ip,
    geo: geo
      ? {
          continent: geo.continent,
          country: geo.country,
          countryCode: geo.countryCode,
          region: geo.region,
          city: geo.city,
          district: geo.district,
          zip: geo.zip,
          lat: geo.lat,
          lon: geo.lon,
          timezone: geo.timezone,
          offset: geo.offset,
          currency: geo.currency,
          isp: geo.isp,
          org: geo.org,
          as: geo.as,
          asname: geo.asname,
          reverse: geo.reverse,
          mobile: geo.mobile,
          proxy: geo.proxy,
          hosting: geo.hosting,
        }
      : undefined,
    landingPath: ctx.path,
    referrer: ctx.referrer ?? undefined,
    userAgent: ctx.userAgent,
    browser,
    os,
    device,
    language: ctx.language,
    acceptLanguage: ctx.acceptLanguage,
    screen: ctx.screen,
    viewport: ctx.viewport,
    timezone: ctx.timezone ?? geo?.timezone,
    platform: ctx.platform,
    telegramSent,
    visitedAt: new Date(ctx.visitedAt),
  });
}
