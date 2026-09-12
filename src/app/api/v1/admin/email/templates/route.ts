import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getEmailTemplateModel } from "@/models/EmailTemplate";
import { renderEmailDocument } from "@/lib/email/document-renderer";
import { createSimpleEmailDocument } from "@/lib/email/document-defaults";
import type { EmailDocument } from "@/lib/email/document-schema";
import { getRequestSiteUrl } from "@/lib/url";

const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").trim(),
  templateType: z.enum(["visual", "simple"]).default("visual"),
  category: z.string().trim().default("general_promotion"),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  subjectTemplate: z.string().min(1, "Subject is required"),
  previewTextTemplate: z.string().optional(),
  headlineTemplate: z.string().optional(),
  bodyTemplate: z.string().optional().default(""),
  ctaTemplate: z.string().optional(),
  ctaUrlTemplate: z.string().optional(),
  emailDocument: z.record(z.string(), z.unknown()).optional(),
  translations: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().default(true),
});

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const TemplateModel = await getEmailTemplateModel();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const type = searchParams.get("type");
    const q = searchParams.get("q")?.trim();
    const includeArchived = searchParams.get("archived") === "true";

    const query: Record<string, unknown> = {};
    if (!includeArchived) {
      query.isArchived = { $ne: true };
    }
    if (category && category !== "ALL") {
      query.category = category;
    }
    if (type && (type === "visual" || type === "simple")) {
      query.templateType = type;
    }
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { subjectTemplate: { $regex: q, $options: "i" } },
      ];
    }

    const templates = await TemplateModel.find(query).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({
      success: true,
      templates,
      data: { templates },
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to load templates", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

export const POST = withAuth(async (request: NextRequest, ctx) => {
  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = createTemplateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const data = parsed.data;
    const TemplateModel = await getEmailTemplateModel();

    let emailDocument = data.emailDocument;
    if (data.templateType === "simple" && !emailDocument) {
      emailDocument = createSimpleEmailDocument(
        data.subjectTemplate,
        data.bodyTemplate || "",
        {
          previewText: data.previewTextTemplate,
          buttonText: data.ctaTemplate,
          buttonUrl: data.ctaUrlTemplate,
        }
      ) as unknown as Record<string, unknown>;
    }

    let previewHtml = "";
    if (emailDocument) {
      try {
        const renderResult = renderEmailDocument(emailDocument as unknown as EmailDocument, {
          baseUrl: getRequestSiteUrl(request),
        });
        previewHtml = renderResult.html;
      } catch {
        // Continue even if preview generation fails
      }
    }

    const template = await TemplateModel.create({
      name: data.name,
      templateType: data.templateType,
      category: data.category,
      description: data.description,
      tags: data.tags || [],
      subjectTemplate: data.subjectTemplate,
      previewTextTemplate: data.previewTextTemplate,
      headlineTemplate: data.headlineTemplate,
      bodyTemplate: data.bodyTemplate || data.subjectTemplate,
      ctaTemplate: data.ctaTemplate,
      ctaUrlTemplate: data.ctaUrlTemplate,
      emailDocument,
      translations: data.translations || (emailDocument as any)?.translations || {},
      previewHtml,
      isActive: data.isActive,
      isArchived: false,
      createdBy: ctx.user.email,
    });

    return NextResponse.json(
      {
        success: true,
        template,
        data: { template },
      },
      { status: 201 }
    );
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to create template", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);
