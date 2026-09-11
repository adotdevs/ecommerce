/**
 * Email Document Validation
 *
 * Pre-send validation to catch issues before delivery.
 * Returns blocking errors and non-blocking warnings.
 */

import type { EmailDocument, EmailSection, ProductBlockContent, ButtonBlockContent, FooterBlockContent, ImageBlockContent } from "./document-schema";

export interface ValidationResult {
  valid: boolean;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const SUPPORTED_BLOCK_TYPES = new Set([
  "text", "button", "image", "product", "hero",
  "spacer", "divider", "coupon", "banner", "footer", "columns",
  "product-grid", "countdown", "social-links", "testimonial",
]);

export function validateEmailDocument(doc: EmailDocument): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── BLOCKING ERRORS ──

  if (!doc.subject?.trim()) {
    errors.push("Subject line is required.");
  }

  const visibleSections = doc.sections.filter(s => s.visible);
  if (visibleSections.length === 0) {
    errors.push("Email must have at least one visible content section.");
  }

  // Check for unsupported block types
  for (const section of doc.sections) {
    if (!SUPPORTED_BLOCK_TYPES.has(section.type)) {
      errors.push(`Unsupported block type: "${section.type}".`);
    }
  }

  // Check for unresolved personalization variables in subject
  const unresolvedInSubject = doc.subject?.match(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g);
  // These are expected — they'll be resolved at send time per-lead

  // Check product blocks have valid references
  for (const section of visibleSections) {
    if (section.type === "product") {
      const pc = section.content as ProductBlockContent;
      if (!pc.productId) {
        errors.push("Product block is missing a product selection.");
      }
      if (!pc.productSnapshot?.name) {
        errors.push("Product block is missing product snapshot data.");
      }
    }

    if (section.type === "button") {
      const bc = section.content as ButtonBlockContent;
      if (!bc.url?.trim()) {
        errors.push("Button block is missing a destination URL.");
      }
    }
  }

  // Check required unsubscribe
  const hasFooterWithUnsub = visibleSections.some(s => {
    if (s.type !== "footer") return false;
    const fc = s.content as FooterBlockContent;
    return fc.showUnsubscribe !== false;
  });
  // Renderer always adds unsubscribe if no footer, so this is a warning not error
  if (!hasFooterWithUnsub) {
    // Not an error — renderer ensures it's present — but warn admin
    warnings.push("No footer block found. An unsubscribe link will be added automatically.");
  }

  // ── WARNINGS ──

  if (!doc.previewText?.trim()) {
    warnings.push("Preview text is empty. Email clients may show the first line of body content.");
  }

  // Check for missing CTAs
  const hasCta = visibleSections.some(
    s => s.type === "button" || s.type === "hero" || s.type === "coupon" || s.type === "banner"
  );
  if (!hasCta) {
    warnings.push("No call-to-action button found. Consider adding a CTA to improve engagement.");
  }

  // Check for missing alt text on images
  for (const section of visibleSections) {
    if (section.type === "image") {
      const ic = section.content as ImageBlockContent;
      if (!ic.alt?.trim()) {
        warnings.push("Image block is missing alt text. This affects accessibility and deliverability.");
      }
    }
  }

  // Check for excessive products
  const productCount = visibleSections.filter(s => s.type === "product").length;
  if (productCount > 6) {
    warnings.push(`Email has ${productCount} product blocks. Very long emails may have lower engagement.`);
  }

  // Check for very long subject
  if (doc.subject && doc.subject.length > 120) {
    warnings.push("Subject line is very long (>120 chars). It may be truncated in inboxes.");
  }

  return {
    valid: errors.length === 0,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
