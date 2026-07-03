import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { SiteSettings } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";

export const PATCH = withAuth(async (request) => {
  try {
    await connectDB();
    const body = await request.json();
    const settings = await SiteSettings.findOneAndUpdate(
      { key: "global" },
      { $set: body },
      { upsert: true, new: true }
    ).lean();
    return apiSuccess(settings);
  } catch {
    return apiError("Failed to update settings", 500);
  }
}, PERMISSIONS.SETTINGS_WRITE);
