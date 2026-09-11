import { NextRequest } from "next/server";
import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getLeadModel } from "@/models/Lead";
import { normalizeCountryName } from "@/lib/leads/countries";
import {
  normalizeEmail,
  normalizePhone,
  enrichPhoneFields,
  normalizeString,
  normalizeTags,
} from "@/lib/leads/normalize";

const updateLeadSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  email: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  brand: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  status: z.string().trim().optional(),
  agent: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  tags: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  source: z.string().trim().optional(),
  isSuppressed: z.boolean().optional(),
  suppressionReason: z.string().trim().optional().nullable(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(
  async (_request: NextRequest, ctx) => {
    try {
      const id = ctx.params?.id || "";
      if (!isValidObjectId(id)) {
        return apiError("Invalid lead ID", 400);
      }

      const Lead = await getLeadModel();
      const lead = await Lead.findById(id).lean();
      if (!lead) {
        return apiError("Lead not found", 404);
      }

      return apiSuccess(lead);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch lead";
      return apiError(message, 500);
    }
  },
  PERMISSIONS.MARKETING_WRITE
);

export const PUT = withAuth(
  async (request: NextRequest, ctx) => {
    try {
      const id = ctx.params?.id || "";
      if (!isValidObjectId(id)) {
        return apiError("Invalid lead ID", 400);
      }

      const Lead = await getLeadModel();
      const existingLead = await Lead.findById(id);
      if (!existingLead) {
        return apiError("Lead not found", 404);
      }

      const body = await request.json().catch(() => ({}));
      const parsed = updateLeadSchema.safeParse(body);
      if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message || "Invalid update data", 400);
      }

      const data = parsed.data;

      // Handle email
      let nextEmail = existingLead.email;
      if (data.email !== undefined) {
        nextEmail = data.email ? normalizeEmail(data.email) : undefined;
      }

      // Handle phone
      let nextPhone = existingLead.phone;
      let phoneCountry = existingLead.phoneCountry;
      let phoneDialCode = existingLead.phoneDialCode;
      let phoneLength = existingLead.phoneLength;

      if (data.phone !== undefined) {
        const rawPhone = normalizeString(data.phone);
        nextPhone = rawPhone ? normalizePhone(rawPhone) : undefined;
        if (nextPhone) {
          const enriched = enrichPhoneFields(nextPhone);
          phoneCountry = enriched.phoneCountry;
          phoneDialCode = enriched.phoneDialCode;
          phoneLength = enriched.phoneLength;
        } else {
          phoneCountry = undefined;
          phoneDialCode = undefined;
          phoneLength = undefined;
        }
      }

      // At least one identifier must remain
      if (!nextEmail && !nextPhone) {
        return apiError(
          "A lead must have at least one valid email address or phone number.",
          400
        );
      }

      // Duplicate check against other leads
      const duplicateChecks: Record<string, unknown>[] = [];
      if (nextEmail && nextEmail !== existingLead.email) {
        duplicateChecks.push({ email: nextEmail });
      }
      if (nextPhone && nextPhone !== existingLead.phone) {
        duplicateChecks.push({ phone: nextPhone });
      }

      if (duplicateChecks.length > 0) {
        const duplicate = await Lead.findOne({
          _id: { $ne: id },
          $or: duplicateChecks,
        }).lean();

        if (duplicate) {
          if (nextEmail && duplicate.email === nextEmail) {
            return apiError(`A lead with email "${nextEmail}" already exists.`, 409);
          }
          if (nextPhone && duplicate.phone === nextPhone) {
            return apiError(`A lead with phone "${nextPhone}" already exists.`, 409);
          }
          return apiError("A lead with this email or phone already exists.", 409);
        }
      }

      // Prepare updates
      const $set: Record<string, unknown> = {};
      const $unset: Record<string, 1> = {};

      if (data.firstName !== undefined) {
        const val = normalizeString(data.firstName);
        if (val) $set.firstName = val;
        else $unset.firstName = 1;
      }
      if (data.lastName !== undefined) {
        const val = normalizeString(data.lastName);
        if (val) $set.lastName = val;
        else $unset.lastName = 1;
      }

      if (data.email !== undefined) {
        if (nextEmail) $set.email = nextEmail;
        else $unset.email = 1;
      }

      if (data.phone !== undefined) {
        if (nextPhone) {
          $set.phone = nextPhone;
          if (phoneCountry) $set.phoneCountry = phoneCountry;
          else $unset.phoneCountry = 1;
          if (phoneDialCode) $set.phoneDialCode = phoneDialCode;
          else $unset.phoneDialCode = 1;
          if (phoneLength != null) $set.phoneLength = phoneLength;
          else $unset.phoneLength = 1;
        } else {
          $unset.phone = 1;
          $unset.phoneCountry = 1;
          $unset.phoneDialCode = 1;
          $unset.phoneLength = 1;
        }
      }

      if (data.country !== undefined) {
        const raw = normalizeString(data.country);
        const canon = raw ? normalizeCountryName(raw) || raw : undefined;
        if (canon) $set.country = canon;
        else $unset.country = 1;
      }
      if (data.brand !== undefined) {
        const val = normalizeString(data.brand);
        if (val) $set.brand = val;
        else $unset.brand = 1;
      }
      if (data.address !== undefined) {
        const val = normalizeString(data.address);
        if (val) $set.address = val;
        else $unset.address = 1;
      }
      if (data.status !== undefined) {
        $set.status = normalizeString(data.status) || "New";
      }
      if (data.agent !== undefined) {
        const val = normalizeString(data.agent);
        if (val) $set.agent = val;
        else $unset.agent = 1;
      }
      if (data.notes !== undefined) {
        const val = normalizeString(data.notes);
        if (val) $set.notes = val;
        else $unset.notes = 1;
      }
      if (data.tags !== undefined) {
        const val = normalizeTags(data.tags);
        if (val && val.length) $set.tags = val;
        else $unset.tags = 1;
      }
      if (data.source !== undefined) {
        const val = normalizeString(data.source);
        if (val) $set.source = val;
      }
      if (data.isSuppressed !== undefined) {
        $set.isSuppressed = Boolean(data.isSuppressed);
      }
      if (data.suppressionReason !== undefined) {
        const val = normalizeString(data.suppressionReason);
        if (val) $set.suppressionReason = val;
        else $unset.suppressionReason = 1;
      }

      const updateOp: Record<string, unknown> = {};
      if (Object.keys($set).length > 0) updateOp.$set = $set;
      if (Object.keys($unset).length > 0) updateOp.$unset = $unset;

      const updated = await Lead.findByIdAndUpdate(id, updateOp, {
        new: true,
        runValidators: true,
      }).lean();

      return apiSuccess(updated);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
        return apiError("A lead with this email or phone already exists.", 409);
      }
      const message = err instanceof Error ? err.message : "Failed to update lead";
      return apiError(message, 500);
    }
  },
  PERMISSIONS.MARKETING_WRITE
);

export const DELETE = withAuth(
  async (_request: NextRequest, ctx) => {
    try {
      const id = ctx.params?.id || "";
      if (!isValidObjectId(id)) {
        return apiError("Invalid lead ID", 400);
      }

      const Lead = await getLeadModel();
      const deleted = await Lead.findByIdAndDelete(id).lean();
      if (!deleted) {
        return apiError("Lead not found", 404);
      }

      return apiSuccess({ deleted: 1, id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete lead";
      return apiError(message, 500);
    }
  },
  PERMISSIONS.MARKETING_WRITE
);
