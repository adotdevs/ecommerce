import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiError } from "@/lib/api/response";
import { openAiChatJson, isOpenAiConfigured } from "@/lib/ai/openai-client";
import { translateText } from "@/lib/i18n/translate";
import { localeConfig } from "@/config/locales";
import type { EmailSection, LocalizedEmailVariant } from "@/lib/email/document-schema";

const translateRequestSchema = z.object({
  targetLocale: z.string().min(2),
  sourceLocale: z.string().optional().default("en"),
  subject: z.string().optional(),
  previewText: z.string().optional(),
  bodyText: z.string().optional(),
  sections: z.array(z.any()).optional(),
  document: z.any().optional(),
  preserveTokens: z.boolean().optional(),
});

const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  ar: "Arabic",
  ur: "Urdu",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  hi: "Hindi",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
};

/**
 * Collect all translatable text nodes from the email document sections into a key-value dictionary.
 * Recursively inspects product blocks, product grids, hero banners, coupons, testimonials, and columns.
 */
function extractTranslatableMap(
  subject: string,
  previewText: string,
  bodyText: string,
  sections?: EmailSection[]
): Record<string, string> {
  const map: Record<string, string> = {};

  if (subject?.trim()) map["email_subject"] = subject.trim();
  if (previewText?.trim()) map["email_preview"] = previewText.trim();
  if (bodyText?.trim()) map["email_body"] = bodyText.trim();

  const processSections = (secs: EmailSection[], prefix: string = "sec") => {
    if (!Array.isArray(secs)) return;
    secs.forEach((sec, idx) => {
      const p = `${prefix}_${sec.id || idx}`;
      const c = sec.content as any;
      if (!c) return;

      const type = sec.type;

      // 1. Product Block (single product feature/card)
      if (type === "product") {
        const prodTitle = c.displayTitle || c.productSnapshot?.name;
        if (typeof prodTitle === "string" && prodTitle.trim()) {
          map[`${p}_productTitle`] = prodTitle.trim();
        }
        const prodDesc = c.displayDescription || c.productSnapshot?.description;
        if (typeof prodDesc === "string" && prodDesc.trim()) {
          map[`${p}_productDesc`] = prodDesc.trim();
        }
        if (typeof c.ctaText === "string" && c.ctaText.trim()) {
          map[`${p}_ctaText`] = c.ctaText.trim();
        }
        if (typeof c.badgeText === "string" && c.badgeText.trim()) {
          map[`${p}_badgeText`] = c.badgeText.trim();
        }
        if (typeof c.title === "string" && c.title.trim()) {
          map[`${p}_title`] = c.title.trim();
        }
      }

      // 2. Product Grid Block (multi-item showcase)
      else if (type === "product-grid") {
        if (typeof c.title === "string" && c.title.trim()) {
          map[`${p}_title`] = c.title.trim();
        }
        if (typeof c.subtitle === "string" && c.subtitle.trim()) {
          map[`${p}_subtitle`] = c.subtitle.trim();
        }
        if (typeof c.ctaText === "string" && c.ctaText.trim()) {
          map[`${p}_ctaText`] = c.ctaText.trim();
        }
        const items = c.items || c.products;
        if (Array.isArray(items)) {
          items.forEach((item: any, itemIdx: number) => {
            const itemKey = `${p}_item_${item.id || itemIdx}`;
            if (typeof item.name === "string" && item.name.trim()) {
              map[`${itemKey}_name`] = item.name.trim();
            }
            if (typeof item.badge === "string" && item.badge.trim()) {
              map[`${itemKey}_badge`] = item.badge.trim();
            }
          });
        }
      }

      // 3. Hero Block
      else if (type === "hero") {
        if (typeof c.title === "string" && c.title.trim()) map[`${p}_title`] = c.title.trim();
        if (typeof c.headline === "string" && c.headline.trim()) map[`${p}_headline`] = c.headline.trim();
        if (typeof c.subtitle === "string" && c.subtitle.trim()) map[`${p}_subtitle`] = c.subtitle.trim();
        if (typeof c.paragraph === "string" && c.paragraph.trim()) map[`${p}_paragraph`] = c.paragraph.trim();
        if (typeof c.ctaText === "string" && c.ctaText.trim()) map[`${p}_ctaText`] = c.ctaText.trim();
        if (typeof c.buttonText === "string" && c.buttonText.trim()) map[`${p}_buttonText`] = c.buttonText.trim();
      }

      // 4. Coupon Block
      else if (type === "coupon") {
        if (typeof c.title === "string" && c.title.trim()) map[`${p}_title`] = c.title.trim();
        if (typeof c.description === "string" && c.description.trim()) map[`${p}_description`] = c.description.trim();
        if (typeof c.discountText === "string" && c.discountText.trim()) map[`${p}_discountText`] = c.discountText.trim();
        if (typeof c.ctaText === "string" && c.ctaText.trim()) map[`${p}_ctaText`] = c.ctaText.trim();
      }

      // 5. Banner Block
      else if (type === "banner") {
        if (typeof c.text === "string" && c.text.trim()) map[`${p}_text`] = c.text.trim();
        if (typeof c.headline === "string" && c.headline.trim()) map[`${p}_headline`] = c.headline.trim();
        if (typeof c.ctaText === "string" && c.ctaText.trim()) map[`${p}_ctaText`] = c.ctaText.trim();
      }

      // 6. Countdown Block
      else if (type === "countdown") {
        if (typeof c.title === "string" && c.title.trim()) map[`${p}_title`] = c.title.trim();
        if (typeof c.headline === "string" && c.headline.trim()) map[`${p}_headline`] = c.headline.trim();
        if (typeof c.subtitle === "string" && c.subtitle.trim()) map[`${p}_subtitle`] = c.subtitle.trim();
        if (typeof c.badgeText === "string" && c.badgeText.trim()) map[`${p}_badgeText`] = c.badgeText.trim();
        if (typeof c.ctaText === "string" && c.ctaText.trim()) map[`${p}_ctaText`] = c.ctaText.trim();
      }

      // 7. Testimonial Block
      else if (type === "testimonial") {
        if (typeof c.quote === "string" && c.quote.trim()) map[`${p}_quote`] = c.quote.trim();
        if (typeof c.authorTitle === "string" && c.authorTitle.trim()) map[`${p}_authorTitle`] = c.authorTitle.trim();
      }

      // 8. Footer Block
      else if (type === "footer") {
        if (typeof c.companyName === "string" && c.companyName.trim()) map[`${p}_companyName`] = c.companyName.trim();
        if (typeof c.text === "string" && c.text.trim()) map[`${p}_text`] = c.text.trim();
        if (typeof c.address === "string" && c.address.trim()) map[`${p}_address`] = c.address.trim();
      }

      // 9. Social Links Block
      else if (type === "social-links") {
        if (typeof c.title === "string" && c.title.trim()) map[`${p}_title`] = c.title.trim();
        if (typeof c.headline === "string" && c.headline.trim()) map[`${p}_headline`] = c.headline.trim();
        if (Array.isArray(c.links)) {
          c.links.forEach((link: any, linkIdx: number) => {
            if (typeof link.label === "string" && link.label.trim()) {
              map[`${p}_link_${linkIdx}_label`] = link.label.trim();
            }
          });
        }
      }

      // 10. Columns Block (Recursively traverse nested blocks in all columns)
      else if (type === "columns") {
        if (Array.isArray(c.columns)) {
          c.columns.forEach((col: any, colIdx: number) => {
            if (Array.isArray(col.blocks)) {
              processSections(col.blocks, `${p}_col_${colIdx}`);
            }
          });
        }
      }

      // 11. General fallback for text, button, or any custom block
      else {
        if (typeof c.text === "string" && c.text.trim()) map[`${p}_text`] = c.text.trim();
        if (typeof c.heading === "string" && c.heading.trim()) map[`${p}_heading`] = c.heading.trim();
        if (typeof c.subheading === "string" && c.subheading.trim()) map[`${p}_subheading`] = c.subheading.trim();
        if (typeof c.headline === "string" && c.headline.trim()) map[`${p}_headline`] = c.headline.trim();
        if (typeof c.subheadline === "string" && c.subheadline.trim()) map[`${p}_subheadline`] = c.subheadline.trim();
        if (typeof c.buttonText === "string" && c.buttonText.trim()) map[`${p}_buttonText`] = c.buttonText.trim();
        if (typeof c.title === "string" && c.title.trim()) map[`${p}_title`] = c.title.trim();
        if (typeof c.subtitle === "string" && c.subtitle.trim()) map[`${p}_subtitle`] = c.subtitle.trim();
        if (typeof c.description === "string" && c.description.trim()) map[`${p}_description`] = c.description.trim();
        if (typeof c.ctaText === "string" && c.ctaText.trim()) map[`${p}_ctaText`] = c.ctaText.trim();
        if (typeof c.quote === "string" && c.quote.trim()) map[`${p}_quote`] = c.quote.trim();
        if (typeof c.author === "string" && c.author.trim()) map[`${p}_author`] = c.author.trim();
        if (typeof c.role === "string" && c.role.trim()) map[`${p}_role`] = c.role.trim();
        if (typeof c.caption === "string" && c.caption.trim()) map[`${p}_caption`] = c.caption.trim();
        if (typeof c.customText === "string" && c.customText.trim()) map[`${p}_customText`] = c.customText.trim();
      }
    });
  };

  processSections(sections || []);
  return map;
}

/**
 * Re-inject translated text values back into the sections structure.
 * Accurately maps product titles into both `displayTitle` and `productSnapshot.name`,
 * as well as descriptions, grid items, buttons, and badges.
 */
function applyTranslatedMap(
  translatedMap: Record<string, string>,
  subject: string,
  previewText: string,
  bodyText: string,
  sections?: EmailSection[]
): {
  subject: string;
  previewText: string;
  bodyText: string;
  sections?: EmailSection[];
} {
  const newSubject = translatedMap["email_subject"] ?? subject;
  const newPreview = translatedMap["email_preview"] ?? previewText;
  const newBody = translatedMap["email_body"] ?? bodyText;

  if (!sections || !Array.isArray(sections)) {
    return { subject: newSubject, previewText: newPreview, bodyText: newBody };
  }

  const newSections: EmailSection[] = JSON.parse(JSON.stringify(sections));

  const applyToSections = (secs: EmailSection[], prefix: string = "sec") => {
    secs.forEach((sec, idx) => {
      const p = `${prefix}_${sec.id || idx}`;
      const c = sec.content as any;
      if (!c) return;

      const type = sec.type;

      if (type === "product") {
        if (translatedMap[`${p}_productTitle`] !== undefined) {
          const transTitle = translatedMap[`${p}_productTitle`];
          c.displayTitle = transTitle;
          if (c.productSnapshot) {
            c.productSnapshot.name = transTitle;
          }
        }
        if (translatedMap[`${p}_productDesc`] !== undefined) {
          const transDesc = translatedMap[`${p}_productDesc`];
          c.displayDescription = transDesc;
          if (c.productSnapshot) {
            c.productSnapshot.description = transDesc;
          }
        }
        if (translatedMap[`${p}_ctaText`] !== undefined) c.ctaText = translatedMap[`${p}_ctaText`];
        if (translatedMap[`${p}_badgeText`] !== undefined) c.badgeText = translatedMap[`${p}_badgeText`];
        if (translatedMap[`${p}_title`] !== undefined) c.title = translatedMap[`${p}_title`];
      } else if (type === "product-grid") {
        if (translatedMap[`${p}_title`] !== undefined) c.title = translatedMap[`${p}_title`];
        if (translatedMap[`${p}_subtitle`] !== undefined) c.subtitle = translatedMap[`${p}_subtitle`];
        if (translatedMap[`${p}_ctaText`] !== undefined) c.ctaText = translatedMap[`${p}_ctaText`];
        const items = c.items || c.products;
        if (Array.isArray(items)) {
          items.forEach((item: any, itemIdx: number) => {
            const itemKey = `${p}_item_${item.id || itemIdx}`;
            if (translatedMap[`${itemKey}_name`] !== undefined) {
              item.name = translatedMap[`${itemKey}_name`];
            }
            if (translatedMap[`${itemKey}_badge`] !== undefined) {
              item.badge = translatedMap[`${itemKey}_badge`];
            }
          });
        }
      } else if (type === "hero") {
        if (translatedMap[`${p}_title`] !== undefined) c.title = translatedMap[`${p}_title`];
        if (translatedMap[`${p}_headline`] !== undefined) c.headline = translatedMap[`${p}_headline`];
        if (translatedMap[`${p}_subtitle`] !== undefined) c.subtitle = translatedMap[`${p}_subtitle`];
        if (translatedMap[`${p}_paragraph`] !== undefined) c.paragraph = translatedMap[`${p}_paragraph`];
        if (translatedMap[`${p}_ctaText`] !== undefined) c.ctaText = translatedMap[`${p}_ctaText`];
        if (translatedMap[`${p}_buttonText`] !== undefined) c.buttonText = translatedMap[`${p}_buttonText`];
      } else if (type === "coupon") {
        if (translatedMap[`${p}_title`] !== undefined) c.title = translatedMap[`${p}_title`];
        if (translatedMap[`${p}_description`] !== undefined) c.description = translatedMap[`${p}_description`];
        if (translatedMap[`${p}_discountText`] !== undefined) c.discountText = translatedMap[`${p}_discountText`];
        if (translatedMap[`${p}_ctaText`] !== undefined) c.ctaText = translatedMap[`${p}_ctaText`];
      } else if (type === "banner") {
        if (translatedMap[`${p}_text`] !== undefined) c.text = translatedMap[`${p}_text`];
        if (translatedMap[`${p}_headline`] !== undefined) c.headline = translatedMap[`${p}_headline`];
        if (translatedMap[`${p}_ctaText`] !== undefined) c.ctaText = translatedMap[`${p}_ctaText`];
      } else if (type === "countdown") {
        if (translatedMap[`${p}_title`] !== undefined) c.title = translatedMap[`${p}_title`];
        if (translatedMap[`${p}_headline`] !== undefined) c.headline = translatedMap[`${p}_headline`];
        if (translatedMap[`${p}_subtitle`] !== undefined) c.subtitle = translatedMap[`${p}_subtitle`];
        if (translatedMap[`${p}_badgeText`] !== undefined) c.badgeText = translatedMap[`${p}_badgeText`];
        if (translatedMap[`${p}_ctaText`] !== undefined) c.ctaText = translatedMap[`${p}_ctaText`];
      } else if (type === "testimonial") {
        if (translatedMap[`${p}_quote`] !== undefined) c.quote = translatedMap[`${p}_quote`];
        if (translatedMap[`${p}_authorTitle`] !== undefined) c.authorTitle = translatedMap[`${p}_authorTitle`];
      } else if (type === "footer") {
        if (translatedMap[`${p}_companyName`] !== undefined) c.companyName = translatedMap[`${p}_companyName`];
        if (translatedMap[`${p}_text`] !== undefined) c.text = translatedMap[`${p}_text`];
        if (translatedMap[`${p}_address`] !== undefined) c.address = translatedMap[`${p}_address`];
      } else if (type === "social-links") {
        if (translatedMap[`${p}_title`] !== undefined) c.title = translatedMap[`${p}_title`];
        if (translatedMap[`${p}_headline`] !== undefined) c.headline = translatedMap[`${p}_headline`];
        if (Array.isArray(c.links)) {
          c.links.forEach((link: any, linkIdx: number) => {
            if (translatedMap[`${p}_link_${linkIdx}_label`] !== undefined) {
              link.label = translatedMap[`${p}_link_${linkIdx}_label`];
            }
          });
        }
      } else if (type === "columns") {
        if (Array.isArray(c.columns)) {
          c.columns.forEach((col: any, colIdx: number) => {
            if (Array.isArray(col.blocks)) {
              applyToSections(col.blocks, `${p}_col_${colIdx}`);
            }
          });
        }
      } else {
        if (translatedMap[`${p}_text`] !== undefined) c.text = translatedMap[`${p}_text`];
        if (translatedMap[`${p}_heading`] !== undefined) c.heading = translatedMap[`${p}_heading`];
        if (translatedMap[`${p}_subheading`] !== undefined) c.subheading = translatedMap[`${p}_subheading`];
        if (translatedMap[`${p}_headline`] !== undefined) c.headline = translatedMap[`${p}_headline`];
        if (translatedMap[`${p}_subheadline`] !== undefined) c.subheadline = translatedMap[`${p}_subheadline`];
        if (translatedMap[`${p}_buttonText`] !== undefined) c.buttonText = translatedMap[`${p}_buttonText`];
        if (translatedMap[`${p}_title`] !== undefined) c.title = translatedMap[`${p}_title`];
        if (translatedMap[`${p}_subtitle`] !== undefined) c.subtitle = translatedMap[`${p}_subtitle`];
        if (translatedMap[`${p}_description`] !== undefined) c.description = translatedMap[`${p}_description`];
        if (translatedMap[`${p}_ctaText`] !== undefined) c.ctaText = translatedMap[`${p}_ctaText`];
        if (translatedMap[`${p}_quote`] !== undefined) c.quote = translatedMap[`${p}_quote`];
        if (translatedMap[`${p}_author`] !== undefined) c.author = translatedMap[`${p}_author`];
        if (translatedMap[`${p}_role`] !== undefined) c.role = translatedMap[`${p}_role`];
        if (translatedMap[`${p}_caption`] !== undefined) c.caption = translatedMap[`${p}_caption`];
        if (translatedMap[`${p}_customText`] !== undefined) c.customText = translatedMap[`${p}_customText`];
      }
    });
  };

  applyToSections(newSections);

  return {
    subject: newSubject,
    previewText: newPreview,
    bodyText: newBody,
    sections: newSections,
  };
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = translateRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, 400);
    }

    const doc = parsed.data.document;
    const sourceLocale = parsed.data.sourceLocale || doc?.defaultLocale || "en";
    const targetLocale = parsed.data.targetLocale;

    // Extract subject, previewText, bodyText, and sections from top-level or from document
    const subject = (parsed.data.subject !== undefined ? parsed.data.subject : doc?.subject) || "";
    const previewText = (parsed.data.previewText !== undefined ? parsed.data.previewText : doc?.previewText) || "";
    const bodyText = (parsed.data.bodyText !== undefined ? parsed.data.bodyText : doc?.bodyText) || "";
    const sections = (parsed.data.sections !== undefined ? parsed.data.sections : doc?.sections) || [];

    const sourceName = LOCALE_NAMES[sourceLocale] || sourceLocale;
    const targetName = LOCALE_NAMES[targetLocale] || targetLocale;
    const isRtl =
      localeConfig[targetLocale]?.dir === "rtl" ||
      targetLocale === "ar" ||
      targetLocale === "ur";
    const direction: "ltr" | "rtl" = isRtl ? "rtl" : "ltr";

    const textMap = extractTranslatableMap(subject, previewText, bodyText, sections);
    const translatedMap: Record<string, string> = {};

    if (Object.keys(textMap).length > 0) {
      if (isOpenAiConfigured()) {
        try {
          const systemPrompt = `You are an expert e-commerce multilingual localization copywriter.
Translate the provided key-value dictionary of email marketing texts from ${sourceName} into fluent, high-converting ${targetName}.

MANDATORY TRANSLATION RULES:
1. RETAIN EXACT KEYS: Return strictly valid JSON with the "translations" object containing exact matching keys: { "translations": { ... } }.
2. TRANSLATE EVERY VALUE: Every single string in the dictionary MUST be translated into ${targetName}. Do NOT skip any keys or leave text in English.
3. TRANSLATE ALL PRODUCT TITLES & DESCRIPTIONS:
   You MUST translate every product title (keys ending in _productTitle, _name) and product description (keys ending in _productDesc, _description) into natural ${targetName} e-commerce copy.
   Translate descriptive words completely. For example:
   - "Men's Slim Fit Cotton Polo Shirt" -> Translated to ${targetName}
   - "Wireless Noise Cancelling Over-Ear Headphones" -> Translated to ${targetName}
   - "Vintage Floral Maxi Dress" -> Translated to ${targetName}
   - "Luxury Italian Leather Wallet" -> Translated to ${targetName}
   Do NOT leave descriptive product words in English! Only keep global proper brand names (e.g. "Apple", "Nike", "Sony") as-is if customary.
4. TRANSLATE CALL-TO-ACTIONS & BUTTONS:
   Translate all CTAs (keys ending in _ctaText, _buttonText) into persuasive, high-converting retail action phrases for ${targetName} (e.g. "Shop Now" -> "تسوق الآن" / "Acheter maintenant" / "Jetzt einkaufen" / "¡Compra ahora!" / "ابھی خریداری کریں").
5. STRICTLY PRESERVE PERSONALIZATION TOKENS:
   NEVER translate, modify, or remove variables inside curly braces, e.g. {{firstName}}, {{lastName}}, {{storeName}}, {{productName}}, {{productPrice}}, {{salePrice}}, {{discount}}, {{couponCode}}, {{unsubscribeUrl}}. Keep them 100% identical including the braces.
6. RTL & CULTURAL ELEGANCE:
   If target language is Arabic or Urdu, craft natural, elegant, grammatically flawless copy with polite addressing and natural RTL phrasing.`;

          const userPrompt = JSON.stringify({ texts: textMap });
          const response = await openAiChatJson<{ translations: Record<string, string> }>(
            systemPrompt,
            userPrompt,
            { temperature: 0.25 }
          );

          if (response?.translations && typeof response.translations === "object") {
            Object.assign(translatedMap, response.translations);
          }
        } catch (aiErr) {
          console.warn("[EmailTranslate] OpenAI translation error, falling back to translateText:", aiErr);
        }
      }

      // Fallback for any keys that weren't translated by OpenAI or if OpenAI is unavailable
      for (const [key, val] of Object.entries(textMap)) {
        if (!translatedMap[key] && val.trim()) {
          try {
            const fallbackVal = await translateText(val, targetLocale, sourceLocale);
            translatedMap[key] = fallbackVal;
          } catch {
            translatedMap[key] = val; // Preserve original if translation fails
          }
        }
      }
    }

    const applied = applyTranslatedMap(translatedMap, subject, previewText, bodyText, sections);

    const variant: LocalizedEmailVariant = {
      locale: targetLocale,
      subject: applied.subject,
      previewText: applied.previewText,
      bodyText: applied.bodyText,
      sections: applied.sections,
      direction,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      locale: targetLocale,
      variant,
      direction,
      data: {
        locale: targetLocale,
        variant,
        direction,
      },
    });
  } catch (err) {
    console.error("[EmailTranslate] Unhandled error:", err);
    return apiError(err instanceof Error ? err.message : "Translation failed", 500);
  }
}, PERMISSIONS.MARKETING_WRITE);
