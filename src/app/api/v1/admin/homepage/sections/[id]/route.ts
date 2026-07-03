import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { HomepageSection } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";
import { runSectionTranslation } from "@/lib/cms/homepage-translate";
import { normalizeSectionConfig } from "@/lib/cms/normalize-section-config";

export const GET = withAuth(async (_request, { params }) => {
  await connectDB();
  const section = await HomepageSection.findById(params?.id).lean();
  if (!section) return apiNotFound();
  return apiSuccess(section);
}, PERMISSIONS.CMS_READ);

export const PATCH = withAuth(async (request: NextRequest, { params }) => {
  try {
    await connectDB();
    const body = await request.json();
    const { retranslate = false, translations: translationsPatch, ...updates } = body;

    const existing = await HomepageSection.findById(params?.id);
    if (!existing) return apiNotFound();

    const setPayload: Record<string, unknown> = { ...updates };

    if (updates.config && existing.type) {
      setPayload.config = normalizeSectionConfig(
        existing.type,
        updates.config as Record<string, unknown>
      );
    }

    if (translationsPatch && typeof translationsPatch === "object") {
      setPayload.translations = {
        ...(existing.translations as object),
        ...translationsPatch,
      };
      setPayload.translationStatus = "completed";
      setPayload.lastTranslatedAt = new Date();
    }

    const section = await HomepageSection.findByIdAndUpdate(
      params?.id,
      { $set: setPayload },
      { new: true }
    );

    if (!section) return apiNotFound();

    if (retranslate && updates.config) {
      await runSectionTranslation(section._id.toString());
    }

    const refreshed = await HomepageSection.findById(params?.id).lean();
    return apiSuccess(refreshed);
  } catch {
    return apiError("Failed to update section", 500);
  }
}, PERMISSIONS.CMS_WRITE);

export const DELETE = withAuth(async (_request, { params }) => {
  await connectDB();
  await HomepageSection.findByIdAndDelete(params?.id);
  return apiSuccess({ deleted: true });
}, PERMISSIONS.CMS_WRITE);
