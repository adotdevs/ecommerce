import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { HomepageSection } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";

export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const { sections } = await request.json();
    if (!Array.isArray(sections)) return apiError("Invalid payload");

    await Promise.all(
      sections.map((s: { id: string; order: number }) =>
        HomepageSection.findByIdAndUpdate(s.id, { order: s.order })
      )
    );

    const updated = await HomepageSection.find().sort({ order: 1 }).lean();
    return apiSuccess(updated);
  } catch {
    return apiError("Failed to reorder sections", 500);
  }
}, PERMISSIONS.CMS_WRITE);
