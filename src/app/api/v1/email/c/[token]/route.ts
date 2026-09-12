import { NextRequest, NextResponse } from "next/server";
import { verifyTrackingToken } from "@/lib/email/tracking";
import { getSiteUrl, getRequestSiteUrl, isInternalUrl } from "@/lib/url";
import { getEmailMessageModel } from "@/models/EmailMessage";
import { getEmailCampaignModel } from "@/models/EmailCampaign";
import { getEmailEventModel } from "@/models/EmailEvent";

/** Human-readable description of how user arrived based on linkType */
function describeArrival(linkType?: string, productName?: string): string {
  const product = productName ? ` for "${productName}"` : "";
  switch (linkType) {
    case "CTA_BUTTON":
      return `Clicked "Shop Now" CTA button${product}`;
    case "PRODUCT_IMAGE":
      return `Clicked product image${product}`;
    case "PRODUCT_TITLE":
      return `Clicked product title${product}`;
    case "PRODUCT_CTA":
      return `Clicked product CTA button${product}`;
    case "HERO_BUTTON":
      return `Clicked hero section button${product}`;
    case "TEXT_LINK":
      return `Clicked text link${product}`;
    case "FOOTER_LINK":
      return `Clicked footer link${product}`;
    case "BANNER_LINK":
      return `Clicked banner link${product}`;
    case "COUPON_CTA":
      return `Clicked coupon/offer CTA${product}`;
    case "IMAGE_LINK":
      return `Clicked image link${product}`;
    case "CUSTOM_BUTTON":
      return `Clicked custom button${product}`;
    default:
      return `Clicked campaign link${product}`;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const payload = verifyTrackingToken(token);
  const baseUrl = getRequestSiteUrl(request) || getSiteUrl();

  if (!payload || !payload.u) {
    return NextResponse.redirect(baseUrl);
  }

  // Resolve campaign name for the attribution cookie
  let campaignName: string | undefined;

  try {
    const MessageModel = await getEmailMessageModel();
    const CampaignModel = await getEmailCampaignModel();
    const EventModel = await getEmailEventModel();

    // Mark clicked on Message if not already clicked
    const msg = await MessageModel.findOneAndUpdate(
      { _id: payload.m, clickedAt: null },
      { $set: { clickedAt: new Date() } },
      { new: true }
    );

    if (payload.c) {
      // Fetch campaign name for attribution cookie
      const campaign = await CampaignModel.findById(payload.c).select("name").lean();
      campaignName = (campaign as { name?: string })?.name;

      if (msg) {
        await CampaignModel.updateOne(
          { _id: payload.c },
          { $inc: { clickCount: 1 } }
        );
      }

      // Always record the click event with enriched metadata
      await EventModel.create({
        campaignId: payload.c,
        emailMessageId: payload.m,
        leadId: payload.l,
        recipientEmail: msg?.recipientEmail,
        type: "CLICKED",
        actor: "recipient",
        metadata: {
          targetUrl: payload.u,
          productId: payload.p,
          productName: payload.pn,
          linkType: payload.lt,
          blockId: payload.bi,
          howTheyCame: describeArrival(payload.lt, payload.pn),
        },
      });
    }
  } catch (err) {
    console.error("Click tracking record error:", err);
  }

  // Safe redirect validation
  let target = payload.u;
  try {
    // If target has a localhost/127.0.0.1 domain, rewrite to active baseUrl
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(target)) {
      const parsedUrl = new URL(target);
      target = `${baseUrl}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    // Only allow redirects to our own domain or fully-qualified external URLs
    if (!target.startsWith("http")) {
      target = baseUrl;
    } else if (!isInternalUrl(target, baseUrl)) {
      // External URL — only allow if it was the original tracked destination
      // This is safe because the token was HMAC-signed by us
    }
  } catch {
    target = baseUrl;
  }

  const response = NextResponse.redirect(target);

  // Set enriched attribution cookie for campaign conversion tracking
  if (payload.c && payload.m) {
    const attrData = {
      c: payload.c,       // campaignId
      m: payload.m,       // emailMessageId
      p: payload.p,       // productId
      pn: payload.pn,     // productName
      lt: payload.lt,     // linkType
      cn: campaignName,   // campaignName
      l: payload.l,       // leadId
      at: new Date().toISOString(), // attribution timestamp
      how: describeArrival(payload.lt, payload.pn),
    };
    response.cookies.set("em_attr", JSON.stringify(attrData), {
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      sameSite: "lax",
    });
  }

  return response;
}
