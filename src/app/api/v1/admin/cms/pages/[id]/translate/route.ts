import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { connectDB } from "@/lib/db/mongoose";
import { CmsPage } from "@/models";
import { apiSuccess, apiNotFound, apiError } from "@/lib/api/response";
import { runCmsPageTranslation } from "@/lib/cms/cms-page-content";

export const maxDuration = 300;

export const POST = withAuth(async (_request, { params }) => {
  try {
    await connectDB();
    const page = await CmsPage.findById(params?.id);
    if (!page) return apiNotFound();

    await runCmsPageTranslation(String(page._id));
    const updated = await CmsPage.findById(page._id).lean();
    return apiSuccess({ ...updated, _id: updated!._id.toString() });
  } catch {
    return apiError("Translation failed", 500);
  }
}, PERMISSIONS.CMS_WRITE);
