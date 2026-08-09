import { connectDB } from "@/lib/db/mongoose";
import { CmsPage } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess } from "@/lib/api/response";
import { ensureCmsPages } from "@/lib/cms/cms-page-content";
import { DEFAULT_CMS_PAGES } from "@/lib/cms/cms-pages";

export const GET = withAuth(async () => {
  await ensureCmsPages();
  await connectDB();
  const pages = await CmsPage.find().sort({ slug: 1 }).lean();
  return apiSuccess(
    pages.map((p) => ({
      ...p,
      _id: p._id.toString(),
      defaults: DEFAULT_CMS_PAGES[p.slug as keyof typeof DEFAULT_CMS_PAGES],
    }))
  );
}, PERMISSIONS.CMS_READ);
