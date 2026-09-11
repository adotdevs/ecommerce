/**
 * Email Document Renderer
 *
 * Converts an EmailDocument schema into email-safe HTML with inline styles.
 * Uses table-based layout for maximum email client compatibility.
 * Each block type has a dedicated render function.
 *
 * This is the SINGLE SOURCE OF TRUTH for email HTML output — used by both
 * preview and actual send. Test emails use this same renderer.
 */

import type {
  EmailDocument,
  EmailSection,
  GlobalStyles,
  TextBlockContent,
  ButtonBlockContent,
  ImageBlockContent,
  ProductBlockContent,
  HeroBlockContent,
  SpacerBlockContent,
  DividerBlockContent,
  CouponBlockContent,
  BannerBlockContent,
  FooterBlockContent,
  ColumnsBlockContent,
  ProductGridBlockContent,
  ProductGridItem,
  CountdownBlockContent,
  SocialLinksBlockContent,
  TestimonialBlockContent,
} from "./document-schema";
import { toAbsoluteUrl } from "@/lib/url";
import { buildTrackingUrl, buildUnsubscribeUrl } from "./tracking";
import type { EmailLinkType } from "./tracking";
import { resolveTokens, detectMissingTokens } from "./render";
import type { PersonalizationData } from "./types";

export interface DocumentRenderOptions {
  /** Personalization data for token resolution */
  personalization?: PersonalizationData;
  /** For generating tracked links */
  emailMessageId?: string;
  campaignId?: string;
  leadId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  /** Recipient for unsubscribe link */
  recipientEmail?: string;
  recipientLeadId?: string;
}

export interface DocumentRenderResult {
  subject: string;
  previewText: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
  missingVariables: string[];
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resolveUrl(
  url: string,
  opts: DocumentRenderOptions,
  linkType?: string,
  productId?: string,
  productName?: string,
  blockId?: string
): string {
  const absoluteUrl = toAbsoluteUrl(url);
  if (opts.emailMessageId) {
    return buildTrackingUrl({
      targetUrl: absoluteUrl,
      emailMessageId: opts.emailMessageId,
      campaignId: opts.campaignId,
      leadId: opts.leadId,
      utmSource: opts.utmSource,
      utmMedium: opts.utmMedium,
      utmCampaign: opts.utmCampaign,
      productId,
      productName,
      linkType: linkType as EmailLinkType,
      blockId,
    });
  }
  return absoluteUrl;
}

function resolvePersonalization(text: string, data?: PersonalizationData): string {
  if (!data || !text) return text;
  return resolveTokens(text, data);
}

// ─── Block Renderers ─────────────────────────────────────────────────────────

function renderTextBlock(content: TextBlockContent, gs: GlobalStyles, opts: DocumentRenderOptions): string {
  const text = resolvePersonalization(content.text, opts.personalization);
  const tag = content.headingLevel || "p";
  const isHeading = tag.startsWith("h");
  const fontSize = content.fontSize || (isHeading ? 22 : 15);
  const fontWeight = content.fontWeight || (isHeading ? 700 : 400);
  const color = content.textColor || (isHeading ? gs.headingColor : gs.textColor);
  const lineHeight = content.lineHeight || 1.6;
  const textAlign = content.textAlign || "left";
  const letterSpacing = content.letterSpacing ? `letter-spacing: ${content.letterSpacing}px;` : "";

  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  if (paragraphs.length === 0) return "";

  return paragraphs.map(p =>
    `<${tag} style="margin: 0 0 12px 0; font-size: ${fontSize}px; font-weight: ${fontWeight}; line-height: ${lineHeight}; color: ${color}; text-align: ${textAlign}; font-family: ${gs.fontFamily}; ${letterSpacing}">${esc(p).replace(/\n/g, "<br/>")}</${tag}>`
  ).join("");
}

function renderButtonBlock(content: ButtonBlockContent, gs: GlobalStyles, section: EmailSection, opts: DocumentRenderOptions): string {
  const text = resolvePersonalization(content.text, opts.personalization);
  const bgColor = content.backgroundColor || gs.buttonColor;
  const textColor = content.textColor || gs.buttonTextColor;
  const radius = content.borderRadius ?? gs.buttonRadius;
  const pV = content.paddingVertical ?? 14;
  const pH = content.paddingHorizontal ?? 28;
  const fontSize = content.fontSize || 15;
  const fontWeight = content.fontWeight || 600;
  const align = content.alignment || "center";
  const url = resolveUrl(content.url, opts, content.linkType || "CTA_BUTTON", undefined, undefined, section.id);
  const borderStyle = content.borderColor ? `border: 1px solid ${content.borderColor};` : "";
  const widthStyle = content.width === "full" ? "display: block; width: 100%; text-align: center;" : "display: inline-block;";

  return `<div style="text-align: ${align}; margin: 8px 0;">
    <a href="${esc(url)}" style="${widthStyle} background-color: ${bgColor}; color: ${textColor}; padding: ${pV}px ${pH}px; font-size: ${fontSize}px; font-weight: ${fontWeight}; text-decoration: none; border-radius: ${radius}px; font-family: ${gs.fontFamily}; ${borderStyle}">${esc(text)} &rarr;</a>
  </div>`;
}

function renderImageBlock(content: ImageBlockContent, gs: GlobalStyles, section: EmailSection, opts: DocumentRenderOptions): string {
  const src = toAbsoluteUrl(content.src);
  const alt = esc(content.alt || "");
  const width = content.width === "full" ? "100%" : `${content.width || 100}%`;
  const align = content.alignment || "center";
  const radius = content.borderRadius ?? 0;

  let img = `<img src="${esc(src)}" alt="${alt}" style="max-width: ${width}; height: auto; border-radius: ${radius}px; display: block;" />`;

  if (content.clickUrl) {
    const url = resolveUrl(content.clickUrl, opts, content.linkType || "IMAGE_LINK", undefined, undefined, section.id);
    img = `<a href="${esc(url)}" style="text-decoration: none;">${img}</a>`;
  }

  return `<div style="text-align: ${align};">${img}</div>`;
}

function renderProductBlock(content: ProductBlockContent, gs: GlobalStyles, section: EmailSection, opts: DocumentRenderOptions): string {
  const snap = content.productSnapshot;
  const title = resolvePersonalization(content.displayTitle || snap.name, opts.personalization);
  const desc = resolvePersonalization(content.displayDescription || snap.description || "", opts.personalization);
  const currency = snap.currency || "Rs";
  const hasDiscount = content.showSalePrice && snap.salePrice && snap.price && snap.salePrice < snap.price;
  const discountPercent = hasDiscount
    ? Math.round(((snap.price! - snap.salePrice!) / snap.price!) * 100)
    : 0;

  const productUrl = toAbsoluteUrl(content.ctaUrl || `/products/${snap.slug}`);
  const ctaText = content.ctaText || "Shop Now";

  const makeLink = (linkType: string) =>
    resolveUrl(productUrl, opts, linkType, content.productId, snap.name, section.id);

  const imageSrc = snap.image ? toAbsoluteUrl(snap.image) : "";
  const cardBg = content.cardBackground || "#f9fafb";
  const cardBorder = content.cardBorderColor || "#e5e7eb";
  const cardRadius = content.cardBorderRadius ?? 12;
  const titleColor = content.titleColor || gs.headingColor;
  const priceColor = content.priceColor || gs.textColor;
  const salePriceColor = content.salePriceColor || gs.linkColor;
  const ctaBg = content.ctaBackgroundColor || gs.buttonColor;
  const ctaColor = content.ctaTextColor || gs.buttonTextColor;

  // Build HTML parts
  let imageHtml = "";
  if (content.showImage && imageSrc) {
    imageHtml = `<a href="${esc(makeLink("PRODUCT_IMAGE"))}" style="text-decoration: none;">
      <img src="${esc(imageSrc)}" alt="${esc(title)}" style="max-width: 100%; height: auto; max-height: ${content.imageHeight || 220}px; object-fit: contain; border-radius: 8px; display: block; margin: 0 auto;" />
    </a>`;
  }

  let titleHtml = "";
  if (content.showTitle) {
    titleHtml = `<a href="${esc(makeLink("PRODUCT_TITLE"))}" style="text-decoration: none; color: ${titleColor};">
      <h3 style="margin: 8px 0; font-size: ${content.titleSize || 17}px; font-weight: 600; color: ${titleColor}; font-family: ${gs.fontFamily};">${esc(title)}</h3>
    </a>`;
  }

  let descHtml = "";
  if (content.showDescription && desc) {
    descHtml = `<p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280; line-height: 1.4; font-family: ${gs.fontFamily};">${esc(desc.slice(0, 200))}</p>`;
  }

  const formatMoney = (val: unknown) => (typeof val === "number" ? val.toLocaleString() : (val ? String(val) : "0"));
  const priceFormatted = formatMoney(snap.price);
  const salePriceFormatted = formatMoney(snap.salePrice);

  let priceHtml = "";
  if (content.showPrice || content.showSalePrice) {
    priceHtml = '<div style="margin-bottom: 12px;">';
    if (hasDiscount && content.showSalePrice) {
      priceHtml += `<span style="font-size: 18px; font-weight: 700; color: ${salePriceColor}; margin-right: 8px;">${currency} ${salePriceFormatted}</span>`;
      if (content.showPrice) {
        priceHtml += `<span style="font-size: 14px; color: #9ca3af; text-decoration: line-through;">${currency} ${priceFormatted}</span>`;
      }
      if (content.showDiscount) {
        priceHtml += `<span style="font-size: 12px; font-weight: 600; color: #059669; margin-left: 8px; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;">-${discountPercent}%</span>`;
      }
    } else if (content.showPrice) {
      priceHtml += `<span style="font-size: 18px; font-weight: 700; color: ${priceColor};">${currency} ${priceFormatted}</span>`;
    }
    priceHtml += "</div>";
  }

  let ctaHtml = "";
  if (content.showCta) {
    ctaHtml = `<div style="margin-top: 8px;">
      <a href="${esc(makeLink("PRODUCT_CTA"))}" style="display: inline-block; background-color: ${ctaBg}; color: ${ctaColor}; padding: 10px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: ${gs.buttonRadius}px; font-family: ${gs.fontFamily};">${esc(ctaText)} &rarr;</a>
    </div>`;
  }

  // 1. HORIZONTAL LAYOUT (image-left / image-right)
  const isHorizontal = content.layout === "image-left" || content.layout === "image-right";
  if (isHorizontal && imageSrc && content.showImage) {
    const imgCol = `<td style="width: 38%; vertical-align: middle; padding: 14px;">${imageHtml}</td>`;
    const detailCol = `<td style="width: 62%; vertical-align: middle; padding: 14px; text-align: left;">${titleHtml}${descHtml}${priceHtml}${ctaHtml}</td>`;
    const cols = content.layout === "image-left" ? `${imgCol}${detailCol}` : `${detailCol}${imgCol}`;
    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid ${cardBorder}; border-radius: ${cardRadius}px; overflow: hidden; background-color: ${cardBg}; margin-bottom: 8px;"><tr>${cols}</tr></table>`;
  }

  // 2. COMPACT ROW (Slim Catalog Item)
  if (content.layout === "compact") {
    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid ${cardBorder}; border-radius: 8px; background-color: ${cardBg}; padding: 8px 12px; margin-bottom: 6px;">
      <tr>
        ${imageSrc && content.showImage ? `<td style="width: 54px; vertical-align: middle;"><a href="${esc(makeLink("PRODUCT_IMAGE"))}"><img src="${esc(imageSrc)}" width="48" height="48" alt="${esc(title)}" style="border-radius: 6px; display: block; object-fit: cover;" /></a></td>` : ""}
        <td style="vertical-align: middle; padding-left: 10px; text-align: left;">
          <a href="${esc(makeLink("PRODUCT_TITLE"))}" style="text-decoration: none; font-size: 13px; font-weight: 600; color: ${titleColor}; display: block;">${esc(title)}</a>
          <span style="font-size: 12px; font-weight: 700; color: ${salePriceColor};">${currency} ${salePriceFormatted || priceFormatted}</span>
        </td>
        ${content.showCta ? `<td style="width: 80px; text-align: right; vertical-align: middle;"><a href="${esc(makeLink("PRODUCT_CTA"))}" style="display: inline-block; background-color: ${ctaBg}; color: ${ctaColor}; padding: 6px 12px; font-size: 11px; font-weight: 600; text-decoration: none; border-radius: ${gs.buttonRadius}px;">${esc(ctaText)}</a></td>` : ""}
      </tr>
    </table>`;
  }

  // 3. LUXURY SHOWCASE (Dark & Gold)
  if (content.layout === "luxury-showcase") {
    return `<div style="border: 1px solid #78350f; border-radius: ${cardRadius}px; background-color: #030712; padding: 24px 18px; text-align: center; color: #ffffff;">
      <div style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #fbbf24; margin-bottom: 12px;">★ CURATED LUXURY ★</div>
      ${imageHtml}
      <a href="${esc(makeLink("PRODUCT_TITLE"))}" style="text-decoration: none;"><h3 style="margin: 12px 0 6px 0; font-size: 18px; font-family: Georgia, serif; color: #f9fafb;">${esc(title)}</h3></a>
      ${desc ? `<p style="margin: 0 0 12px 0; font-size: 12px; color: #9ca3af; line-height: 1.4;">${esc(desc.slice(0, 180))}</p>` : ""}
      <div style="margin-bottom: 16px;"><span style="font-size: 20px; font-family: Georgia, serif; font-weight: 700; color: #fde68a;">${currency} ${salePriceFormatted || priceFormatted}</span></div>
      <div><a href="${esc(makeLink("PRODUCT_CTA"))}" style="display: inline-block; background: #d97706; color: #ffffff; padding: 11px 28px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">${esc(ctaText)} &rarr;</a></div>
    </div>`;
  }

  // 4. GRADIENT SPOTLIGHT
  if (content.layout === "gradient-spotlight") {
    return `<div style="border: 1px solid #c7d2fe; border-radius: ${cardRadius}px; background-color: #eef2ff; padding: 22px 18px; text-align: center;">
      <span style="display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #4338ca; background: #ffffff; padding: 3px 10px; border-radius: 12px; margin-bottom: 12px; border: 1px solid #e0e7ff;">✨ Spotlight Choice</span>
      ${imageHtml}
      ${titleHtml}
      ${descHtml}
      ${priceHtml}
      ${ctaHtml}
    </div>`;
  }

  // 5. BADGE-HIGHLIGHT (Limited Deal Banner)
  if (content.layout === "badge-highlight") {
    return `<div style="border: 2px solid #4f46e5; border-radius: ${cardRadius}px; overflow: hidden; background-color: #ffffff; text-align: center;">
      <div style="background-color: #4f46e5; color: #ffffff; font-size: 11px; font-weight: 700; padding: 6px 12px; text-transform: uppercase; letter-spacing: 0.5px;">🔥 Exclusive Limited Deal ${discountPercent > 0 ? `· Save ${discountPercent}%` : ""}</div>
      <div style="padding: 18px;">
        ${imageHtml}
        ${titleHtml}
        ${descHtml}
        ${priceHtml}
        ${ctaHtml}
      </div>
    </div>`;
  }

  // 6. PRICE-FOCUSED (Deal Badge)
  if (content.layout === "price-focused") {
    return `<div style="border: 1px solid #fde68a; border-radius: ${cardRadius}px; background-color: #fffbeb; padding: 20px 16px; text-align: center;">
      <div style="font-size: 11px; font-weight: 800; color: #b45309; text-transform: uppercase; margin-bottom: 10px;">⚡ Price Drop Alert</div>
      ${imageHtml}
      ${titleHtml}
      <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 6px 16px; border-radius: 8px; margin: 8px 0 12px 0;">
        <span style="font-size: 18px; font-weight: 800;">${currency} ${salePriceFormatted || priceFormatted}</span>
        ${hasDiscount && content.showPrice ? `<span style="font-size: 13px; text-decoration: line-through; opacity: 0.8; margin-left: 6px;">${currency} ${priceFormatted}</span>` : ""}
      </div>
      ${ctaHtml}
    </div>`;
  }

  // 7. MINIMAL (image-button-only)
  if (content.layout === "image-button-only") {
    return `<div style="border: 1px solid ${cardBorder}; border-radius: ${cardRadius}px; background-color: ${cardBg}; padding: 14px; text-align: center;">
      ${imageHtml}
      <div style="margin-top: 12px;">${ctaHtml}</div>
    </div>`;
  }

  // 8. EDITORIAL MAGAZINE (Vogue / High Fashion Luxury)
  if (content.layout === "editorial-magazine") {
    const badge = content.badgeText || "★ ATELIER EDIT ★";
    return `<div style="border-top: 2px solid ${titleColor}; border-bottom: 2px solid ${titleColor}; background-color: ${cardBg}; padding: 28px 16px; text-align: center; margin-bottom: 12px;">
      <div style="font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: ${gs.linkColor}; margin-bottom: 16px;">${esc(badge)}</div>
      ${imageHtml}
      <a href="${esc(makeLink("PRODUCT_TITLE"))}" style="text-decoration: none; color: ${titleColor};">
        <h3 style="margin: 16px 0 8px 0; font-size: 22px; font-weight: 300; letter-spacing: 0.5px; font-family: Georgia, serif; color: ${titleColor}; text-transform: uppercase;">${esc(title)}</h3>
      </a>
      ${desc ? `<p style="margin: 0 auto 16px auto; max-width: 440px; font-size: 13px; font-style: italic; color: #6b7280; line-height: 1.6; font-family: Georgia, serif;">“${esc(desc.slice(0, 180))}”</p>` : ""}
      ${priceHtml}
      <div style="margin-top: 16px;">
        <a href="${esc(makeLink("PRODUCT_CTA"))}" style="display: inline-block; background-color: ${ctaBg}; color: ${ctaColor}; padding: 12px 32px; font-size: 12px; font-weight: 700; text-decoration: none; border-radius: 2px; text-transform: uppercase; letter-spacing: 2px;">${esc(ctaText)} &rarr;</a>
      </div>
    </div>`;
  }

  // 9. GLASSMORPHISM / FROSTED CARD
  if (content.layout === "glassmorphism-card") {
    return `<div style="border: 1px solid #cbd5e1; border-radius: ${cardRadius}px; background-color: #f8fafc; padding: 22px 18px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #475569; background: #e2e8f0; padding: 4px 12px; border-radius: 999px; margin-bottom: 14px;">✦ HANDPICKED CHOICE ✦</div>
      ${imageHtml}
      ${titleHtml}
      ${descHtml}
      ${priceHtml}
      <div style="margin-top: 14px;">
        <a href="${esc(makeLink("PRODUCT_CTA"))}" style="display: inline-block; background-color: ${ctaBg}; color: ${ctaColor}; padding: 11px 28px; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 999px;">${esc(ctaText)} &rarr;</a>
      </div>
    </div>`;
  }

  // 10. NEON CYBER (High Contrast Electric)
  if (content.layout === "neon-cyber") {
    return `<div style="border: 2px solid #6366f1; border-radius: ${cardRadius}px; background-color: #09090b; padding: 24px 18px; text-align: center; color: #ffffff;">
      <div style="display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #a855f7; background: #3b0764; border: 1px solid #7e22ce; padding: 4px 14px; border-radius: 999px; margin-bottom: 14px;">⚡ CYBER DROP ALERT ⚡</div>
      ${imageHtml}
      <a href="${esc(makeLink("PRODUCT_TITLE"))}" style="text-decoration: none;"><h3 style="margin: 12px 0 6px 0; font-size: 19px; font-weight: 800; color: #f8fafc; font-family: -apple-system, sans-serif;">${esc(title)}</h3></a>
      ${desc ? `<p style="margin: 0 0 12px 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">${esc(desc.slice(0, 160))}</p>` : ""}
      <div style="margin-bottom: 16px;">
        <span style="font-size: 22px; font-weight: 800; color: #38bdf8;">${currency} ${salePriceFormatted || priceFormatted}</span>
        ${hasDiscount && content.showPrice ? `<span style="font-size: 13px; text-decoration: line-through; color: #71717a; margin-left: 8px;">${currency} ${priceFormatted}</span>` : ""}
      </div>
      <div>
        <a href="${esc(makeLink("PRODUCT_CTA"))}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 30px; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px;">${esc(ctaText)} &rarr;</a>
      </div>
    </div>`;
  }

  // 11. STAR-RATED SOCIAL PROOF
  if (content.layout === "star-rated-deal") {
    const rating = content.rating || 5;
    const reviews = content.reviewsCount || 142;
    const stars = "★".repeat(Math.min(5, Math.max(1, Math.round(rating))));
    return `<div style="border: 1px solid #fed7aa; border-radius: ${cardRadius}px; background-color: #fffaf5; padding: 22px 18px; text-align: center;">
      <div style="color: #f59e0b; font-size: 14px; margin-bottom: 6px; letter-spacing: 2px;">
        ${stars} <span style="font-size: 11px; font-weight: 700; color: #9a3412; letter-spacing: normal;">${rating.toFixed(1)}/5 (${reviews} verified reviews)</span>
      </div>
      ${imageHtml}
      ${titleHtml}
      ${descHtml}
      ${priceHtml}
      <div style="margin-top: 14px;">
        <a href="${esc(makeLink("PRODUCT_CTA"))}" style="display: inline-block; background-color: #ea580c; color: #ffffff; padding: 11px 26px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: ${gs.buttonRadius}px;">${esc(ctaText)} &rarr;</a>
      </div>
    </div>`;
  }

  // 12. MINIMAL BOUTIQUE
  if (content.layout === "minimal-boutique") {
    return `<div style="border: 1px solid #e7e5e4; border-radius: ${cardRadius}px; background-color: #fafaf9; padding: 24px 18px; text-align: center;">
      ${imageHtml}
      <a href="${esc(makeLink("PRODUCT_TITLE"))}" style="text-decoration: none; color: #292524;">
        <h3 style="margin: 14px 0 6px 0; font-size: 17px; font-weight: 600; font-family: Georgia, serif; color: #292524;">${esc(title)}</h3>
      </a>
      ${desc ? `<p style="margin: 0 0 10px 0; font-size: 12px; color: #78716c; line-height: 1.5;">${esc(desc.slice(0, 140))}</p>` : ""}
      <div style="margin-bottom: 14px;">
        <span style="font-size: 16px; font-weight: 700; color: #44403c;">${currency} ${salePriceFormatted || priceFormatted}</span>
      </div>
      <div>
        <a href="${esc(makeLink("PRODUCT_CTA"))}" style="display: inline-block; border: 1px solid #78716c; color: #292524; padding: 8px 22px; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 4px;">${esc(ctaText)}</a>
      </div>
    </div>`;
  }

  // 13. PILL BADGE ROW
  if (content.layout === "pill-badge-row") {
    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid ${cardBorder}; border-radius: 999px; background-color: ${cardBg}; padding: 8px 16px; margin-bottom: 8px;">
      <tr>
        ${imageSrc && content.showImage ? `<td style="width: 48px; vertical-align: middle;"><a href="${esc(makeLink("PRODUCT_IMAGE"))}"><img src="${esc(imageSrc)}" width="44" height="44" alt="${esc(title)}" style="border-radius: 999px; display: block; object-fit: cover;" /></a></td>` : ""}
        <td style="vertical-align: middle; padding-left: 12px; text-align: left;">
          <a href="${esc(makeLink("PRODUCT_TITLE"))}" style="text-decoration: none; font-size: 13px; font-weight: 700; color: ${titleColor}; display: block;">${esc(title)}</a>
          <span style="font-size: 12px; font-weight: 800; color: ${salePriceColor};">${currency} ${salePriceFormatted || priceFormatted}</span>
          ${content.badgeText ? `<span style="font-size: 10px; font-weight: 700; background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">${esc(content.badgeText)}</span>` : ""}
        </td>
        ${content.showCta ? `<td style="width: 90px; text-align: right; vertical-align: middle;"><a href="${esc(makeLink("PRODUCT_CTA"))}" style="display: inline-block; background-color: ${ctaBg}; color: ${ctaColor}; padding: 7px 16px; font-size: 12px; font-weight: 700; text-decoration: none; border-radius: 999px;">${esc(ctaText)}</a></td>` : ""}
      </tr>
    </table>`;
  }

  // 14. HERO SHOWCASE / STANDARD VERTICAL
  const isHero = content.layout === "hero";
  return `<div style="border: 1px solid ${cardBorder}; border-radius: ${cardRadius}px; overflow: hidden; background-color: ${cardBg}; padding: ${isHero ? "24px 18px" : "18px"}; text-align: center;">
    ${imageHtml}
    ${titleHtml}
    ${descHtml}
    ${priceHtml}
    ${ctaHtml}
  </div>`;
}

function renderHeroBlock(content: HeroBlockContent, gs: GlobalStyles, section: EmailSection, opts: DocumentRenderOptions): string {
  const title = resolvePersonalization(content.title, opts.personalization);
  const subtitle = content.subtitle ? resolvePersonalization(content.subtitle, opts.personalization) : "";
  const paragraph = content.paragraph ? resolvePersonalization(content.paragraph, opts.personalization) : "";
  const bgColor = content.backgroundColor || gs.buttonColor;
  const align = content.alignment || "center";
  const titleColor = content.titleColor || "#ffffff";
  const subtitleColor = content.subtitleColor || "rgba(255,255,255,0.85)";
  const paragraphColor = content.paragraphColor || "rgba(255,255,255,0.8)";
  const titleSize = content.titleSize || 28;
  const subtitleSize = content.subtitleSize || 16;
  const minHeight = content.minHeight || 200;

  let bgStyle = `background-color: ${bgColor};`;
  if (content.backgroundImage) {
    bgStyle += ` background-image: url('${esc(toAbsoluteUrl(content.backgroundImage))}'); background-size: cover; background-position: center;`;
  }

  let html = `<div style="${bgStyle} padding: 40px 32px; text-align: ${align}; min-height: ${minHeight}px;">`;
  if (title) {
    html += `<h1 style="margin: 0 0 12px 0; font-size: ${titleSize}px; font-weight: 800; color: ${titleColor}; line-height: 1.2; font-family: ${gs.fontFamily};">${esc(title)}</h1>`;
  }
  if (subtitle) {
    html += `<p style="margin: 0 0 16px 0; font-size: ${subtitleSize}px; color: ${subtitleColor}; font-family: ${gs.fontFamily};">${esc(subtitle)}</p>`;
  }
  if (paragraph) {
    html += `<p style="margin: 0 0 20px 0; font-size: 15px; color: ${paragraphColor}; line-height: 1.5; font-family: ${gs.fontFamily};">${esc(paragraph)}</p>`;
  }
  if (content.ctaText && content.ctaUrl) {
    const ctaBg = content.ctaBackgroundColor || "#ffffff";
    const ctaColor = content.ctaTextColor || bgColor;
    const url = resolveUrl(content.ctaUrl, opts, "HERO_BUTTON", undefined, undefined, section.id);
    html += `<a href="${esc(url)}" style="display: inline-block; background-color: ${ctaBg}; color: ${ctaColor}; padding: 14px 28px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: ${gs.buttonRadius}px; font-family: ${gs.fontFamily};">${esc(content.ctaText)} &rarr;</a>`;
  }
  html += "</div>";
  return html;
}

function renderSpacerBlock(content: SpacerBlockContent): string {
  return `<div style="height: ${content.height}px; line-height: ${content.height}px; font-size: 1px;">&nbsp;</div>`;
}

function renderDividerBlock(content: DividerBlockContent): string {
  const width = content.width === "full" ? "100%" : `${content.width}%`;
  return `<div style="padding: ${content.spacing}px 0; text-align: center;">
    <div style="border-top: ${content.thickness}px ${content.style} ${content.color}; width: ${width}; margin: 0 auto;"></div>
  </div>`;
}

function renderCouponBlock(content: CouponBlockContent, gs: GlobalStyles, section: EmailSection, opts: DocumentRenderOptions): string {
  const title = resolvePersonalization(content.title, opts.personalization);
  const desc = content.description ? resolvePersonalization(content.description, opts.personalization) : "";
  const bgColor = content.backgroundColor || "#eef2ff";
  const borderColor = content.borderColor || gs.linkColor;
  const titleColor = content.titleColor || gs.linkColor;
  const codeColor = content.codeColor || "#312e81";
  const codeBg = content.codeBackgroundColor || "transparent";

  let html = `<div style="padding: 18px; border: 2px dashed ${borderColor}; border-radius: 8px; background-color: ${bgColor}; text-align: center;">`;
  html += `<p style="margin: 0 0 6px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: ${titleColor}; font-weight: 600; font-family: ${gs.fontFamily};">${esc(title)}</p>`;
  html += `<p style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: ${codeColor}; letter-spacing: 0.05em; background-color: ${codeBg}; padding: 4px 12px; display: inline-block; border-radius: 4px; font-family: ${gs.fontFamily};">${esc(content.code)}</p>`;
  if (desc) {
    html += `<p style="margin: 6px 0 0 0; font-size: 13px; color: #6b7280; font-family: ${gs.fontFamily};">${esc(desc)}</p>`;
  }
  if (content.ctaText && content.ctaUrl) {
    const url = resolveUrl(content.ctaUrl, opts, "COUPON_CTA", undefined, undefined, section.id);
    html += `<div style="margin-top: 12px;"><a href="${esc(url)}" style="display: inline-block; background-color: ${gs.buttonColor}; color: ${gs.buttonTextColor}; padding: 10px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: ${gs.buttonRadius}px; font-family: ${gs.fontFamily};">${esc(content.ctaText)}</a></div>`;
  }
  html += "</div>";
  return html;
}

function renderBannerBlock(content: BannerBlockContent, gs: GlobalStyles, section: EmailSection, opts: DocumentRenderOptions): string {
  const text = resolvePersonalization(content.text, opts.personalization);
  const bgColor = content.backgroundColor || gs.linkColor;
  const textColor = content.textColor || "#ffffff";
  const fontSize = content.fontSize || 14;
  const fontWeight = content.fontWeight || 600;

  let html = `<div style="background-color: ${bgColor}; padding: 12px 20px; text-align: center; border-radius: 6px;">`;
  html += `<p style="margin: 0; font-size: ${fontSize}px; font-weight: ${fontWeight}; color: ${textColor}; font-family: ${gs.fontFamily};">${esc(text)}`;
  if (content.ctaText && content.ctaUrl) {
    const url = resolveUrl(content.ctaUrl, opts, "BANNER_LINK", undefined, undefined, section.id);
    html += ` <a href="${esc(url)}" style="color: ${textColor}; text-decoration: underline; font-weight: 700;">${esc(content.ctaText)}</a>`;
  }
  html += "</p></div>";
  return html;
}

function renderFooterBlock(
  content: FooterBlockContent,
  gs: GlobalStyles,
  opts: DocumentRenderOptions
): string {
  const bgColor = content.backgroundColor || "#f9fafb";
  const textColor = content.textColor || "#9ca3af";
  const unsubUrl = opts.recipientEmail
    ? buildUnsubscribeUrl(opts.recipientEmail, opts.recipientLeadId)
    : "#unsubscribe";

  let html = `<div style="background-color: ${bgColor}; border-top: 1px solid #f3f4f6; padding: 24px 32px; text-align: center;">`;

  if (content.companyName) {
    html += `<p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: ${gs.headingColor}; font-family: ${gs.fontFamily};">${esc(content.companyName)}</p>`;
  }
  if (content.text) {
    html += `<p style="margin: 0 0 8px 0; font-size: 12px; color: ${textColor}; line-height: 1.5; font-family: ${gs.fontFamily};">${esc(content.text)}</p>`;
  }
  if (content.address) {
    html += `<p style="margin: 0 0 8px 0; font-size: 12px; color: ${textColor}; font-family: ${gs.fontFamily};">${esc(content.address)}</p>`;
  }
  if (content.websiteUrl) {
    html += `<p style="margin: 0 0 8px 0; font-size: 12px;"><a href="${esc(toAbsoluteUrl(content.websiteUrl))}" style="color: ${gs.linkColor}; text-decoration: underline;">${esc(content.websiteUrl)}</a></p>`;
  }

  // Unsubscribe — ALWAYS present in final output even if admin hides it
  html += `<p style="margin: 8px 0 0 0; font-size: 12px; color: ${textColor};">
    <a href="${esc(unsubUrl)}" style="color: #6b7280; text-decoration: underline;">Unsubscribe from marketing emails</a>
  </p>`;

  html += "</div>";
  return html;
}

function renderColumnsBlock(content: ColumnsBlockContent, gs: GlobalStyles, opts: DocumentRenderOptions): string {
  const widths: Record<string, string[]> = {
    "50/50": ["50%", "50%"],
    "40/60": ["40%", "60%"],
    "60/40": ["60%", "40%"],
    "33/33/33": ["33.33%", "33.33%", "33.33%"],
  };
  const colWidths = widths[content.split] || ["50%", "50%"];

  let html = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>`;
  content.columns.forEach((col, idx) => {
    html += `<td style="width: ${colWidths[idx]}; vertical-align: top; padding: 0 ${(content.gap || 16) / 2}px;">`;
    col.blocks.forEach(block => {
      if (block.visible) {
        html += renderSection(block, gs, opts);
      }
    });
    html += "</td>";
  });
  html += "</tr></table>";
  return html;
}

function renderProductGridBlock(content: ProductGridBlockContent, gs: GlobalStyles, section: EmailSection, opts: DocumentRenderOptions): string {
  const items = (content.items || (content as any).products || []) as ProductGridItem[];
  if (items.length === 0) return "";

  const cols = content.columns || 3;
  const colWidthPercent = cols === 2 ? "50%" : "33.33%";
  const cardBg = content.cardBackground || "#ffffff";
  const cardBorder = content.cardBorderColor || "#e5e7eb";
  const cardRadius = content.cardBorderRadius ?? 12;

  let titleHtml = "";
  if (content.title) {
    titleHtml = `<div style="text-align: center; margin-bottom: 16px;">
      <h3 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: ${gs.headingColor}; font-family: ${gs.fontFamily};">${esc(content.title)}</h3>
      ${content.subtitle ? `<p style="margin: 0; font-size: 13px; color: #6b7280; font-family: ${gs.fontFamily};">${esc(content.subtitle)}</p>` : ""}
    </div>`;
  }

  // Group items into rows
  const rows: ProductGridItem[][] = [];
  for (let i = 0; i < items.length; i += cols) {
    rows.push(items.slice(i, i + cols));
  }

  let tableRowsHtml = "";
  for (const row of rows) {
    let cellsHtml = "";
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      const item = row[cIdx];
      if (!item) {
        cellsHtml += `<td style="width: ${colWidthPercent}; padding: 6px;"></td>`;
        continue;
      }

      const itemUrl = toAbsoluteUrl(`/products/${item.slug}`);
      const trackedUrl = resolveUrl(itemUrl, opts, "PRODUCT_GRID_ITEM", item.productId, item.name, section.id);
      const currency = item.currency || "Rs";
      const hasDiscount = item.salePrice && item.price && item.salePrice < item.price;
      const formattedPrice = item.price ? Number(item.price).toLocaleString() : "";
      const formattedSalePrice = item.salePrice ? Number(item.salePrice).toLocaleString() : "";

      const card = `<div style="border: 1px solid ${cardBorder}; border-radius: ${cardRadius}px; background-color: ${cardBg}; padding: 12px; text-align: center; height: 100%;">
        ${item.image ? `<a href="${esc(trackedUrl)}" style="text-decoration: none; display: block; margin-bottom: 8px;">
          <img src="${esc(toAbsoluteUrl(item.image))}" alt="${esc(item.name)}" style="width: 100%; height: 130px; object-fit: cover; border-radius: 8px; display: block;" />
        </a>` : ""}
        ${content.showBadges && item.badge ? `<span style="display: inline-block; font-size: 9px; font-weight: 800; background: #fee2e2; color: #dc2626; padding: 2px 6px; border-radius: 4px; margin-bottom: 6px; text-transform: uppercase;">${esc(item.badge)}</span>` : ""}
        <a href="${esc(trackedUrl)}" style="text-decoration: none; color: ${gs.headingColor}; display: block;">
          <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: ${gs.headingColor}; line-height: 1.3; height: 34px; overflow: hidden; font-family: ${gs.fontFamily};">${esc(item.name)}</h4>
        </a>
        <div style="margin-bottom: 8px;">
          ${hasDiscount && content.showSalePrices ? `
            <span style="font-size: 14px; font-weight: 800; color: ${gs.linkColor}; margin-right: 4px;">${currency} ${formattedSalePrice}</span>
            <span style="font-size: 11px; color: #9ca3af; text-decoration: line-through;">${currency} ${formattedPrice}</span>
          ` : `
            <span style="font-size: 14px; font-weight: 800; color: ${gs.textColor};">${currency} ${formattedPrice}</span>
          `}
        </div>
        <div>
          <a href="${esc(trackedUrl)}" style="display: block; background-color: ${gs.buttonColor}; color: ${gs.buttonTextColor}; padding: 8px 12px; font-size: 11px; font-weight: 700; text-decoration: none; border-radius: ${gs.buttonRadius}px; font-family: ${gs.fontFamily};">${esc(content.ctaText || "Shop Now")}</a>
        </div>
      </div>`;

      cellsHtml += `<td style="width: ${colWidthPercent}; padding: 6px; vertical-align: top;">${card}</td>`;
    }
    tableRowsHtml += `<tr>${cellsHtml}</tr>`;
  }

  return `${titleHtml}<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">${tableRowsHtml}</table>`;
}

function renderCountdownBlock(content: CountdownBlockContent, gs: GlobalStyles, section: EmailSection, opts: DocumentRenderOptions): string {
  const bg = content.backgroundColor || "#0f172a";
  const textCol = content.textColor || "#ffffff";
  const accent = content.accentColor || "#fbbf24";
  const boxBg = content.boxBackground || "#1e293b";
  const hours = String(content.hoursRemaining ?? 14).padStart(2, "0");
  const minutes = String(content.minutesRemaining ?? 35).padStart(2, "0");
  const seconds = String(content.secondsRemaining ?? 45).padStart(2, "0");

  let ctaHtml = "";
  if (content.ctaText && content.ctaUrl) {
    const url = resolveUrl(content.ctaUrl, opts, "COUNTDOWN_BUTTON", undefined, undefined, section.id);
    ctaHtml = `<div style="margin-top: 18px;">
      <a href="${esc(url)}" style="display: inline-block; background-color: ${accent}; color: #0f172a; padding: 12px 30px; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 999px; text-transform: uppercase; letter-spacing: 1px; font-family: ${gs.fontFamily};">${esc(content.ctaText)} &rarr;</a>
    </div>`;
  }

  return `<div style="background-color: ${bg}; border-radius: 12px; padding: 26px 20px; text-align: center; color: ${textCol};">
    ${content.badgeText ? `<div style="display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: ${accent}; background: rgba(251,191,36,0.15); border: 1px solid rgba(251,191,36,0.3); padding: 4px 12px; border-radius: 999px; margin-bottom: 12px;">${esc(content.badgeText)}</div>` : ""}
    <h3 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; color: ${textCol}; font-family: ${gs.fontFamily};">${esc(content.title)}</h3>
    ${content.subtitle ? `<p style="margin: 0 0 18px 0; font-size: 13px; color: #94a3b8; font-family: ${gs.fontFamily};">${esc(content.subtitle)}</p>` : `<div style="margin-bottom: 16px;"></div>`}

    <!-- Countdown Digits Table -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
      <tr>
        <td style="padding: 0 6px; text-align: center;">
          <div style="background-color: ${boxBg}; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 14px; min-width: 52px;">
            <span style="font-size: 26px; font-weight: 900; color: ${accent}; font-family: monospace; display: block;">${hours}</span>
            <span style="font-size: 9px; font-weight: 700; letter-spacing: 1px; color: #94a3b8; text-transform: uppercase;">Hours</span>
          </div>
        </td>
        <td style="font-size: 24px; font-weight: 800; color: ${accent}; vertical-align: middle; padding-bottom: 14px;">:</td>
        <td style="padding: 0 6px; text-align: center;">
          <div style="background-color: ${boxBg}; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 14px; min-width: 52px;">
            <span style="font-size: 26px; font-weight: 900; color: ${accent}; font-family: monospace; display: block;">${minutes}</span>
            <span style="font-size: 9px; font-weight: 700; letter-spacing: 1px; color: #94a3b8; text-transform: uppercase;">Mins</span>
          </div>
        </td>
        <td style="font-size: 24px; font-weight: 800; color: ${accent}; vertical-align: middle; padding-bottom: 14px;">:</td>
        <td style="padding: 0 6px; text-align: center;">
          <div style="background-color: ${boxBg}; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 14px; min-width: 52px;">
            <span style="font-size: 26px; font-weight: 900; color: ${accent}; font-family: monospace; display: block;">${seconds}</span>
            <span style="font-size: 9px; font-weight: 700; letter-spacing: 1px; color: #94a3b8; text-transform: uppercase;">Secs</span>
          </div>
        </td>
      </tr>
    </table>

    ${ctaHtml}
  </div>`;
}

function renderSocialLinksBlock(content: SocialLinksBlockContent, gs: GlobalStyles, section: EmailSection, opts: DocumentRenderOptions): string {
  const links = content.links || [];
  if (links.length === 0) return "";

  const align = content.alignment || "center";
  const iconColor = content.iconColor || gs.linkColor;

  const linksHtml = links.map((l) => {
    const trackedUrl = resolveUrl(l.url, opts, "SOCIAL_LINK", undefined, l.platform, section.id);
    return `<td style="padding: 0 8px;">
      <a href="${esc(trackedUrl)}" style="display: inline-block; background-color: #f1f5f9; color: ${iconColor}; border: 1px solid #e2e8f0; border-radius: 999px; padding: 6px 14px; font-size: 11px; font-weight: 700; text-decoration: none; font-family: ${gs.fontFamily}; text-transform: capitalize;">
        ${esc(l.label || l.platform)}
      </a>
    </td>`;
  }).join("");

  return `<div style="text-align: ${align}; padding: 8px 0;">
    ${content.title ? `<p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 600; color: #64748b; font-family: ${gs.fontFamily};">${esc(content.title)}</p>` : ""}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 ${align === "center" ? "auto" : "0"};">
      <tr>${linksHtml}</tr>
    </table>
  </div>`;
}

function renderTestimonialBlock(content: TestimonialBlockContent, gs: GlobalStyles, section: EmailSection, opts: DocumentRenderOptions): string {
  const quote = resolvePersonalization(content.quote, opts.personalization);
  const author = resolvePersonalization(content.authorName, opts.personalization);
  const title = content.authorTitle ? resolvePersonalization(content.authorTitle, opts.personalization) : "";
  const bg = content.cardBackground || "#f8fafc";
  const border = content.cardBorderColor || "#e2e8f0";
  const textCol = content.textColor || "#1e293b";
  const starCol = content.starColor || "#f59e0b";
  const rating = content.rating || 5;
  const stars = "★".repeat(Math.min(5, Math.max(1, Math.round(rating))));

  return `<div style="border: 1px solid ${border}; border-radius: 12px; background-color: ${bg}; padding: 22px 20px; text-align: center;">
    <div style="color: ${starCol}; font-size: 16px; letter-spacing: 2px; margin-bottom: 12px;">${stars}</div>
    <p style="margin: 0 0 14px 0; font-size: 14px; font-style: italic; line-height: 1.6; color: ${textCol}; font-family: Georgia, serif; max-width: 480px; margin-left: auto; margin-right: auto;">${esc(quote)}</p>
    <div style="font-size: 12px; font-weight: 800; color: ${textCol}; font-family: ${gs.fontFamily};">
      ${esc(author)} ${content.verifiedCustomer ? `<span style="display: inline-block; font-size: 10px; font-weight: 700; color: #059669; background: #ecfdf5; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">✓ Verified Buyer</span>` : ""}
    </div>
    ${title ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px; font-family: ${gs.fontFamily};">${esc(title)}</div>` : ""}
  </div>`;
}

// ─── Section Renderer ────────────────────────────────────────────────────────

function renderSection(section: EmailSection, gs: GlobalStyles, opts: DocumentRenderOptions): string {
  if (!section.visible) return "";

  const s = section.settings;
  const padding = `padding: ${s.paddingTop ?? 16}px ${s.paddingRight ?? 24}px ${s.paddingBottom ?? 16}px ${s.paddingLeft ?? 24}px;`;
  const bgColor = s.backgroundColor ? `background-color: ${s.backgroundColor};` : "";
  const bgImage = s.backgroundImage ? `background-image: url('${esc(s.backgroundImage)}'); background-size: cover;` : "";
  const border = s.borderWidth ? `border: ${s.borderWidth}px solid ${s.borderColor || "#e5e7eb"};` : "";
  const radius = s.borderRadius ? `border-radius: ${s.borderRadius}px;` : "";

  let blockHtml = "";
  switch (section.type) {
    case "text":
      blockHtml = renderTextBlock(section.content as TextBlockContent, gs, opts);
      break;
    case "button":
      blockHtml = renderButtonBlock(section.content as ButtonBlockContent, gs, section, opts);
      break;
    case "image":
      blockHtml = renderImageBlock(section.content as ImageBlockContent, gs, section, opts);
      break;
    case "product":
      blockHtml = renderProductBlock(section.content as ProductBlockContent, gs, section, opts);
      break;
    case "hero":
      blockHtml = renderHeroBlock(section.content as HeroBlockContent, gs, section, opts);
      break;
    case "spacer":
      blockHtml = renderSpacerBlock(section.content as SpacerBlockContent);
      break;
    case "divider":
      blockHtml = renderDividerBlock(section.content as DividerBlockContent);
      break;
    case "coupon":
      blockHtml = renderCouponBlock(section.content as CouponBlockContent, gs, section, opts);
      break;
    case "banner":
      blockHtml = renderBannerBlock(section.content as BannerBlockContent, gs, section, opts);
      break;
    case "footer":
      blockHtml = renderFooterBlock(section.content as FooterBlockContent, gs, opts);
      break;
    case "columns":
      blockHtml = renderColumnsBlock(section.content as ColumnsBlockContent, gs, opts);
      break;
    case "product-grid":
      blockHtml = renderProductGridBlock(section.content as ProductGridBlockContent, gs, section, opts);
      break;
    case "countdown":
      blockHtml = renderCountdownBlock(section.content as CountdownBlockContent, gs, section, opts);
      break;
    case "social-links":
      blockHtml = renderSocialLinksBlock(section.content as SocialLinksBlockContent, gs, section, opts);
      break;
    case "testimonial":
      blockHtml = renderTestimonialBlock(section.content as TestimonialBlockContent, gs, section, opts);
      break;
    default:
      blockHtml = "";
  }

  if (!blockHtml) return "";

  return `<div style="${padding}${bgColor}${bgImage}${border}${radius}">${blockHtml}</div>`;
}

// ─── Main Document Renderer ─────────────────────────────────────────────────

export function renderEmailDocument(doc: EmailDocument, opts: DocumentRenderOptions = {}): DocumentRenderResult {
  const gs = doc.globalStyles;
  const subject = resolvePersonalization(doc.subject, opts.personalization);
  const previewText = resolvePersonalization(doc.previewText || "", opts.personalization);

  // Check for a footer block; if missing, add mandatory unsubscribe
  const hasFooter = doc.sections.some(s => s.type === "footer" && s.visible);

  // Render all visible sections
  const sectionsHtml = doc.sections
    .filter(s => s.visible)
    .map(s => renderSection(s, gs, opts))
    .join("");

  // Mandatory unsubscribe if no footer block
  let unsubscribeHtml = "";
  const unsubUrl = opts.recipientEmail
    ? buildUnsubscribeUrl(opts.recipientEmail, opts.recipientLeadId)
    : "#unsubscribe";

  if (!hasFooter) {
    unsubscribeHtml = `<div style="padding: 16px 32px; text-align: center; background-color: #f9fafb; border-top: 1px solid #f3f4f6;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        <a href="${esc(unsubUrl)}" style="color: #6b7280; text-decoration: underline;">Unsubscribe from marketing emails</a>
      </p>
    </div>`;
  }

  // Build complete email HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(subject)}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .email-content td { padding-left: 16px !important; padding-right: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${gs.backgroundColor}; font-family: ${gs.fontFamily}; -webkit-font-smoothing: antialiased;">
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-width: 0px; opacity: 0;">${esc(previewText)}</div>` : ""}
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${gs.backgroundColor}; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table class="email-container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: ${gs.contentWidth}px; background-color: ${gs.contentBackground}; border-radius: ${gs.borderRadius}px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td class="email-content">
              ${sectionsHtml}
              ${unsubscribeHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Generate plain-text fallback
  const textLines: string[] = [];
  for (const section of doc.sections.filter(s => s.visible)) {
    const c = section.content;
    switch (section.type) {
      case "text": {
        const tc = c as TextBlockContent;
        textLines.push(resolvePersonalization(tc.text, opts.personalization), "");
        break;
      }
      case "button": {
        const bc = c as ButtonBlockContent;
        textLines.push(`${bc.text}: ${toAbsoluteUrl(bc.url)}`, "");
        break;
      }
      case "product": {
        const pc = c as ProductBlockContent;
        const pSnap = pc.productSnapshot;
        textLines.push(`Product: ${pc.displayTitle || pSnap?.name || "Featured Item"}`);
        if (pc.showPrice && pSnap?.price) {
          textLines.push(`Price: ${pSnap.currency || "Rs"} ${pSnap.salePrice || pSnap.price}`);
        }
        textLines.push(`Link: ${toAbsoluteUrl(pc.ctaUrl || `/products/${pSnap?.slug || ""}`)}`, "");
        break;
      }
      case "hero": {
        const hc = c as HeroBlockContent;
        if (hc.title) textLines.push(resolvePersonalization(hc.title, opts.personalization));
        if (hc.subtitle) textLines.push(resolvePersonalization(hc.subtitle, opts.personalization));
        if (hc.paragraph) textLines.push(resolvePersonalization(hc.paragraph, opts.personalization));
        textLines.push("");
        break;
      }
      case "coupon": {
        const cc = c as CouponBlockContent;
        textLines.push(`${cc.title}: ${cc.code}`, "");
        break;
      }
      case "banner": {
        const bnc = c as BannerBlockContent;
        textLines.push(resolvePersonalization(bnc.text, opts.personalization), "");
        break;
      }
      case "footer": {
        const fc = c as FooterBlockContent;
        textLines.push("---");
        if (fc.text) textLines.push(fc.text);
        if (fc.address) textLines.push(fc.address);
        textLines.push(`Unsubscribe: ${unsubUrl}`);
        break;
      }
      case "product-grid": {
        const pgc = c as ProductGridBlockContent;
        if (pgc.title) textLines.push(pgc.title);
        for (const item of pgc.items || []) {
          textLines.push(`- ${item.name} (${item.currency || "Rs"} ${item.salePrice || item.price}): ${toAbsoluteUrl(`/products/${item.slug}`)}`);
        }
        textLines.push("");
        break;
      }
      case "countdown": {
        const cdc = c as CountdownBlockContent;
        textLines.push(`[SALE COUNTDOWN] ${cdc.title}: ${cdc.hoursRemaining || 0}h ${cdc.minutesRemaining || 0}m left!`);
        if (cdc.ctaUrl) textLines.push(`Link: ${toAbsoluteUrl(cdc.ctaUrl)}`);
        textLines.push("");
        break;
      }
      case "testimonial": {
        const tmc = c as TestimonialBlockContent;
        textLines.push(`Review: "${tmc.quote}" — ${tmc.authorName} (${tmc.authorTitle || "Verified Buyer"})`, "");
        break;
      }
      case "social-links": {
        const slc = c as SocialLinksBlockContent;
        textLines.push("Follow us: " + (slc.links || []).map(l => `${l.label || l.platform}: ${l.url}`).join(" | "), "");
        break;
      }
    }
  }
  if (!hasFooter) {
    textLines.push("---", `Unsubscribe: ${unsubUrl}`);
  }

  // Detect missing variables
  const allText = `${subject} ${previewText} ${sectionsHtml}`;
  const missingVariables = detectMissingTokens(allText);

  return {
    subject,
    previewText,
    html,
    text: textLines.join("\n"),
    unsubscribeUrl: unsubUrl,
    missingVariables,
  };
}
