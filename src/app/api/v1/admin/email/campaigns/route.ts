import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getEmailCampaignModel } from "@/models/EmailCampaign";
import { getEmailMessageModel } from "@/models/EmailMessage";
import { getLeadModel } from "@/models/Lead";
import { getEmailEventModel } from "@/models/EmailEvent";
import { getEmailSettings } from "@/lib/email/settings";
import { checkLeadEligibility } from "@/lib/email/eligibility";
import { renderEmail } from "@/lib/email/render";
import { renderEmailDocument } from "@/lib/email/document-renderer";
import type { EmailDocument } from "@/lib/email/document-schema";
import { countryLocaleMap, countryCurrencyMap } from "@/lib/geo/country-preferences";
import { fetchLiveExchangeRates } from "@/lib/currency/live-rates";
import { buildTrackingUrl } from "@/lib/email/tracking";
import { canSendCount } from "@/lib/email/quota";
import { processPendingQueue } from "@/lib/email/queue";
import { getRequestSiteUrl } from "@/lib/url";

const createCampaignSchema = z.object({
  name: z.string().min(1).trim(),
  internalDescription: z.string().optional(),
  objective: z.string().optional(),
  campaignBrief: z.string().optional(),
  productId: z.string().optional(),
  productSnapshot: z
    .object({
      name: z.string().optional(),
      slug: z.string().optional(),
      price: z.number().optional(),
      salePrice: z.number().optional(),
      image: z.string().optional(),
      description: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  subject: z.string().min(1).trim(),
  previewText: z.string().optional(),
  headline: z.string().optional(),
  body: z.string().optional().default(""),
  ctaText: z.string().optional(),
  ctaUrl: z.string().optional(),
  couponCode: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  emailDocument: z.record(z.string(), z.unknown()).optional(),
  emailDocumentVersion: z.number().optional(),
  leadIds: z.array(z.string()).min(1),
  sendImmediately: z.boolean().default(true),
  scheduledAt: z.string().optional(),
  ignoreCooldown: z.boolean().default(false),
  overrideLocale: z.string().optional(),
  overrideCurrency: z.string().optional(),
});

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const CampaignModel = await getEmailCampaignModel();
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const status = searchParams.get("status")?.trim();
    const q = searchParams.get("q")?.trim();

    const query: Record<string, unknown> = {};
    if (status && status !== "ALL") {
      query.status = status;
    }
    if (q) {
      query.name = { $regex: q, $options: "i" };
    }

    const [items, total] = await Promise.all([
      CampaignModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CampaignModel.countDocuments(query),
    ]);

    // Enrich campaigns that experienced failures with their primary failure reason
    const campaignsWithFailures = items.filter(
      (c) => (c.failedCount || 0) > 0 || c.status === "FAILED" || c.status === "PARTIALLY_FAILED"
    );

    const failureReasonMap = new Map<string, { reason: string; category?: string }>();
    if (campaignsWithFailures.length > 0) {
      const MessageModel = await getEmailMessageModel();
      const failedSamples = await MessageModel.find({
        campaignId: { $in: campaignsWithFailures.map((c) => c._id) } as any,
        status: { $in: ["FAILED", "RETRYING"] },
      })
        .select("campaignId failureReason failureCategory")
        .sort({ failedAt: -1 })
        .lean();

      for (const fs of failedSamples) {
        const cId = String(fs.campaignId);
        if (!failureReasonMap.has(cId) && fs.failureReason) {
          failureReasonMap.set(cId, {
            reason: fs.failureReason,
            category: fs.failureCategory,
          });
        }
      }
    }

    const enrichedItems = items.map((c) => {
      const f = failureReasonMap.get(String(c._id));
      const reason = f?.reason || c.lastFailureReason;
      const category = f?.category || c.lastFailureCategory;
      return {
        ...c,
        primaryFailureReason: reason || undefined,
        primaryFailureCategory: category || undefined,
      };
    });

    return apiSuccess({
      items: enrichedItems,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to list campaigns", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

export const POST = withAuth(async (request: NextRequest, ctx) => {
  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = createCampaignSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const data = parsed.data;
    const settings = await getEmailSettings();
    const baseUrl = getRequestSiteUrl(request);

    if (settings.isMarketingPaused) {
      return apiError("Marketing emails are currently paused.", 403);
    }

    const LeadModel = await getLeadModel();
    const CampaignModel = await getEmailCampaignModel();
    const MessageModel = await getEmailMessageModel();
    const EventModel = await getEmailEventModel();

    // Fetch leads
    const leads = await LeadModel.find({ _id: { $in: data.leadIds as any } }).lean();
    if (leads.length === 0) {
      return apiError("No valid leads found for the provided IDs.");
    }

    // Filter eligible leads deterministically
    const eligibleLeads: typeof leads = [];
    const excludedLeads: Array<{ lead: typeof leads[0]; reasons: string[] }> = [];

    for (const lead of leads) {
      const el = await checkLeadEligibility(lead as any, { ignoreCooldown: data.ignoreCooldown });
      if (el.eligible) {
        eligibleLeads.push(lead);
      } else {
        excludedLeads.push({ lead, reasons: el.reasons });
      }
    }

    if (eligibleLeads.length === 0) {
      const reasonCounts: Record<string, number> = {};
      const sampleDetails: string[] = [];

      for (const item of excludedLeads) {
        const leadLabel = item.lead.email || [item.lead.firstName, item.lead.lastName].filter(Boolean).join(" ") || String(item.lead._id);
        const readableReasons = item.reasons.map((r) => {
          if (r === "COOLDOWN_ACTIVE") return "in 14-day cooldown (recently emailed)";
          if (r.startsWith("SUPPRESSED_")) return `suppressed/unsubscribed (${r.replace("SUPPRESSED_", "")})`;
          if (r === "MISSING_EMAIL") return "missing email address";
          if (r === "INVALID_EMAIL_SYNTAX") return "invalid email syntax";
          if (r === "MARKETING_PAUSED") return "marketing is paused in settings";
          return r.toLowerCase().replace(/_/g, " ");
        });

        if (sampleDetails.length < 3) {
          sampleDetails.push(`${leadLabel}: ${readableReasons.join(", ")}`);
        }

        for (const r of item.reasons) {
          reasonCounts[r] = (reasonCounts[r] || 0) + 1;
        }
      }

      const summaryParts = Object.entries(reasonCounts).map(([k, count]) => {
        if (k === "COOLDOWN_ACTIVE") return `${count} in cooldown`;
        if (k.startsWith("SUPPRESSED_")) return `${count} unsubscribed/suppressed`;
        if (k === "MISSING_EMAIL") return `${count} missing email`;
        if (k === "INVALID_EMAIL_SYNTAX") return `${count} invalid email`;
        if (k === "MARKETING_PAUSED") return `${count} blocked (marketing paused)`;
        return `${count} ${k.toLowerCase().replace(/_/g, " ")}`;
      });

      const onlyCooldown = Object.keys(reasonCounts).every((r) => r === "COOLDOWN_ACTIVE");
      const hint = onlyCooldown
        ? " Enable 'Priority 1-on-1 Contact' / 'Ignore Cooldown' to send anyway."
        : "";

      const details = sampleDetails.length > 0 ? ` (${sampleDetails.join("; ")})` : "";
      return apiError(
        `None of the selected leads are currently eligible to receive outreach: ${summaryParts.join(", ")}${details}.${hint}`,
        400
      );
    }

    // Check quota if sending immediately
    if (data.sendImmediately && !data.scheduledAt) {
      const quotaCheck = await canSendCount(eligibleLeads.length);
      if (!quotaCheck.allowed) {
        return apiError(quotaCheck.reason || "Daily quota limit reached.", 429);
      }
    }

    const scheduledDate = data.scheduledAt ? new Date(data.scheduledAt) : undefined;
    const initialStatus = scheduledDate && scheduledDate > new Date() ? "SCHEDULED" : "QUEUED";

    // 1. Create Campaign
    const campaign = await CampaignModel.create({
      name: data.name,
      internalDescription: data.internalDescription,
      objective: data.objective,
      campaignBrief: data.campaignBrief,
      productId: data.productId,
      productSnapshot: data.productSnapshot,
      status: initialStatus,
      audienceFilterSnapshot: { selectedIdsCount: data.leadIds.length },
      audienceCount: leads.length,
      eligibleCount: eligibleLeads.length,
      excludedCount: excludedLeads.length,
      queuedCount: eligibleLeads.length,
      senderName: settings.defaultSenderName,
      senderEmail: settings.defaultSenderEmail,
      replyTo: settings.defaultReplyTo,
      subject: data.subject,
      previewText: data.previewText,
      headline: data.headline,
      body: data.body,
      ctaText: data.ctaText,
      ctaUrl: data.ctaUrl,
      couponCode: data.couponCode,
      utmSource: data.utmSource || settings.defaultUtmSource,
      utmMedium: data.utmMedium || settings.defaultUtmMedium,
      utmCampaign: data.utmCampaign || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      emailDocument: data.emailDocument,
      emailDocumentVersion: data.emailDocumentVersion || (data.emailDocument ? 1 : undefined),
      scheduledAt: scheduledDate,
      createdBy: ctx.user.email,
    });

    // 2. Create EmailMessage jobs with immutable rendered snapshots
    const messageDocs = [];
    const campaignIdStr = String(campaign._id);
    const exchangeRates = await fetchLiveExchangeRates().catch(() => undefined);

    for (const lead of eligibleLeads) {
      const emailMessageId = crypto.randomUUID();
      const trackingToken = crypto.randomBytes(24).toString("hex");
      const idempotencyKey = `camp_${campaignIdStr}_lead_${String(lead._id)}`;

      // Resolve recipient market preferences
      const countryCode = (lead.country || lead.phoneCountry || (lead.meta as any)?.country || "US").toUpperCase();
      const targetLocale = data.overrideLocale || (lead.meta as any)?.preferredLanguage || countryLocaleMap[countryCode] || "en";
      const targetCurrency = data.overrideCurrency || (lead.meta as any)?.preferredCurrency || countryCurrencyMap[countryCode] || "USD";

      let renderedSubject = data.subject;
      let renderedPreviewText = data.previewText;
      let renderedHtml = "";
      let renderedText = "";
      let ctaUrlSnapshot = data.ctaUrl;

      if (data.emailDocument) {
        const docResult = renderEmailDocument(data.emailDocument as unknown as EmailDocument, {
          personalization: {
            firstName: lead.firstName || "",
            lastName: lead.lastName || "",
            email: lead.email || "",
            leadId: String(lead._id),
          },
          targetLocale,
          targetCurrency,
          exchangeRates,
          emailMessageId,
          campaignId: campaignIdStr,
          leadId: String(lead._id),
          utmSource: campaign.utmSource,
          utmMedium: campaign.utmMedium,
          utmCampaign: campaign.utmCampaign,
          recipientEmail: lead.email!,
          recipientLeadId: String(lead._id),
          baseUrl,
        });

        renderedSubject = docResult.subject || data.subject;
        renderedPreviewText = docResult.previewText || data.previewText;
        renderedHtml = docResult.html;
        renderedText = docResult.text;
      } else {
        const trackingCtaUrl = data.ctaUrl
          ? buildTrackingUrl({
              targetUrl: data.ctaUrl,
              emailMessageId,
              campaignId: campaignIdStr,
              leadId: String(lead._id),
              utmSource: campaign.utmSource,
              utmMedium: campaign.utmMedium,
              utmCampaign: campaign.utmCampaign,
              baseUrl,
            })
          : undefined;

        const rendered = renderEmail({
          subject: data.subject,
          previewText: data.previewText,
          headline: data.headline,
          body: data.body,
          ctaText: data.ctaText,
          ctaUrl: data.ctaUrl,
          couponCode: data.couponCode,
          footerCopy: settings.defaultFooterCopy,
          companyAddress: settings.companyAddress,
          storeName: settings.defaultSenderName,
          product: data.productSnapshot,
          recipient: {
            email: lead.email!,
            leadId: String(lead._id),
            firstName: lead.firstName,
            lastName: lead.lastName,
          },
          trackingCtaUrl,
          baseUrl,
        });

        renderedSubject = rendered.subject;
        renderedPreviewText = rendered.previewText;
        renderedHtml = rendered.html;
        renderedText = rendered.text;
        ctaUrlSnapshot = trackingCtaUrl || data.ctaUrl;
      }

      messageDocs.push({
        campaignId: campaign._id,
        leadId: lead._id,
        recipientEmail: lead.email!.toLowerCase().trim(),
        recipientName: [lead.firstName, lead.lastName].filter(Boolean).join(" "),
        productId: data.productId,
        subjectSnapshot: renderedSubject,
        previewTextSnapshot: renderedPreviewText,
        headlineSnapshot: data.headline,
        bodySnapshot: data.body,
        renderedHtmlSnapshot: renderedHtml,
        renderedPlainTextSnapshot: renderedText,
        ctaTextSnapshot: data.ctaText,
        ctaUrlSnapshot,
        emailDocumentSnapshot: data.emailDocument,
        personalizationSnapshot: {
          firstName: lead.firstName || "",
          lastName: lead.lastName || "",
          email: lead.email || "",
        },
        productSnapshot: data.productSnapshot,
        status: initialStatus,
        queuedAt: scheduledDate || new Date(),
        trackingToken,
        idempotencyKey,
      });
    }

    if (messageDocs.length > 0) {
      await MessageModel.insertMany(messageDocs, { ordered: false });
    }

    await EventModel.create({
      campaignId: campaign._id,
      type: "CREATED",
      actor: ctx.user.email,
      metadata: {
        campaignName: data.name,
        eligibleCount: eligibleLeads.length,
        excludedCount: excludedLeads.length,
      },
    });

    // 3. Process immediate send if requested and not scheduled in future
    if (data.sendImmediately && (!scheduledDate || scheduledDate <= new Date())) {
      // Trigger queue processing for this batch
      processPendingQueue(eligibleLeads.length).catch((err) => {
        console.error("Async queue processing error:", err);
      });
    }

    return apiSuccess({
      campaign,
      eligibleCount: eligibleLeads.length,
      excludedCount: excludedLeads.length,
      excludedSummary: excludedLeads.map((e) => ({
        leadId: String(e.lead._id),
        email: e.lead.email,
        reasons: e.reasons,
      })),
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to create campaign", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);
