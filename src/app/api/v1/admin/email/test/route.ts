import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { renderEmail } from "@/lib/email/render";
import { renderEmailDocument } from "@/lib/email/document-renderer";
import type { EmailDocument } from "@/lib/email/document-schema";
import { sendOutreachEmail } from "@/lib/email/sender";
import { getEmailSettings } from "@/lib/email/settings";
import { getRequestSiteUrl } from "@/lib/url";

const testEmailSchema = z.object({
  recipientEmail: z.string().email(),
  subject: z.string().min(1),
  previewText: z.string().optional(),
  headline: z.string().optional(),
  body: z.string().optional().default(""),
  bodyText: z.string().optional(),
  ctaText: z.string().optional(),
  ctaUrl: z.string().optional(),
  couponCode: z.string().optional(),
  emailDocument: z.record(z.string(), z.unknown()).optional(),
  product: z
    .object({
      name: z.string().optional(),
      image: z.string().optional(),
      price: z.number().optional(),
      salePrice: z.number().optional(),
      description: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
});

export const POST = withAuth(async (request: NextRequest, ctx) => {
  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = testEmailSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const {
      recipientEmail,
      subject,
      previewText,
      headline,
      body,
      bodyText,
      ctaText,
      ctaUrl,
      couponCode,
      product,
      emailDocument,
    } = parsed.data;

    const settings = await getEmailSettings();
    const effectiveBody = (body || bodyText || "This is a live test email sent from your Findora ecommerce outreach system.").trim();

    let renderedSubject = `[TEST] ${subject}`;
    let renderedHtml = "";
    let renderedText = "";

    const baseUrl = getRequestSiteUrl(request);

    if (emailDocument) {
      const docResult = renderEmailDocument(emailDocument as unknown as EmailDocument, {
        personalization: {
          firstName: "Admin",
          lastName: "Test",
          email: recipientEmail,
        },
        recipientEmail,
        baseUrl,
      });
      renderedSubject = `[TEST] ${docResult.subject || subject}`;
      renderedHtml = docResult.html;
      renderedText = docResult.text;
    } else {
      const rendered = renderEmail({
        subject: `[TEST] ${subject}`,
        previewText,
        headline,
        body: effectiveBody,
        ctaText,
        ctaUrl,
        couponCode,
        footerCopy: `[TEST EMAIL sent by ${ctx.user.email}] ${settings.defaultFooterCopy}`,
        companyAddress: settings.companyAddress,
        storeName: settings.defaultSenderName,
        product,
        recipient: {
          email: recipientEmail,
          firstName: "Test Admin",
          lastName: "",
        },
        baseUrl,
      });
      renderedSubject = rendered.subject;
      renderedHtml = rendered.html;
      renderedText = rendered.text;
    }

    const result = await sendOutreachEmail({
      to: recipientEmail,
      subject: renderedSubject,
      html: renderedHtml,
      text: renderedText,
      fromName: `${settings.defaultSenderName} (Test)`,
      fromEmail: settings.defaultSenderEmail,
      replyTo: settings.defaultReplyTo,
    });

    if (!result.success) {
      return apiError(
        result.sanitizedError || "Failed to send test email via SMTP.",
        502
      );
    }

    return apiSuccess({
      message: `Test email successfully sent to ${recipientEmail}`,
      messageId: result.messageId,
      durationMs: result.durationMs,
    });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed to send test email", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);
