import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { HomepageSection } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";
import { runSectionTranslation } from "@/lib/cms/homepage-translate";

/** MyMemory free tier needs many sequential requests — allow up to 5 minutes */
export const maxDuration = 300;

export const POST = withAuth(async (_request, { params }) => {
  const id = params?.id;
  if (!id) return apiError("Section ID required", 400);

  await connectDB();
  const section = await HomepageSection.findById(id);
  if (!section) return apiNotFound();

  await runSectionTranslation(id);

  const updated = await HomepageSection.findById(id).lean();
  return apiSuccess(updated);
}, PERMISSIONS.CMS_WRITE);
