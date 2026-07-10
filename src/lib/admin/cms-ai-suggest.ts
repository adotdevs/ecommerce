import { openAiChatJson } from "@/lib/ai/openai-client";
import type { CatalogPageSlug } from "@/models/CatalogPage";
import { DEFAULT_CATALOG_PAGES, CATALOG_PAGE_META } from "@/lib/cms/catalog-pages";

export interface CategoryAiSuggestion {
  description: string;
  seoTitle: string;
  seoDescription: string;
}

export interface BrandAiSuggestion {
  description: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
}

export interface CatalogPageAiSuggestion {
  eyebrow: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  emptyTitle: string;
  emptySubtitle: string;
  seoTitle: string;
  seoDescription: string;
}

function templateCategory(name: string): CategoryAiSuggestion {
  const n = name.trim();
  return {
    description: `Shop our ${n} collection — curated quality products with fast shipping and easy returns.`,
    seoTitle: `${n} | Shop Online`,
    seoDescription: `Browse ${n} products. Find top brands and great prices.`,
  };
}

function templateBrand(name: string, categories?: string[]): BrandAiSuggestion {
  const n = name.trim();
  const cat = categories?.length ? ` in ${categories.join(", ")}` : "";
  return {
    description: `${n} — trusted brand${cat}. Quality products backed by our store guarantee.`,
    seoTitle: `${n} Products | Official Store`,
    seoDescription: `Shop ${n} at our store. Authentic products, great prices.`,
    keywords: [n.toLowerCase(), "brand", "shop", ...(categories ?? []).map((c) => c.toLowerCase())].slice(0, 6),
  };
}

export async function suggestCategoryContent(
  name: string,
  parentName?: string
): Promise<CategoryAiSuggestion> {
  const parsed = await openAiChatJson<CategoryAiSuggestion>(
    `You write e-commerce category page copy. Return JSON: { description (2 sentences), seoTitle, seoDescription (max 160 chars) }. Professional, conversion-focused.`,
    `Category: ${name}${parentName ? `\nParent category: ${parentName}` : ""}`
  );
  if (parsed?.description) {
    return {
      description: String(parsed.description),
      seoTitle: String(parsed.seoTitle ?? `${name} | Shop Online`),
      seoDescription: String(parsed.seoDescription ?? parsed.description).slice(0, 200),
    };
  }
  return templateCategory(name);
}

export async function suggestBrandContent(
  name: string,
  categories?: string[]
): Promise<BrandAiSuggestion> {
  const parsed = await openAiChatJson<BrandAiSuggestion>(
    `You write e-commerce brand page copy. Return JSON: { description (2-3 sentences), seoTitle, seoDescription, keywords: string[] }.`,
    `Brand: ${name}${categories?.length ? `\nCategories: ${categories.join(", ")}` : ""}`
  );
  if (parsed?.description) {
    return {
      description: String(parsed.description),
      seoTitle: String(parsed.seoTitle ?? `${name} | Shop`),
      seoDescription: String(parsed.seoDescription ?? "").slice(0, 200),
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : [],
    };
  }
  return templateBrand(name, categories);
}

export async function suggestCatalogPageContent(
  slug: CatalogPageSlug,
  hint?: string
): Promise<CatalogPageAiSuggestion> {
  const meta = CATALOG_PAGE_META[slug];
  const defaults = DEFAULT_CATALOG_PAGES[slug];

  const parsed = await openAiChatJson<CatalogPageAiSuggestion>(
    `You write e-commerce catalog landing page copy. Return JSON with: eyebrow, badge, title, subtitle, ctaLabel, ctaHref, emptyTitle, emptySubtitle, seoTitle, seoDescription. Match page purpose. ctaHref should be a site path like /products.`,
    `Page: ${meta.label} (${slug})\nPurpose: ${meta.description}\nPath: ${meta.path}${hint ? `\nMerchant hint: ${hint}` : ""}`
  );

  if (parsed?.title) {
    return {
      eyebrow: String(parsed.eyebrow ?? defaults.eyebrow ?? ""),
      badge: String(parsed.badge ?? defaults.badge ?? ""),
      title: String(parsed.title),
      subtitle: String(parsed.subtitle ?? ""),
      ctaLabel: String(parsed.ctaLabel ?? defaults.ctaLabel ?? "Shop now"),
      ctaHref: String(parsed.ctaHref ?? defaults.ctaHref ?? "/products"),
      emptyTitle: String(parsed.emptyTitle ?? defaults.emptyTitle ?? "No products"),
      emptySubtitle: String(parsed.emptySubtitle ?? defaults.emptySubtitle ?? ""),
      seoTitle: String(parsed.seoTitle ?? parsed.title),
      seoDescription: String(parsed.seoDescription ?? "").slice(0, 200),
    };
  }

  return {
    eyebrow: defaults.eyebrow ?? "",
    badge: defaults.badge ?? "",
    title: defaults.title,
    subtitle: defaults.subtitle ?? "",
    ctaLabel: defaults.ctaLabel ?? "Shop now",
    ctaHref: defaults.ctaHref ?? "/products",
    emptyTitle: defaults.emptyTitle ?? "",
    emptySubtitle: defaults.emptySubtitle ?? "",
    seoTitle: defaults.seoTitle ?? defaults.title,
    seoDescription: defaults.seoDescription ?? "",
  };
}

const HOMEPAGE_SECTION_PROMPTS: Record<string, string> = {
  hero_slider: `Return JSON for hero_slider: { heroBadge, exploreNewLabel, exploreNewHref, slides: [{ title, subtitle, cta: { label, href } }] } — 1-3 slides.`,
  featured_products: `Return JSON: { title, subtitle, ctaLabel, ctaHref, limit: number }`,
  promo_banner: `Return JSON: { title, subtitle, ctaLabel, ctaHref, badge }`,
  flash_sale: `Return JSON: { eyebrow, title, subtitle, ctaLabel, ctaHref }`,
  newsletter: `Return JSON: { title, subtitle, buttonLabel, privacyNote }`,
  category_showcase: `Return JSON: { title, subtitle }`,
  trust_badges: `Return JSON: { badges: [{ title, description }] } — 3-4 badges`,
};

export async function suggestHomepageSection(
  sectionType: string,
  prompt: string,
  currentConfig?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const schemaHint =
    HOMEPAGE_SECTION_PROMPTS[sectionType] ??
    `Return JSON config object appropriate for section type "${sectionType}".`;

  const parsed = await openAiChatJson<Record<string, unknown>>(
    `You are an e-commerce homepage CMS expert. ${schemaHint} Write compelling retail copy. Use href paths like /products, /deals, /bestsellers.`,
    `Section type: ${sectionType}\nMerchant request: ${prompt}${currentConfig ? `\nCurrent config (improve on this): ${JSON.stringify(currentConfig).slice(0, 500)}` : ""}`
  );

  if (parsed && typeof parsed === "object") {
    return { ...currentConfig, ...parsed };
  }

  return currentConfig ?? {};
}

export async function suggestImageAltText(
  productName: string,
  imageIndex?: number,
  context?: string
): Promise<string> {
  const parsed = await openAiChatJson<{ alt: string }>(
    `Write SEO image alt text for e-commerce. Return JSON: { alt: string }. Max 125 chars. Describe product visually, include product name, no "image of".`,
    `Product: ${productName}${imageIndex != null ? `\nImage #${imageIndex + 1}` : ""}${context ? `\nContext: ${context}` : ""}`
  );

  if (parsed?.alt?.trim()) {
    return String(parsed.alt).slice(0, 125);
  }

  const suffix =
    imageIndex != null && imageIndex > 0 ? ` — view ${imageIndex + 1}` : "";
  return `${productName.trim()}${suffix}`.slice(0, 125);
}
