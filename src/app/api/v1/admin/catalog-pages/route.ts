import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { CatalogPage } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { ensureCatalogPages, runCatalogPageTranslation } from "@/lib/cms/catalog-page-content";
import { DEFAULT_CATALOG_PAGES } from "@/lib/cms/catalog-pages";

export const GET = withAuth(async () => {
  await ensureCatalogPages();
  const pages = await CatalogPage.find().sort({ slug: 1 }).lean();
  return apiSuccess(
    pages.map((p) => ({
      ...p,
      _id: p._id.toString(),
      defaults: DEFAULT_CATALOG_PAGES[p.slug as keyof typeof DEFAULT_CATALOG_PAGES],
    }))
  );
}, PERMISSIONS.CMS_READ);

export const POST = withAuth(async () => {
  await ensureCatalogPages();
  const pages = await CatalogPage.find().sort({ slug: 1 }).lean();
  return apiSuccess(pages);
}, PERMISSIONS.CMS_WRITE);
