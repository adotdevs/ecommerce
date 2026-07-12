import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { apiSuccess, apiError } from "@/lib/api/response";
import {
  reserveCartLines,
  releaseSessionReservations,
} from "@/lib/inventory/reservations";

const schema = z.object({
  sessionId: z.string().min(1),
  lines: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().optional(),
      quantity: z.number().int().min(0),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const { sessionId, lines } = parsed.data;
    if (!lines.length) {
      await releaseSessionReservations(sessionId);
      return apiSuccess({ lines: [] });
    }

    const results = await reserveCartLines(sessionId, lines);
    return apiSuccess({ lines: results });
  } catch (err) {
    console.error(err);
    return apiError("Failed to reserve stock", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const sessionId =
      request.nextUrl.searchParams.get("sessionId") ??
      (await request.json().catch(() => ({}))).sessionId;

    if (!sessionId) {
      return apiError("sessionId is required");
    }

    await releaseSessionReservations(sessionId);
    return apiSuccess({ released: true });
  } catch (err) {
    console.error(err);
    return apiError("Failed to release stock", 500);
  }
}
