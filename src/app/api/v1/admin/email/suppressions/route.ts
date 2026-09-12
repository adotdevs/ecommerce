import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getEmailSuppressionModel, type SuppressionReason } from "@/models/EmailSuppression";
import { getLeadModel } from "@/models/Lead";
import { unsuppressEmail, suppressEmail, normalizeEmail } from "@/lib/email/suppression";

const listQuerySchema = z.object({
  q: z.string().optional(),
  reason: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const createSuppressionSchema = z.object({
  email: z.string().email("Invalid email address"),
  reason: z.enum(["UNSUBSCRIBED", "HARD_FAILURE", "INVALID_EMAIL", "MANUAL_BLOCK", "COMPLAINT", "OTHER"]).default("MANUAL_BLOCK"),
  notes: z.string().optional(),
});

const deleteSuppressionSchema = z.object({
  email: z.string().min(1, "Email is required"),
});

/**
 * GET /api/v1/admin/email/suppressions
 * Lists all suppressed and unsubscribed emails with search, reason filters, and lead details.
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = listQuerySchema.safeParse(params);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const { q, reason, page, limit } = parsed.data;
    const SuppressionModel = await getEmailSuppressionModel();
    const LeadModel = await getLeadModel();

    const query: Record<string, unknown> = {};

    if (reason && reason !== "ALL") {
      query.reason = reason;
    }

    if (q && q.trim()) {
      const term = q.trim();
      query.$or = [
        { email: { $regex: term, $options: "i" } },
        { notes: { $regex: term, $options: "i" } },
        { source: { $regex: term, $options: "i" } },
        { blockedBy: { $regex: term, $options: "i" } },
      ];
    }

    const [items, total, statsAggregation] = await Promise.all([
      SuppressionModel.find(query)
        .sort({ blockedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SuppressionModel.countDocuments(query),
      SuppressionModel.aggregate([
        {
          $group: {
            _id: "$reason",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Lookup corresponding lead documents for richer UI display
    const emails = items.map((item) => item.email);
    const leads = emails.length > 0
      ? await LeadModel.find({ email: { $in: emails } }).lean()
      : [];

    const leadMap = new Map(leads.map((lead) => [lead.email?.toLowerCase().trim(), lead]));

    const enrichedItems = items.map((item) => {
      const normalizedEmail = item.email.toLowerCase().trim();
      const lead = leadMap.get(normalizedEmail);
      return {
        _id: String(item._id),
        email: item.email,
        reason: item.reason,
        source: item.source,
        blockedAt: item.blockedAt || item.createdAt,
        blockedBy: item.blockedBy,
        isPermanent: item.isPermanent,
        notes: item.notes,
        createdAt: item.createdAt,
        lead: lead
          ? {
              _id: String(lead._id),
              firstName: lead.firstName,
              lastName: lead.lastName,
              country: lead.country,
              phone: lead.phone,
              phoneCountry: lead.phoneCountry,
              brand: lead.brand,
              emailSentCount: lead.emailSentCount || 0,
              lastEmailSentAt: lead.lastEmailSentAt,
            }
          : null,
      };
    });

    const statsMap: Record<string, number> = {
      total: 0,
      unsubscribed: 0,
      manualBlock: 0,
      hardFailure: 0,
      complaint: 0,
      other: 0,
    };

    for (const group of statsAggregation) {
      const r = group._id as string;
      const cnt = group.count as number;
      statsMap.total += cnt;
      if (r === "UNSUBSCRIBED") statsMap.unsubscribed = cnt;
      else if (r === "MANUAL_BLOCK") statsMap.manualBlock = cnt;
      else if (r === "HARD_FAILURE") statsMap.hardFailure = cnt;
      else if (r === "COMPLAINT") statsMap.complaint = cnt;
      else statsMap.other += cnt;
    }

    return apiSuccess({
      items: enrichedItems,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
      stats: statsMap,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to load suppression records", 500);
  }
}, PERMISSIONS.MARKETING_READ);

/**
 * DELETE /api/v1/admin/email/suppressions
 * Removes an email from suppression, restoring eligibility and clearing isSuppressed on leads.
 */
export const DELETE = withAuth(async (request: NextRequest, ctx) => {
  try {
    let email: string | null = request.nextUrl.searchParams.get("email");

    if (!email) {
      const body = await request.json().catch(() => ({}));
      const parsed = deleteSuppressionSchema.safeParse(body);
      if (parsed.success) {
        email = parsed.data.email;
      }
    }

    if (!email) {
      return apiError("Email address to unsuppress is required.");
    }

    const normalized = normalizeEmail(email);
    await unsuppressEmail(normalized, ctx.user.email);

    // Return the lead record if available so the client can immediately trigger outreach
    const LeadModel = await getLeadModel();
    const lead = await LeadModel.findOne({ email: normalized }).lean();

    return apiSuccess({
      email: normalized,
      unsuppressed: true,
      lead: lead
        ? {
            _id: String(lead._id),
            email: lead.email,
            firstName: lead.firstName,
            lastName: lead.lastName,
            country: lead.country,
            phone: lead.phone,
          }
        : null,
      message: `Successfully removed unsubscribe status for ${normalized}.`,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to remove email suppression", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

/**
 * POST /api/v1/admin/email/suppressions
 * Manually adds an email address to the suppression list.
 */
export const POST = withAuth(async (request: NextRequest, ctx) => {
  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = createSuppressionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const { email, reason, notes } = parsed.data;
    const normalized = normalizeEmail(email);

    await suppressEmail({
      email: normalized,
      reason: reason as SuppressionReason,
      source: "admin_manual_suppression",
      actor: ctx.user.email,
      notes: notes || "Manually added to suppression list by admin",
    });

    return apiSuccess({
      email: normalized,
      reason,
      message: `Successfully suppressed ${normalized}.`,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to add email suppression", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);
