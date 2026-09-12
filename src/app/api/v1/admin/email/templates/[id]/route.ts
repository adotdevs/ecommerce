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

const updateTemplateSchema = z.object({
  name: z.string().min(1).trim().optional(),
  templateType: z.enum(["visual", "simple"]).optional(),
  category: z.string().trim().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  subjectTemplate: z.string().min(1).optional(),
  previewTextTemplate: z.string().optional(),
  headlineTemplate: z.string().optional(),
  bodyTemplate: z.string().optional(),
  ctaTemplate: z.string().optional(),
  ctaUrlTemplate: z.string().optional(),
  emailDocument: z.record(z.string(), z.unknown()).optional(),
  translations: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const GET = withAuth(async (_request: NextRequest, ctx) => {
  try {
    const id = ctx.params?.id;
    const TemplateModel = await getEmailTemplateModel();
    const template = await TemplateModel.findById(id).lean();
    if (!template) {
      return apiError("Template not found", 404);
    }
    return NextResponse.json({
      success: true,
      template,
      data: { template },
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to load template", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

export const PUT = withAuth(async (request: NextRequest, ctx) => {
  try {
    const id = ctx.params?.id;
    const rawBody = await request.json().catch(() => ({}));
    const parsed = updateTemplateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const TemplateModel = await getEmailTemplateModel();
    const existing = await TemplateModel.findById(id);
    if (!existing) {
      return apiError("Template not found", 404);
    }

    const data = parsed.data;
    if (data.name !== undefined) existing.name = data.name;
    if (data.templateType !== undefined) existing.templateType = data.templateType;
    if (data.category !== undefined) existing.category = data.category;
    if (data.description !== undefined) existing.description = data.description;
    if (data.tags !== undefined) existing.tags = data.tags;
    if (data.subjectTemplate !== undefined) existing.subjectTemplate = data.subjectTemplate;
    if (data.previewTextTemplate !== undefined) existing.previewTextTemplate = data.previewTextTemplate;
    if (data.headlineTemplate !== undefined) existing.headlineTemplate = data.headlineTemplate;
    if (data.bodyTemplate !== undefined) existing.bodyTemplate = data.bodyTemplate;
    if (data.ctaTemplate !== undefined) existing.ctaTemplate = data.ctaTemplate;
    if (data.ctaUrlTemplate !== undefined) existing.ctaUrlTemplate = data.ctaUrlTemplate;
    if (data.isActive !== undefined) existing.isActive = data.isActive;
    if (data.isArchived !== undefined) existing.isArchived = data.isArchived;
    if (data.translations !== undefined) existing.translations = data.translations;

    if (data.emailDocument) {
      existing.emailDocument = data.emailDocument;
      try {
        const rendered = renderEmailDocument(data.emailDocument as unknown as EmailDocument, {
          baseUrl: getRequestSiteUrl(request),
        });
        existing.previewHtml = rendered.html;
      } catch {
        // preserve existing snapshot if rendering fails
      }
    } else if (existing.templateType === "simple" && data.bodyTemplate !== undefined) {
      // Re-generate emailDocument for simple templates if body updated
      const generatedDoc = createSimpleEmailDocument(
        existing.subjectTemplate,
        existing.bodyTemplate,
        {
          previewText: existing.previewTextTemplate,
          buttonText: existing.ctaTemplate,
          buttonUrl: existing.ctaUrlTemplate,
        }
      );
      existing.emailDocument = generatedDoc as unknown as Record<string, unknown>;
      try {
        const rendered = renderEmailDocument(generatedDoc, {
          baseUrl: getRequestSiteUrl(request),
        });
        existing.previewHtml = rendered.html;
      } catch {
        // Ignore
      }
    }

    await existing.save();
    return NextResponse.json({
      success: true,
      template: existing,
      data: { template: existing },
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to update template", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

export const POST = withAuth(async (request: NextRequest, ctx) => {
  // Action handler: Duplicate template
  try {
    const id = ctx.params?.id;
    const TemplateModel = await getEmailTemplateModel();
    const existing = await TemplateModel.findById(id).lean();
    if (!existing) {
      return apiError("Template not found", 404);
    }

    const copyName = `${existing.name} (Copy)`;
    const duplicated = await TemplateModel.create({
      ...existing,
      _id: undefined,
      name: copyName,
      createdAt: undefined,
      updatedAt: undefined,
      createdBy: ctx.user.email,
    });

    return NextResponse.json(
      {
        success: true,
        template: duplicated,
        data: { template: duplicated },
      },
      { status: 201 }
    );
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to duplicate template", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

export const DELETE = withAuth(async (_request: NextRequest, ctx) => {
  try {
    const id = ctx.params?.id;
    const TemplateModel = await getEmailTemplateModel();
    const template = await TemplateModel.findByIdAndUpdate(
      id,
      { isArchived: true, isActive: false },
      { new: true }
    );
    if (!template) {
      return apiError("Template not found", 404);
    }
    return apiSuccess({ message: "Template archived", template });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to delete template", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);
