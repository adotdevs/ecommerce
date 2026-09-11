import crypto from "crypto";
import { getSiteUrl, toAbsoluteUrl } from "@/lib/url";

const SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_REFRESH_SECRET || "email-outreach-secure-secret-key-1029";

export interface TrackingPayload {
  m: string; // emailMessageId
  c?: string; // campaignId
  l?: string; // leadId
  u: string; // target URL
  t: number; // timestamp
  p?: string; // productId
  pn?: string; // productName (truncated for token size)
  lt?: string; // linkType: CTA_BUTTON | PRODUCT_IMAGE | PRODUCT_TITLE | TEXT_LINK | HERO_BUTTON | FOOTER_LINK | CUSTOM_BUTTON | BANNER_LINK | COUPON_CTA
  bi?: string; // blockId
}

export type EmailLinkType =
  | "CTA_BUTTON"
  | "PRODUCT_IMAGE"
  | "PRODUCT_TITLE"
  | "PRODUCT_CTA"
  | "TEXT_LINK"
  | "HERO_BUTTON"
  | "FOOTER_LINK"
  | "CUSTOM_BUTTON"
  | "BANNER_LINK"
  | "COUPON_CTA"
  | "IMAGE_LINK";

export function signPayload(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("hex").slice(0, 16);
}

export function createTrackingToken(payload: TrackingPayload): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64url");
  const sig = signPayload(b64);
  return `${b64}.${sig}`;
}

export function verifyTrackingToken(token: string): TrackingPayload | null {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;
    const expectedSig = signPayload(b64);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }
    const json = Buffer.from(b64, "base64url").toString("utf-8");
    return JSON.parse(json) as TrackingPayload;
  } catch {
    return null;
  }
}

export function createUnsubscribeToken(email: string, leadId?: string): string {
  const payload = JSON.stringify({ email: email.toLowerCase().trim(), leadId, t: Date.now() });
  const b64 = Buffer.from(payload).toString("base64url");
  const sig = signPayload(b64);
  return `${b64}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): { email: string; leadId?: string } | null {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;
    const expectedSig = signPayload(b64);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }
    const json = Buffer.from(b64, "base64url").toString("utf-8");
    return JSON.parse(json) as { email: string; leadId?: string };
  } catch {
    return null;
  }
}

/** @deprecated Use `getSiteUrl()` from `@/lib/url` directly. Kept as alias for compatibility. */
export function getAppBaseUrl(): string {
  return getSiteUrl();
}

export function buildTrackingUrl(params: {
  targetUrl: string;
  emailMessageId: string;
  campaignId?: string;
  leadId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  /** Product attribution */
  productId?: string;
  productName?: string;
  /** What the user clicked — PRODUCT_CTA, PRODUCT_IMAGE, HERO_BUTTON, etc. */
  linkType?: EmailLinkType;
  /** Design block ID for per-block analytics */
  blockId?: string;
}): string {
  const baseUrl = getSiteUrl();
  // Ensure the target URL is absolute
  let finalTarget = toAbsoluteUrl(params.targetUrl);

  try {
    const parsed = new URL(finalTarget);
    if (params.utmSource) parsed.searchParams.set("utm_source", params.utmSource);
    if (params.utmMedium) parsed.searchParams.set("utm_medium", params.utmMedium);
    if (params.utmCampaign) parsed.searchParams.set("utm_campaign", params.utmCampaign);
    if (params.utmContent) parsed.searchParams.set("utm_content", params.utmContent);
    finalTarget = parsed.toString();
  } catch {
    // If URL parsing fails, keep the target as-is
  }

  const token = createTrackingToken({
    m: params.emailMessageId,
    c: params.campaignId,
    l: params.leadId,
    u: finalTarget,
    t: Date.now(),
    p: params.productId,
    pn: params.productName?.slice(0, 60),
    lt: params.linkType,
    bi: params.blockId,
  });

  return `${baseUrl}/api/v1/email/c/${token}`;
}

export function buildUnsubscribeUrl(email: string, leadId?: string): string {
  const baseUrl = getAppBaseUrl();
  const token = createUnsubscribeToken(email, leadId);
  return `${baseUrl}/unsubscribe?token=${token}`;
}
