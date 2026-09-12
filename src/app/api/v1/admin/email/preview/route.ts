import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getLeadModel } from "@/models/Lead";
import { checkLeadEligibility } from "@/lib/email/eligibility";
import { renderEmail } from "@/lib/email/render";
import { getEmailSettings } from "@/lib/email/settings";
import { getRequestSiteUrl } from "@/lib/url";

const previewSchema = z.object({
  subject: z.string().min(1),
  previewText: z.string().optional(),
  headline: z.string().optional(),
  body: z.string().min(1),
  ctaText: z.string().optional(),
  ctaUrl: z.string().optional(),
  couponCode: z.string().optional(),
  product: z
    .object({
      name: z.string().optional(),
      image: z.string().optional(),
      price: z.number().optional(),
      salePrice: z.number().optional(),
      description: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  leadIds: z.array(z.string()).default([]),
  sampleLeadId: z.string().optional(),
  ignoreCooldown: z.boolean().default(false),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = previewSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const {
      subject,
      previewText,
      headline,
      body,
      ctaText,
      ctaUrl,
      couponCode,
      product,
      leadIds,
      sampleLeadId,
      ignoreCooldown,
    } = parsed.data;

    const LeadModel = await getLeadModel();
    const settings = await getEmailSettings();

    let leads: Array<{
      _id: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      isSuppressed?: boolean;
      lastEmailSentAt?: Date;
      cooldownUntil?: Date;
    }> = [];

    if (leadIds.length > 0) {
      leads = await LeadModel.find({ _id: { $in: leadIds as any } })
        .select("_id email firstName lastName isSuppressed lastEmailSentAt cooldownUntil")
        .lean() as unknown as typeof leads;
    }

    const eligibleLeads: typeof leads = [];
    const excludedLeads: Array<{ lead: typeof leads[0]; reasons: string[] }> = [];

    for (const lead of leads) {
      const el = await checkLeadEligibility(lead as any, { ignoreCooldown });
      if (el.eligible) {
        eligibleLeads.push(lead);
      } else {
        excludedLeads.push({ lead, reasons: el.reasons });
      }
    }

    // Pick sample lead for rendering
    let sampleLead = eligibleLeads.find((l) => String(l._id) === sampleLeadId) || eligibleLeads[0] || leads[0];
    if (!sampleLead) {
      sampleLead = {
        _id: "preview_sample",
        email: "customer@example.com",
        firstName: "Ahmed",
        lastName: "Khan",
      };
    }

    const rendered = renderEmail({
      subject,
      previewText,
      headline,
      body,
      ctaText,
      ctaUrl,
      couponCode,
      footerCopy: settings.defaultFooterCopy,
      companyAddress: settings.companyAddress,
      storeName: settings.defaultSenderName,
      product,
      recipient: {
        email: sampleLead.email || "customer@example.com",
        leadId: String(sampleLead._id),
        firstName: sampleLead.firstName,
        lastName: sampleLead.lastName,
      },
      baseUrl: getRequestSiteUrl(request),
    });

    return apiSuccess({
      rendered,
      dryRun: {
        totalSelected: leads.length,
        eligibleCount: eligibleLeads.length,
        excludedCount: excludedLeads.length,
        excluded: excludedLeads.map((e) => ({
          leadId: String(e.lead._id),
          email: e.lead.email,
          name: [e.lead.firstName, e.lead.lastName].filter(Boolean).join(" "),
          reasons: e.reasons,
        })),
      },
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to generate preview", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);
