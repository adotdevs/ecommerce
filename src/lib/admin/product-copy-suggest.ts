import { openAiChatJson } from "@/lib/ai/openai-client";

export interface ProductCopyInput {
  name: string;
  sku?: string;
  categories?: string[];
  brand?: string;
}

const TITLE_LOWER_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "with",
  "in",
  "on",
  "to",
  "of",
  "by",
]);

/** Title-case product names for storefront display. */
export function formatProductTitle(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((word, i) => {
      if (!word) return word;
      const lower = word.toLowerCase();
      if (i > 0 && TITLE_LOWER_WORDS.has(lower)) return lower;
      if (/^\d/.test(word) || word.includes("GB") || word.includes("TB")) {
        return word.toUpperCase() === word ? word : word;
      }
      if (word === word.toUpperCase() && word.length <= 4) return word;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export interface ProductCopySuggestion {
  shortDescription: string;
  description: string;
  tags: string[];
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
}

function templateSuggest(input: ProductCopyInput): ProductCopySuggestion {
  const name = input.name.trim();
  const categoryHint = input.categories?.length
    ? ` Perfect for ${input.categories.slice(0, 2).join(" and ")}.`
    : "";
  const brandHint = input.brand ? ` From ${input.brand}.` : "";

  const shortDescription = `Premium ${name.toLowerCase()} designed for everyday use.${brandHint}${categoryHint}`.slice(
    0,
    160
  );

  const description = [
    `Introducing ${name} — a thoughtfully designed product built to deliver quality, comfort, and lasting value.`,
    "",
    "Key highlights:",
    `• Premium build and reliable performance`,
    `• Designed for real-world everyday use`,
    `• Backed by our customer satisfaction guarantee`,
    brandHint ? `• ${input.brand} quality you can trust` : null,
    categoryHint ? `• Ideal for ${input.categories!.slice(0, 3).join(", ")}` : null,
    "",
    "Order today and experience the difference.",
  ]
    .filter(Boolean)
    .join("\n");

  const words = name
    .toLowerCase()
    .split(/[\s\-_/]+/)
    .filter((w) => w.length > 2);

  const tags = [
    ...new Set([
      ...words.slice(0, 4),
      ...(input.categories ?? []).map((c) => c.toLowerCase()),
      input.brand?.toLowerCase(),
    ].filter(Boolean) as string[]),
  ].slice(0, 8);

  return {
    shortDescription,
    description,
    tags,
    seo: {
      title: `${name} | Buy Online`,
      description: shortDescription,
      keywords: tags,
    },
  };
}

async function openAiSuggest(
  input: ProductCopyInput
): Promise<ProductCopySuggestion | null> {
  const context = [
    input.brand ? `Brand: ${input.brand}` : null,
    input.sku ? `SKU: ${input.sku}` : null,
    input.categories?.length
      ? `Categories: ${input.categories.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const parsed = await openAiChatJson<
    Partial<ProductCopySuggestion> & {
      seo?: Partial<ProductCopySuggestion["seo"]> & { keywords?: string[] };
    }
  >(
    "You write concise e-commerce product copy. Return JSON with keys: shortDescription (max 160 chars), description (3-5 paragraphs with bullet highlights), tags (array of 5-8 strings), seo (object with title, description, keywords array). No markdown.",
    `Product name: ${input.name}\n${context}`
  );

  if (!parsed?.shortDescription || !parsed.description) return null;

  return {
    shortDescription: String(parsed.shortDescription).slice(0, 200),
    description: String(parsed.description),
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.map(String).slice(0, 10)
      : [],
    seo: {
      title: String(parsed.seo?.title ?? `${input.name} | Buy Online`),
      description: String(
        parsed.seo?.description ?? parsed.shortDescription
      ).slice(0, 200),
      keywords: Array.isArray(parsed.seo?.keywords)
        ? parsed.seo!.keywords!.map(String)
        : [],
    },
  };
}

export async function suggestProductCopy(
  input: ProductCopyInput
): Promise<ProductCopySuggestion> {
  try {
    const ai = await openAiSuggest(input);
    if (ai) return ai;
  } catch {
    /* fall through */
  }
  return templateSuggest(input);
}

export function nameToSku(name: string): string {
  const sku = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return sku || "SKU";
}

/** Unique catalog SKU — not derived from product title. */
export function generateUniqueSku(prefix = "PRD"): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${ts}${rand}`.slice(0, 24);
}
