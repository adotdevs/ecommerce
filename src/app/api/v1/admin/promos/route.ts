import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { PromoCode } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { normalizePromoCode } from "@/lib/promo/validate";

const promoSchema = z.object({
  code: z.string().min(2).max(32),
  percentOff: z.number().min(1).max(100),
  active: z.boolean().optional().default(true),
  minOrderUsd: z.number().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  description: z.string().max(200).optional(),
});

export async function GET() {
  await connectDB();
  const promos = await PromoCode.find().sort({ createdAt: -1 }).lean();
  return apiSuccess(promos);
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = promoSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const code = normalizePromoCode(parsed.data.code);
    const existing = await PromoCode.findOne({ code });
    if (existing) return apiError("Promo code already exists", 409);

    const promo = await PromoCode.create({
      ...parsed.data,
      code,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
    });

    return apiSuccess(promo, 201);
  } catch {
    return apiError("Failed to create promo code", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);
