import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { CatalogPage } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";
import { runCatalogPageTranslation } from "@/lib/cms/catalog-page-content";

export const GET = withAuth(async (_request, { params }) => {
  await connectDB();
  const page = await CatalogPage.findById(params?.id).lean();
  if (!page) return apiNotFound("Catalog page not found");
  return apiSuccess({ ...page, _id: page._id.toString() });
}, PERMISSIONS.CMS_READ);

export const PATCH = withAuth(async (request: NextRequest, { params }) => {
  try {
    await connectDB();
    const body = await request.json();
    const page = await CatalogPage.findById(params?.id);
    if (!page) return apiNotFound("Catalog page not found");

    if (body.config && typeof body.config === "object") {
      page.config = body.config;
    }
    if (body.translations && typeof body.translations === "object") {
      page.translations = {
        ...(page.translations ?? {}),
        ...body.translations,
      };
      page.translationStatus = "completed";
    }

    await page.save();

    if (body.retranslate === true) {
      await runCatalogPageTranslation(String(page._id));
    }

    const updated = await CatalogPage.findById(page._id).lean();
    return apiSuccess({ ...updated, _id: updated!._id.toString() });
  } catch {
    return apiError("Failed to update catalog page", 500);
  }
}, PERMISSIONS.CMS_WRITE);
