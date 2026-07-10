import { openAiChatJson } from "@/lib/ai/openai-client";
import {
  type VariantOptionGroup,
  type VariantOptionType,
  VARIANT_OPTION_PRESETS,
  newOptionGroup,
  generateVariantsFromOptions,
  sanitizeOptionGroups,
} from "@/lib/catalog/variant-options";
import { nameToSku, type ProductCopyInput } from "@/lib/admin/product-copy-suggest";

export interface FullProductSuggestion {
  shortDescription: string;
  description: string;
  tags: string[];
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  pricing: {
    price: number;
    compareAtPrice?: number;
    currency: string;
  };
  variantOptions: VariantOptionGroup[];
  variants: {
    id: string;
    name: string;
    sku: string;
    price: number;
    compareAtPrice?: number;
    stock: number;
    attributes: Record<string, string>;
  }[];
  specifications: { key: string; value: string }[];
  faqs: { question: string; answer: string }[];
  warranty?: string;
  weight?: number;
}

interface AiFullResponse {
  shortDescription?: string;
  description?: string;
  tags?: string[];
  seo?: { title?: string; description?: string; keywords?: string[] };
  pricing?: { price?: number; compareAtPrice?: number; currency?: string };
  variantOptions?: {
    type: string;
    name: string;
    values: { value: string; label: string; hex?: string }[];
  }[];
  variantPrices?: {
    attributes: Record<string, string>;
    price: number;
    compareAtPrice?: number;
    stock?: number;
  }[];
  specifications?: { key: string; value: string }[];
  faqs?: { question: string; answer: string }[];
  warranty?: string;
  weight?: number;
}

const VALID_TYPES = new Set<string>([
  "color",
  "size",
  "shoe_size",
  "apparel_size",
  "material",
  "style",
  "capacity",
  "custom",
]);

function inferOptionsFromName(name: string): VariantOptionGroup[] {
  const lower = name.toLowerCase();
  if (/shoe|sneaker|boot|sandal|footwear|trainer/i.test(lower)) {
    return [newOptionGroup("color"), newOptionGroup("shoe_size")];
  }
  if (/shirt|dress|jacket|hoodie|pants|jeans|apparel|clothing|top|blouse/i.test(lower)) {
    return [newOptionGroup("color"), newOptionGroup("apparel_size")];
  }
  if (/phone|laptop|tablet|ssd|storage|usb|drive/i.test(lower)) {
    return [newOptionGroup("color"), newOptionGroup("capacity")];
  }
  if (/bag|wallet|belt|leather/i.test(lower)) {
    return [newOptionGroup("color"), newOptionGroup("material")];
  }
  return [newOptionGroup("color")];
}

function templateFullSuggest(
  input: ProductCopyInput,
  sku: string
): FullProductSuggestion {
  const name = input.name.trim();
  const variantOptions = inferOptionsFromName(name);
  const basePrice = 49.99;
  const compareAt = 69.99;

  const variants = generateVariantsFromOptions(
    variantOptions,
    { sku, price: basePrice, compareAtPrice: compareAt, stock: 25 },
    [],
    true
  );

  return {
    shortDescription: `Premium ${name.toLowerCase()} — quality you can trust.`,
    description: `Discover ${name}. Built for everyday use with reliable performance and great value.`,
    tags: name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 5),
    seo: {
      title: `${name} | Shop Now`,
      description: `Buy ${name} online with fast shipping.`,
      keywords: [name.split(" ")[0]?.toLowerCase(), "shop", "buy"].filter(Boolean) as string[],
    },
    pricing: { price: basePrice, compareAtPrice: compareAt, currency: "USD" },
    variantOptions,
    variants,
    specifications: [
      { key: "Brand", value: input.brand ?? "Store brand" },
      { key: "Condition", value: "New" },
    ],
    faqs: [
      {
        question: "What is included?",
        answer: "You receive the product as described with standard packaging.",
      },
    ],
    warranty: "1-year limited warranty",
    weight: 0.5,
  };
}

function mapAiOptions(
  raw: AiFullResponse["variantOptions"]
): VariantOptionGroup[] {
  if (!raw?.length) return [];

  return raw
    .map((g, i) => {
      const type = VALID_TYPES.has(g.type) ? (g.type as VariantOptionType) : "custom";
      const preset = VARIANT_OPTION_PRESETS[type];
      const values = (g.values ?? [])
        .filter((v) => v.value?.trim() && v.label?.trim())
        .map((v) => ({
          value: v.value.trim().toLowerCase().replace(/\s+/g, "-"),
          label: v.label.trim(),
          hex: v.hex ?? (type === "color" ? "#888888" : undefined),
        }));

      if (!values.length && preset.values.length) {
        return {
          id: `opt-ai-${i}`,
          name: g.name?.trim() || preset.label,
          type,
          values: preset.values.slice(0, 6).map((v) => ({ ...v })),
        };
      }

      return {
        id: `opt-ai-${i}`,
        name: g.name?.trim() || preset.label,
        type,
        values,
      };
    })
    .filter((g) => g.values.length > 0);
}

async function openAiFullSuggest(
  input: ProductCopyInput,
  sku: string
): Promise<FullProductSuggestion | null> {
  const context = [
    input.brand ? `Brand: ${input.brand}` : null,
    input.sku ? `SKU: ${input.sku}` : null,
    input.categories?.length ? `Categories: ${input.categories.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const parsed = await openAiChatJson<AiFullResponse>(
    `You are an expert e-commerce catalog manager. Given a product name, return complete product data as JSON:
{
  "shortDescription": string (max 160 chars),
  "description": string (2-4 paragraphs, bullet highlights),
  "tags": string[],
  "seo": { "title", "description", "keywords": string[] },
  "pricing": { "price": number (realistic USD), "compareAtPrice": number (optional sale), "currency": "USD" },
  "variantOptions": [{ "type": "color"|"shoe_size"|"apparel_size"|"size"|"material"|"style"|"capacity"|"custom", "name": string, "values": [{ "value", "label", "hex" (for colors) }] }],
  "variantPrices": [{ "attributes": { optionKey: value }, "price": number, "compareAtPrice": number, "stock": number }],
  "specifications": [{ "key", "value" }],
  "faqs": [{ "question", "answer" }],
  "warranty": string,
  "weight": number (kg)
}
Rules:
- Shoes: color + shoe_size (US 7-12). Clothing: color + apparel_size. Electronics: color + capacity.
- variantPrices must cover all meaningful combinations with realistic price differences (premium colors/sizes cost more).
- Use 3-6 colors for fashion, 4-8 sizes where relevant.
- Prices must be realistic for the product category.`,
    `Product: ${input.name}\n${context}\nBase SKU: ${sku}`,
    { temperature: 0.65 }
  );

  if (!parsed?.shortDescription || !parsed.description) return null;

  const variantOptions = sanitizeOptionGroups(
    mapAiOptions(parsed.variantOptions).length
      ? mapAiOptions(parsed.variantOptions)
      : inferOptionsFromName(input.name)
  );

  const basePrice = Number(parsed.pricing?.price) || 49.99;
  const compareAt = parsed.pricing?.compareAtPrice
    ? Number(parsed.pricing.compareAtPrice)
    : undefined;

  let variants = generateVariantsFromOptions(
    variantOptions,
    { sku, price: basePrice, compareAtPrice: compareAt, stock: 20 },
    [],
    true
  );

  if (parsed.variantPrices?.length) {
    const priceMap = new Map(
      parsed.variantPrices.map((vp) => [
        JSON.stringify(vp.attributes),
        vp,
      ])
    );
    variants = variants.map((v) => {
      const vp = priceMap.get(JSON.stringify(v.attributes));
      if (!vp) return v;
      return {
        ...v,
        price: Number(vp.price) || v.price,
        compareAtPrice: vp.compareAtPrice ? Number(vp.compareAtPrice) : v.compareAtPrice,
        stock: vp.stock != null ? Number(vp.stock) : v.stock,
      };
    });
  }

  return {
    shortDescription: String(parsed.shortDescription).slice(0, 200),
    description: String(parsed.description),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 10) : [],
    seo: {
      title: String(parsed.seo?.title ?? `${input.name} | Buy Online`),
      description: String(parsed.seo?.description ?? parsed.shortDescription).slice(0, 200),
      keywords: Array.isArray(parsed.seo?.keywords)
        ? parsed.seo.keywords.map(String)
        : [],
    },
    pricing: {
      price: basePrice,
      compareAtPrice: compareAt,
      currency: parsed.pricing?.currency ?? "USD",
    },
    variantOptions,
    variants,
    specifications: (parsed.specifications ?? [])
      .filter((s) => s.key && s.value)
      .map((s) => ({ key: String(s.key), value: String(s.value) })),
    faqs: (parsed.faqs ?? [])
      .filter((f) => f.question && f.answer)
      .map((f) => ({ question: String(f.question), answer: String(f.answer) })),
    warranty: parsed.warranty ? String(parsed.warranty) : undefined,
    weight: parsed.weight != null ? Number(parsed.weight) : undefined,
  };
}

export async function suggestFullProduct(
  input: ProductCopyInput
): Promise<FullProductSuggestion> {
  const sku = input.sku?.trim() || nameToSku(input.name);

  const ai = await openAiFullSuggest(input, sku);
  if (ai) return ai;

  return templateFullSuggest(input, sku);
}
