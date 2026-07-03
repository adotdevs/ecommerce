import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { CmsPage } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { cmsPageSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (slug) {
    const page = await CmsPage.findOne({ slug, status: "published" }).lean();
    if (!page) return apiNotFound();
    return apiSuccess(page);
  }

  const pages = await CmsPage.find({ status: "published" })
    .select("title slug publishedAt")
    .lean();
  return apiSuccess(pages);
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = cmsPageSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const slug = parsed.data.slug ?? slugify(parsed.data.title);
    const page = await CmsPage.create({
      ...parsed.data,
      slug,
      publishedAt: parsed.data.status === "published" ? new Date() : undefined,
    });
    return apiSuccess(page, 201);
  } catch {
    return apiError("Failed to create page", 500);
  }
}, PERMISSIONS.CMS_WRITE);
