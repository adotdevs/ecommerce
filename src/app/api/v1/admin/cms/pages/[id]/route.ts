import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { CmsPage, type ICmsPage } from "@/models/CmsPage";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";
import { runCmsPageTranslation } from "@/lib/cms/cms-page-content";
import { isCmsPageSlug } from "@/lib/cms/cms-pages";

function syncFromContent(body: Record<string, unknown>) {
  const content = body.content as Record<string, unknown> | undefined;
  if (!content || typeof content !== "object") return;

  if (typeof content.pageTitle === "string" && content.pageTitle.trim()) {
    body.title = content.pageTitle;
  }
  body.seo = {
    ...(typeof body.seo === "object" && body.seo ? body.seo : {}),
    title: typeof content.seoTitle === "string" ? content.seoTitle : undefined,
    description:
      typeof content.seoDescription === "string" ? content.seoDescription : undefined,
  };

  const slug = body.slug as string | undefined;
  if (slug && isCmsPageSlug(slug)) {
    if (slug === "about") {
      body.blocks = [
        {
          id: "hero-1",
          type: "hero",
          config: {
            title: content.heroTitle ?? "",
            subtitle: content.heroSubtitle ?? "",
            image: content.heroImage ?? "",
          },
        },
        {
          id: "text-1",
          type: "text",
          config: { content: content.introBody ?? "" },
        },
      ];
    } else {
      body.blocks = [
        {
          id: "text-1",
          type: "text",
          config: { content: content.intro ?? "" },
        },
      ];
    }
  }
}

export const GET = withAuth(async (_request, { params }) => {
  await connectDB();
  const page = await CmsPage.findById(params?.id).lean();
  if (!page) return apiNotFound();
  return apiSuccess({ ...page, _id: page._id.toString() });
}, PERMISSIONS.CMS_READ);

export const PATCH = withAuth(async (request: NextRequest, { params }) => {
  try {
    await connectDB();
    const body = await request.json();
    const page = await CmsPage.findById(params?.id);
    if (!page) return apiNotFound();

    if (body.content && typeof body.content === "object") {
      page.content = body.content;
      page.title =
        typeof body.content.pageTitle === "string" && body.content.pageTitle.trim()
          ? body.content.pageTitle
          : page.title;
      page.seo = {
        ...page.seo,
        title:
          typeof body.content.seoTitle === "string"
            ? body.content.seoTitle
            : page.seo?.title,
        description:
          typeof body.content.seoDescription === "string"
            ? body.content.seoDescription
            : page.seo?.description,
      };
      const syncBody: Record<string, unknown> = {
        content: body.content,
        slug: page.slug,
      };
      syncFromContent(syncBody);
      if (Array.isArray(syncBody.blocks)) {
        page.blocks = syncBody.blocks as ICmsPage["blocks"];
      }
    }

    if (body.translations && typeof body.translations === "object") {
      page.translations = {
        ...(page.translations ?? {}),
        ...body.translations,
      };
      page.translationStatus = "completed";
    }

    if (body.status) {
      page.status = body.status;
      if (body.status === "published") page.publishedAt = new Date();
    }

    await page.save();

    if (body.retranslate === true) {
      await runCmsPageTranslation(String(page._id));
    }

    const updated = await CmsPage.findById(page._id).lean();
    return apiSuccess({ ...updated, _id: updated!._id.toString() });
  } catch {
    return apiError("Failed to update page", 500);
  }
}, PERMISSIONS.CMS_WRITE);

export const DELETE = withAuth(async (_request, { params }) => {
  await connectDB();
  await CmsPage.findByIdAndDelete(params?.id);
  return apiSuccess({ deleted: true });
}, PERMISSIONS.CMS_WRITE);
