import type { PersonalizationData, RenderedEmail } from "./types";
import { buildUnsubscribeUrl } from "./tracking";

export function resolveTokens(text: string, data: PersonalizationData): string {
  if (!text) return "";
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = data[key];
    if (val !== undefined && val !== null) {
      return String(val);
    }
    // Return the original token so missing variables can be detected
    return `{{${key}}}`;
  });
}

export function detectMissingTokens(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.replace(/[\{\}\s]/g, ""))));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface RenderTemplateOptions {
  subject: string;
  previewText?: string;
  headline?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  couponCode?: string;
  footerCopy?: string;
  companyAddress?: string;
  storeName?: string;
  product?: {
    name?: string;
    image?: string;
    price?: number;
    salePrice?: number;
    description?: string;
    url?: string;
  };
  recipient: {
    email: string;
    leadId?: string;
    firstName?: string;
    lastName?: string;
  };
  trackingCtaUrl?: string;
}

export function renderEmail(options: RenderTemplateOptions): RenderedEmail {
  const storeName = options.storeName || "Findora";
  const firstName = options.recipient.firstName || "there";
  const lastName = options.recipient.lastName || "";
  const fullName = [options.recipient.firstName, options.recipient.lastName].filter(Boolean).join(" ") || firstName;

  const data: PersonalizationData = {
    firstName,
    lastName,
    fullName,
    email: options.recipient.email,
    productName: options.product?.name || "",
    productPrice: options.product?.price ? `$${options.product.price}` : "",
    salePrice: options.product?.salePrice ? `$${options.product.salePrice}` : "",
    discount:
      options.product?.price && options.product?.salePrice
        ? `${Math.round(((options.product.price - options.product.salePrice) / options.product.price) * 100)}%`
        : "",
    couponCode: options.couponCode || "",
    productUrl: options.product?.url || "",
  };

  const resolvedSubject = resolveTokens(options.subject, data);
  const resolvedPreview = resolveTokens(options.previewText || "", data);
  const resolvedHeadline = resolveTokens(options.headline || "", data);
  const resolvedBody = resolveTokens(options.body, data);
  const resolvedCtaText = resolveTokens(options.ctaText || "Shop Now", data);

  const missingSubject = detectMissingTokens(resolvedSubject);
  const missingBody = detectMissingTokens(resolvedBody);
  const missingHeadline = detectMissingTokens(resolvedHeadline);
  const allMissing = Array.from(new Set([...missingSubject, ...missingBody, ...missingHeadline]));

  const unsubscribeUrl = buildUnsubscribeUrl(options.recipient.email, options.recipient.leadId);
  const ctaUrl = options.trackingCtaUrl || options.ctaUrl || "#";

  // Body paragraphs to HTML
  const bodyParagraphs = resolvedBody
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map(
      (p) =>
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #374151;">${escapeHtml(p).replace(
          /\n/g,
          "<br/>"
        )}</p>`
    )
    .join("");

  // Product block HTML if product exists
  let productHtml = "";
  if (options.product?.name) {
    const hasSale = options.product.salePrice && options.product.price && options.product.salePrice < options.product.price;
    productHtml = `
      <div style="margin: 24px 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #f9fafb; padding: 18px; text-align: center;">
        ${
          options.product.image
            ? `<img src="${escapeHtml(options.product.image)}" alt="${escapeHtml(
                options.product.name
              )}" style="max-width: 100%; height: auto; max-height: 220px; object-fit: contain; border-radius: 8px; margin-bottom: 12px;" />`
            : ""
        }
        <h3 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 600; color: #111827;">${escapeHtml(
          options.product.name
        )}</h3>
        ${
          options.product.description
            ? `<p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280; line-height: 1.4;">${escapeHtml(
                options.product.description.slice(0, 160)
              )}...</p>`
            : ""
        }
        <div style="margin-bottom: 8px;">
          ${
            hasSale
              ? `<span style="font-size: 18px; font-weight: 700; color: #4f46e5; margin-right: 8px;">$${options.product.salePrice}</span>
                 <span style="font-size: 14px; color: #9ca3af; text-decoration: line-through;">$${options.product.price}</span>`
              : options.product.price
              ? `<span style="font-size: 18px; font-weight: 700; color: #111827;">$${options.product.price}</span>`
              : ""
          }
        </div>
      </div>
    `;
  }

  // Coupon box if provided
  let couponHtml = "";
  if (options.couponCode) {
    couponHtml = `
      <div style="margin: 20px 0; padding: 14px; border: 2px dashed #4f46e5; border-radius: 8px; background-color: #eef2ff; text-align: center;">
        <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #4f46e5; font-weight: 600;">Special Promo Code</p>
        <p style="margin: 0; font-size: 20px; font-weight: 800; color: #312e81; letter-spacing: 0.05em;">${escapeHtml(
          options.couponCode
        )}</p>
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(resolvedSubject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader -->
  ${
    resolvedPreview
      ? `<div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-width: 0px; opacity: 0;">${escapeHtml(
          resolvedPreview
        )}</div>`
      : ""
  }
  
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #f3f4f6; background-color: #ffffff; text-align: left;">
              <span style="font-size: 20px; font-weight: 800; color: #4f46e5; letter-spacing: -0.02em;">${escapeHtml(
                storeName
              )}</span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              ${
                resolvedHeadline
                  ? `<h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #111827; line-height: 1.25;">${escapeHtml(
                      resolvedHeadline
                    )}</h1>`
                  : ""
              }
              
              ${bodyParagraphs}
              ${productHtml}
              ${couponHtml}
              
              <!-- CTA Button -->
              ${
                options.ctaText && ctaUrl
                  ? `<div style="margin: 28px 0 12px 0; text-align: center;">
                      <a href="${escapeHtml(ctaUrl)}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 28px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">${escapeHtml(
                      resolvedCtaText
                    )} &rarr;</a>
                    </div>`
                  : ""
              }
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                ${escapeHtml(options.footerCopy || `You received this email from ${storeName}.`)}
              </p>
              ${
                options.companyAddress
                  ? `<p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">${escapeHtml(
                      options.companyAddress
                    )}</p>`
                  : ""
              }
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                <a href="${escapeHtml(
                  unsubscribeUrl
                )}" style="color: #6b7280; text-decoration: underline;">Unsubscribe from marketing emails</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Plain-text fallback
  const textLines: string[] = [];
  if (resolvedHeadline) textLines.push(resolvedHeadline, "");
  textLines.push(resolvedBody, "");
  if (options.product?.name) {
    textLines.push(`Featured: ${options.product.name}`);
    if (options.product.price) textLines.push(`Price: $${options.product.salePrice || options.product.price}`);
    textLines.push("");
  }
  if (options.couponCode) {
    textLines.push(`Promo Code: ${options.couponCode}`, "");
  }
  if (options.ctaText && ctaUrl) {
    textLines.push(`${resolvedCtaText}: ${ctaUrl}`, "");
  }
  textLines.push("---");
  textLines.push(options.footerCopy || `You received this email from ${storeName}.`);
  if (options.companyAddress) textLines.push(options.companyAddress);
  textLines.push(`Unsubscribe: ${unsubscribeUrl}`);

  return {
    subject: resolvedSubject,
    previewText: resolvedPreview,
    html,
    text: textLines.join("\n"),
    ctaText: resolvedCtaText,
    ctaUrl,
    unsubscribeUrl,
    missingVariables: allMissing,
  };
}
