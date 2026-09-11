import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getEmailTemplateModel } from "@/models/EmailTemplate";
import { renderEmailDocument } from "@/lib/email/document-renderer";
import type { EmailDocument } from "@/lib/email/document-schema";

const updateTemplateSchema = z.object({
  name: z.string().min(1).trim().optional(),
  category: z.string().trim().optional(),
  description: z.string().optional(),
  subjectTemplate: z.string().min(1).optional(),
  previewTextTemplate: z.string().optional(),
  headlineTemplate: z.string().optional(),
  bodyTemplate: z.string().optional(),
  ctaTemplate: z.string().optional(),
  ctaUrlTemplate: z.string().optional(),
  emailDocument: z.record(z.string(), z.unknown()).optional(),
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
    return apiSuccess({ template });
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
    if (data.category !== undefined) existing.category = data.category;
    if (data.description !== undefined) existing.description = data.description;
    if (data.subjectTemplate !== undefined) existing.subjectTemplate = data.subjectTemplate;
    if (data.previewTextTemplate !== undefined) existing.previewTextTemplate = data.previewTextTemplate;
    if (data.headlineTemplate !== undefined) existing.headlineTemplate = data.headlineTemplate;
    if (data.bodyTemplate !== undefined) existing.bodyTemplate = data.bodyTemplate;
    if (data.ctaTemplate !== undefined) existing.ctaTemplate = data.ctaTemplate;
    if (data.ctaUrlTemplate !== undefined) existing.ctaUrlTemplate = data.ctaUrlTemplate;
    if (data.isActive !== undefined) existing.isActive = data.isActive;
    if (data.isArchived !== undefined) existing.isArchived = data.isArchived;

    if (data.emailDocument) {
      existing.emailDocument = data.emailDocument;
      try {
        const rendered = renderEmailDocument(data.emailDocument as unknown as EmailDocument);
        existing.previewHtml = rendered.html;
      } catch {
        // preserve existing snapshot if rendering fails
      }
    }

    await existing.save();
    return apiSuccess({ template: existing });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to update template", 500);
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
