import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { SiteSettings } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { normalizeShippingSettings } from "@/lib/shipping/settings";
import { normalizeContactLocations } from "@/lib/site/contact-locations";

export const PATCH = withAuth(async (request) => {
  try {
    await connectDB();
    const body = await request.json();

    if (body.shipping != null) {
      body.shipping = normalizeShippingSettings(body.shipping);
    }
    if (body.contactLocations != null) {
      body.contactLocations = normalizeContactLocations(body.contactLocations);
    }

    const settings = await SiteSettings.findOneAndUpdate(
      { key: "global" },
      { $set: body },
      { upsert: true, new: true, strict: false }
    ).lean();
    return apiSuccess(settings);
  } catch {
    return apiError("Failed to update settings", 500);
  }
}, PERMISSIONS.SETTINGS_WRITE);
