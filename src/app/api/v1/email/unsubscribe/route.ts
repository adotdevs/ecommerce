import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api/response";
import { verifyUnsubscribeToken } from "@/lib/email/tracking";
import { suppressEmail } from "@/lib/email/suppression";

const schema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const payload = verifyUnsubscribeToken(parsed.data.token);
    if (!payload || !payload.email) {
      return apiError("Invalid or expired unsubscribe link.", 400);
    }

    await suppressEmail({
      email: payload.email,
      reason: "UNSUBSCRIBED",
      source: "one_click_unsubscribe",
      leadId: payload.leadId,
      actor: payload.email,
      notes: "Recipient clicked unsubscribe link",
    });

    return apiSuccess({
      email: payload.email,
      unsubscribed: true,
      message: "You have been successfully unsubscribed from marketing emails.",
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to unsubscribe", 500);
  }
}
