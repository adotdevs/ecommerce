import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import {
  computeMerchandisingSuggestions,
  applyMerchandisingSuggestions,
} from "@/lib/admin/merchandising-ai";
import { z } from "zod";

const schema = z.object({
  apply: z.boolean().optional(),
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    const apply = parsed.success ? parsed.data.apply : false;

    const suggestions = await computeMerchandisingSuggestions();

    if (apply) {
      const { updated } = await applyMerchandisingSuggestions(suggestions);
      return apiSuccess({ ...suggestions, applied: true, updated });
    }

    return apiSuccess(suggestions);
  } catch (err) {
    console.error(err);
    return apiError(
      err instanceof Error ? err.message : "Merchandising autopilot failed",
      500
    );
  }
}, PERMISSIONS.PRODUCTS_WRITE);
