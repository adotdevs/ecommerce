import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { PromoCode } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";
import { normalizePromoCode } from "@/lib/promo/validate";

const updateSchema = z.object({
  code: z.string().min(2).max(32).optional(),
  percentOff: z.number().min(1).max(100).optional(),
  active: z.boolean().optional(),
  minOrderUsd: z.number().min(0).optional().nullable(),
  maxUses: z.number().int().min(1).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  description: z.string().max(200).optional().nullable(),
});

export const PATCH = withAuth(async (request: NextRequest, { params }) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const update: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.code) update.code = normalizePromoCode(parsed.data.code);
    if (parsed.data.expiresAt !== undefined) {
      update.expiresAt = parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null;
    }

    const promo = await PromoCode.findByIdAndUpdate(
      params?.id,
      { $set: update },
      { new: true }
    ).lean();

    if (!promo) return apiNotFound();
    return apiSuccess(promo);
  } catch {
    return apiError("Failed to update promo code", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

export const DELETE = withAuth(async (_request, { params }) => {
  await connectDB();
  await PromoCode.findByIdAndDelete(params?.id);
  return apiSuccess({ deleted: true });
}, PERMISSIONS.MARKETING_WRITE);
