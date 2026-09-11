import { openAiChatJson, isOpenAiConfigured } from "@/lib/ai/openai-client";
import type {
  AiDraftOutput,
  AiPreSendReviewOutput,
  AiSubjectOption,
} from "./types";

const STRICT_PRODUCT_FACTS_SYSTEM_PROMPT = `You are a world-class ecommerce email copywriter for Findora, an established premium storefront.
CRITICAL RULES & FACT PROTECTION:
1. ONLY use facts provided in the prompt (product title, real description, verified pricing, actual discounts).
2. DO NOT hallucinate fake scarcity ("only 2 left"), false urgency, fake customer reviews, non-existent warranty promises, or made-up statistics.
3. Keep email body concise, high-conversion, professional, and respectful of the recipient's time.
4. Support personalization placeholders: {{firstName}}, {{productName}}, {{productPrice}}, {{salePrice}}, {{discount}}, {{couponCode}}.
5. Always output valid structured JSON matching the requested schema.`;

export async function generateAiDraft(params: {
  product?: {
    name: string;
    description?: string;
    price?: number;
    salePrice?: number;
    category?: string;
  };
  goal?: string;
  tone?: string;
  couponCode?: string;
  leadContext?: {
    firstName?: string;
    previousEmailsCount?: number;
    lastEmailedDaysAgo?: number;
    previousSubjects?: string[];
  };
}): Promise<AiDraftOutput | null> {
  if (!isOpenAiConfigured()) return null;

  const tone = params.tone || "professional, warm, and premium";
  const userPrompt = `Generate a high-converting promotional email draft.
Tone: ${tone}
Goal: ${params.goal || "Showcase our featured collection and delight the customer"}
${params.couponCode ? `Coupon Code available: ${params.couponCode}` : ""}

Product Details:
${
  params.product
    ? `Product Name: ${params.product.name}
Description: ${params.product.description || "Premium product"}
Regular Price: ${params.product.price ? `$${params.product.price}` : "N/A"}
Sale Price: ${params.product.salePrice ? `$${params.product.salePrice}` : "N/A"}`
    : "General store promotion"
}

Recipient Context:
${
  params.leadContext
    ? `First Name: ${params.leadContext.firstName || "Customer"}
Previous Contacts: ${params.leadContext.previousEmailsCount || 0} emails
Last Contacted: ${params.leadContext.lastEmailedDaysAgo != null ? `${params.leadContext.lastEmailedDaysAgo} days ago` : "Never"}
Previous Angles Used: ${params.leadContext.previousSubjects?.join(", ") || "None"} (Avoid repeating the same angle)`
    : "New recipient"
}

Respond in structured JSON:
{
  "subject": "Compelling subject line",
  "previewText": "Engaging preheader snippet (under 90 chars)",
  "headline": "Bold hero headline",
  "body": "Personalized email body text (2-4 paragraphs, line breaks as \\n\\n)",
  "ctaText": "Clear call to action (e.g. Explore Collection, Shop Now)",
  "tone": "${tone}",
  "reasoningSummary": "Short explanation of the messaging angle"
}`;

  return openAiChatJson<AiDraftOutput>(
    STRICT_PRODUCT_FACTS_SYSTEM_PROMPT,
    userPrompt,
    { temperature: 0.4 }
  );
}

export async function generateSubjectLineOptions(params: {
  productName?: string;
  headline?: string;
  bodySnippet?: string;
  discount?: string;
}): Promise<AiSubjectOption[]> {
  if (!isOpenAiConfigured()) return [];

  const userPrompt = `Generate 5 meaningfully distinct subject line options for this email:
Product: ${params.productName || "Featured Store Collection"}
Headline: ${params.headline || ""}
Body Excerpt: ${(params.bodySnippet || "").slice(0, 300)}
${params.discount ? `Offer: ${params.discount}` : ""}

Provide 5 options representing these angles:
1. direct_offer (transparent, clear value)
2. curiosity (intriguing without clickbait)
3. product_benefit (focused on quality and craftsmanship)
4. minimal_luxury (refined, clean, sophisticated)
5. tasteful_urgency (tasteful, non-aggressive time/collection context)

Respond in JSON:
{
  "options": [
    { "subject": "...", "angle": "direct_offer" },
    { "subject": "...", "angle": "curiosity" },
    { "subject": "...", "angle": "product_benefit" },
    { "subject": "...", "angle": "minimal_luxury" },
    { "subject": "...", "angle": "tasteful_urgency" }
  ]
}`;

  const res = await openAiChatJson<{ options: AiSubjectOption[] }>(
    STRICT_PRODUCT_FACTS_SYSTEM_PROMPT,
    userPrompt,
    { temperature: 0.6 }
  );

  return res?.options || [];
}

export async function improveEmailDraft(params: {
  currentDraft: {
    subject: string;
    previewText?: string;
    headline?: string;
    body: string;
    ctaText?: string;
  };
  action:
    | "shorter"
    | "more_premium"
    | "more_friendly"
    | "more_persuasive"
    | "less_salesy"
    | "improve_cta"
    | "fix_grammar";
}): Promise<AiDraftOutput | null> {
  if (!isOpenAiConfigured()) return null;

  const actionInstructions: Record<string, string> = {
    shorter: "Condense the content to make it punchy, eliminating fluff while retaining the core value proposition.",
    more_premium: "Elevate the vocabulary and phrasing to sound prestigious, refined, and luxury-oriented.",
    more_friendly: "Make the tone warmer, more personal, relatable, and approachable.",
    more_persuasive: "Strengthen the reasons to act today, sharpening benefits and emotional connection.",
    less_salesy: "Dial back marketing hype, removing exclamation marks and aggressive sales jargon.",
    improve_cta: "Craft high-conversion, action-oriented button copy and leading sentences.",
    fix_grammar: "Polish all punctuation, syntax, flow, and grammatical correctness while keeping exact intent.",
  };

  const instruction = actionInstructions[params.action] || "Improve readability and conversion.";

  const userPrompt = `Refine this email draft based on the following instruction:
INSTRUCTION: ${instruction}

CURRENT DRAFT:
Subject: ${params.currentDraft.subject}
Preview: ${params.currentDraft.previewText || ""}
Headline: ${params.currentDraft.headline || ""}
Body:
${params.currentDraft.body}
CTA: ${params.currentDraft.ctaText || ""}

Respond in JSON:
{
  "subject": "Refined subject",
  "previewText": "Refined preview",
  "headline": "Refined headline",
  "body": "Refined body",
  "ctaText": "Refined CTA",
  "tone": "${params.action}",
  "reasoningSummary": "What was improved"
}`;

  return openAiChatJson<AiDraftOutput>(
    STRICT_PRODUCT_FACTS_SYSTEM_PROMPT,
    userPrompt,
    { temperature: 0.3 }
  );
}

export async function aiPreSendReview(params: {
  subject: string;
  previewText?: string;
  headline?: string;
  body: string;
  ctaText?: string;
}): Promise<AiPreSendReviewOutput | null> {
  if (!isOpenAiConfigured()) return null;

  const userPrompt = `Review this marketing email before it is sent to customers:
Subject: ${params.subject}
Preview Text: ${params.previewText || ""}
Headline: ${params.headline || ""}
Body:
${params.body}
CTA Text: ${params.ctaText || ""}

Evaluate:
1. Clarity & coherence between subject, body, and CTA.
2. Deliverability health (detect excessive ALL-CAPS, spammy buzzwords like "FREE CASH 100% GUARANTEE", deceptive claims).
3. Tone quality and brand alignment.

Respond in JSON:
{
  "clarityScore": 88,
  "toneAssessment": "Professional and balanced",
  "warnings": ["Array of any cautionary flags or empty if none"],
  "suggestions": ["Array of practical improvements or empty if ready"],
  "isApprovedForSend": true
}`;

  return openAiChatJson<AiPreSendReviewOutput>(
    STRICT_PRODUCT_FACTS_SYSTEM_PROMPT,
    userPrompt,
    { temperature: 0.2 }
  );
}

export async function summarizeLeadEmailHistory(
  leadName: string,
  history: {
    subject: string;
    sentAt: Date | string;
    status: string;
    campaignName?: string;
  }[]
): Promise<string> {
  if (!isOpenAiConfigured() || history.length === 0) {
    return `Contacted ${history.length} time(s). Most recent: ${new Date(history[0]?.sentAt).toLocaleDateString()}`;
  }

  const compactList = history
    .slice(0, 10)
    .map(
      (h) =>
        `- ${new Date(h.sentAt).toLocaleDateString()}: "${h.subject}" (${h.status}) [${h.campaignName || "Outreach"}]`
    )
    .join("\n");

  const prompt = `Summarize this lead's communication history concisely in 2-3 sentences for an admin. Mention total outreach, general angles used, and recommend whether a new campaign should try a different approach.
Lead: ${leadName}
History:
${compactList}

Respond in JSON:
{
  "summary": "Concise 2-3 sentence overview"
}`;

  const res = await openAiChatJson<{ summary: string }>(
    "You are a CRM assistant providing concise lead summaries.",
    prompt,
    { temperature: 0.2 }
  );

  return res?.summary || `Contacted ${history.length} time(s).`;
}

export async function explainSmtpFailure(params: {
  smtpCode?: number;
  category?: string;
  rawError?: string;
}): Promise<string> {
  if (!isOpenAiConfigured()) {
    return params.rawError || "Delivery attempt failed.";
  }

  const prompt = `Explain this email delivery failure in plain English for a non-technical store admin in 1-2 sentences. Explain whether retrying makes sense or if the address should be suppressed.
SMTP Code: ${params.smtpCode || "N/A"}
Category: ${params.category || "UNKNOWN"}
Raw Diagnostic: ${params.rawError || "None provided"}

Respond in JSON:
{
  "explanation": "Plain English summary and recommended admin action."
}`;

  const res = await openAiChatJson<{ explanation: string }>(
    "You are an email deliverability engineer explaining SMTP bounce codes.",
    prompt,
    { temperature: 0.1 }
  );

  return res?.explanation || params.rawError || "Delivery failed.";
}

// ─── AI STRUCTURED EMAIL DESIGN ─────────────────────────────────────────────

const AI_DESIGN_SYSTEM_PROMPT = `You are a world-class email designer for Findora, a premium ecommerce brand.
You generate structured JSON that matches our EmailDocument section schema.

SUPPORTED BLOCK TYPES: text, button, image, product, hero, spacer, divider, coupon, banner, footer

PRODUCT BLOCK: When a product is provided, include it with layout options: image-top, image-left, image-right, hero, compact, price-focused, image-button-only.

CRITICAL RULES:
1. Output valid JSON matching the schema exactly.
2. NEVER invent product prices, discounts, or factual claims. Use ONLY the data provided.
3. Use personalization placeholders: {{firstName}}, {{productName}}, {{productPrice}}, {{salePrice}}, {{discount}}.
4. Use email-safe colors (hex codes). Prefer premium, refined palettes.
5. All URLs should be relative paths like /products/slug — the system converts them to absolute URLs.
6. Generate only the "sections" array and optionally "globalStyles". The system wraps them.
7. Every design MUST include a footer block with showUnsubscribe: true.`;

export interface AiDesignRequest {
  prompt: string;
  product?: {
    name: string;
    slug: string;
    description?: string;
    price?: number;
    salePrice?: number;
    image?: string;
    currency?: string;
  };
  existingDocument?: unknown;
  action?: "create" | "modify" | "improve_premium" | "improve_minimal" | "improve_hierarchy" | "improve_cta" | "improve_mobile" | "redesign";
  couponCode?: string;
}

export interface AiDesignResponse {
  globalStyles?: Record<string, unknown>;
  sections: Array<Record<string, unknown>>;
  reasoning?: string;
}

export async function generateAiEmailDesign(params: AiDesignRequest): Promise<AiDesignResponse | null> {
  if (!isOpenAiConfigured()) return null;

  const productContext = params.product
    ? `\nPRODUCT DATA (use EXACTLY these values):
Product Name: ${params.product.name}
Slug: ${params.product.slug}
Description: ${params.product.description || "Premium product"}
Price: ${params.product.price ? `${params.product.currency || "Rs"} ${params.product.price}` : "N/A"}
Sale Price: ${params.product.salePrice ? `${params.product.currency || "Rs"} ${params.product.salePrice}` : "N/A"}
Image URL: ${params.product.image || "N/A"}`
    : "";

  const existingContext = params.existingDocument
    ? `\nEXISTING DESIGN (modify this):\n${JSON.stringify(params.existingDocument, null, 2).slice(0, 3000)}`
    : "";

  const actionMap: Record<string, string> = {
    create: "Create a complete email design from scratch.",
    modify: "Modify the existing design based on the user's instructions.",
    improve_premium: "Make the design feel more luxurious, premium, and refined. Use dark/elegant tones.",
    improve_minimal: "Simplify the design. Remove clutter, increase whitespace, use minimal typography.",
    improve_hierarchy: "Improve visual hierarchy. Make the most important elements stand out. Guide the eye.",
    improve_cta: "Strengthen the call-to-action. Make it more prominent, compelling, and action-oriented.",
    improve_mobile: "Optimize for mobile email reading. Larger touch targets, simpler layout, readable font sizes.",
    redesign: "Completely redesign the email while preserving the core content and product information.",
  };

  const actionInstruction = actionMap[params.action || "create"] || actionMap.create;

  const userPrompt = `${actionInstruction}

USER INSTRUCTION: ${params.prompt}
${productContext}
${params.couponCode ? `\nCoupon Code: ${params.couponCode}` : ""}
${existingContext}

Respond with valid JSON:
{
  "globalStyles": { optional global style overrides },
  "sections": [
    {
      "id": "unique_id",
      "type": "block_type",
      "visible": true,
      "settings": { section settings },
      "content": { block-specific content }
    }
  ],
  "reasoning": "Brief explanation of design choices"
}

For product blocks, use this content structure:
{
  "productId": "${params.product?.slug || "product-id"}",
  "productSnapshot": { "name": "...", "slug": "...", "price": ..., "salePrice": ..., "image": "...", "currency": "Rs" },
  "layout": "image-top",
  "showImage": true, "showTitle": true, "showDescription": true,
  "showPrice": true, "showSalePrice": true, "showDiscount": true, "showCta": true,
  "ctaText": "Shop Now"
}`;

  return openAiChatJson<AiDesignResponse>(
    AI_DESIGN_SYSTEM_PROMPT,
    userPrompt,
    { temperature: 0.5, maxTokens: 4000 }
  );
}

export interface AiDesignReviewResponse {
  clarityScore: number;
  toneAssessment: string;
  designFeedback: string;
  contentWarnings: string[];
  designWarnings: string[];
  contentSuggestions: string[];
  designSuggestions: string[];
  isApprovedForSend: boolean;
}

export async function aiDesignReview(params: {
  subject: string;
  previewText?: string;
  sections: Array<{ type: string; content: unknown }>;
}): Promise<AiDesignReviewResponse | null> {
  if (!isOpenAiConfigured()) return null;

  const sectionSummary = params.sections
    .map((s, i) => `${i + 1}. ${s.type}: ${JSON.stringify(s.content).slice(0, 200)}`)
    .join("\n");

  const prompt = `Review this marketing email before sending. Evaluate BOTH content AND design quality.

Subject: ${params.subject}
Preview: ${params.previewText || ""}
Sections:
${sectionSummary}

Evaluate:
1. Content: clarity, grammar, tone, CTA effectiveness, factual claims, repetition
2. Design: visual hierarchy, excessive text, too many CTAs, weak product prominence, inconsistent styling, mobile readability, content flow

Respond in JSON:
{
  "clarityScore": 85,
  "toneAssessment": "Professional and balanced",
  "designFeedback": "Brief design assessment",
  "contentWarnings": ["warnings about content"],
  "designWarnings": ["warnings about design"],
  "contentSuggestions": ["improvements for content"],
  "designSuggestions": ["improvements for design"],
  "isApprovedForSend": true
}`;

  return openAiChatJson<AiDesignReviewResponse>(
    STRICT_PRODUCT_FACTS_SYSTEM_PROMPT,
    prompt,
    { temperature: 0.2 }
  );
}
