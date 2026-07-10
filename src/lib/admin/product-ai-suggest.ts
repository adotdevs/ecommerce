import { openAiChatJson } from "@/lib/ai/openai-client";
import {
  type VariantOptionGroup,
  type VariantOptionType,
  VARIANT_OPTION_PRESETS,
  newOptionGroup,
  generateVariantsFromOptions,
  sanitizeOptionGroups,
} from "@/lib/catalog/variant-options";
import { resolveColorHex } from "@/lib/catalog/color-hex";
import {
  generateUniqueSku,
  formatProductTitle,
  type ProductCopyInput,
} from "@/lib/admin/product-copy-suggest";

export interface ProductSpecification {
  section?: string;
  key: string;
  value: string;
}

export interface FullProductSuggestion {
  name: string;
  shortDescription: string;
  description: string;
  highlights: string[];
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
  specifications: ProductSpecification[];
  faqs: { question: string; answer: string }[];
  warranty?: string;
  weight?: number;
}

interface AiFullResponse {
  name?: string;
  shortDescription?: string;
  description?: string;
  highlights?: string[];
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
  specifications?: { section?: string; key: string; value: string }[];
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

const SPEC_SECTIONS = [
  "Additional details",
  "Camera",
  "Battery",
  "Display",
  "Connectivity",
  "Navigation",
  "Dimensions",
  "Materials",
];

function inferOptionsFromName(name: string): VariantOptionGroup[] {
  const lower = name.toLowerCase();
  if (/shoe|sneaker|boot|sandal|footwear|trainer/i.test(lower)) {
    return [newOptionGroup("color"), newOptionGroup("shoe_size")];
  }
  if (/shirt|dress|jacket|hoodie|pants|jeans|apparel|clothing|top|blouse/i.test(lower)) {
    return [newOptionGroup("color"), newOptionGroup("apparel_size")];
  }
  if (/phone|laptop|tablet|ssd|storage|usb|drive|iphone|ipad|macbook|galaxy|pixel/i.test(lower)) {
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
  const name = formatProductTitle(input.name.trim());
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
    name,
    shortDescription: `Premium ${name} — engineered for performance, backed by our store guarantee.`,
    description: `Discover the ${name}.\n\nBuilt for everyday excellence with reliable performance and thoughtful design. Customers choose this product for its quality, value, and dependable support.\n\n• Premium build quality\n• Fast, free shipping on eligible orders\n• Easy returns within 30 days`,
    highlights: [
      "Premium build quality",
      "Reliable everyday performance",
      "Backed by manufacturer warranty",
    ],
    tags: name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 5),
    seo: {
      title: `${name} | Buy Online`,
      description: `Shop ${name} with fast shipping and easy returns.`,
      keywords: [name.split(" ")[0]?.toLowerCase(), "shop", "buy"].filter(Boolean) as string[],
    },
    pricing: { price: basePrice, compareAtPrice: compareAt, currency: "USD" },
    variantOptions,
    variants,
    specifications: [
      { section: "Additional details", key: "Brand", value: input.brand ?? "Store brand" },
      { section: "Additional details", key: "Condition", value: "New" },
      { section: "Additional details", key: "Color", value: "Multiple options" },
    ],
    faqs: [
      {
        question: "What is included in the box?",
        answer: "You receive the product as described with standard packaging and accessories.",
      },
      {
        question: "What is the return policy?",
        answer: "30-day hassle-free returns on unused items in original packaging.",
      },
    ],
    warranty: "1-year limited manufacturer warranty",
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
      const isColor =
        type === "color" || /color|colour/i.test(g.name ?? "");
      const resolvedType: VariantOptionType = isColor ? "color" : type;
      const preset = VARIANT_OPTION_PRESETS[resolvedType];
      const values = (g.values ?? [])
        .filter((v) => v.value?.trim() && v.label?.trim())
        .map((v) => ({
          value: v.value.trim().toLowerCase().replace(/\s+/g, "-"),
          label: v.label.trim(),
          hex:
            resolvedType === "color"
              ? resolveColorHex(v.label.trim(), v.hex)
              : undefined,
        }));

      if (!values.length && preset.values.length) {
        return {
          id: `opt-ai-${i}`,
          name: resolvedType === "color" ? "Color" : g.name?.trim() || preset.label,
          type: resolvedType,
          values: preset.values.slice(0, 6).map((v) => ({
            ...v,
            hex:
              resolvedType === "color"
                ? resolveColorHex(v.label, v.hex)
                : undefined,
          })),
        };
      }

      return {
        id: `opt-ai-${i}`,
        name: resolvedType === "color" ? "Color" : g.name?.trim() || preset.label,
        type: resolvedType,
        values,
      };
    })
    .filter((g) => g.values.length > 0);
}

function mapSpecifications(
  raw: AiFullResponse["specifications"]
): ProductSpecification[] {
  return (raw ?? [])
    .filter((s) => s.key && s.value)
    .map((s) => ({
      section: s.section?.trim() || "Additional details",
      key: String(s.key).trim(),
      value: String(s.value).trim(),
    }));
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
    `You are an expert e-commerce catalog manager (Amazon-style listings). Return complete product JSON:
{
  "name": string — full retail product title with brand, model, key specs (e.g. "Apple iPhone 12 Pro Max — 256GB, Deep Blue, Unlocked"). Proper Title Case. Be specific and detailed.
  "shortDescription": string (max 200 chars, compelling),
  "description": string (4-6 paragraphs + bullet highlights, rich and authentic),
  "highlights": string[] (5-8 key feature bullets),
  "tags": string[],
  "seo": { "title", "description", "keywords": string[] },
  "pricing": { "price": number (realistic USD), "compareAtPrice": number, "currency": "USD" },
  "variantOptions": [{ "type": "color"|"shoe_size"|"apparel_size"|"size"|"material"|"style"|"capacity"|"custom", "name": "Color" for colors, "values": [{ "value", "label", "hex": "#RRGGBB" unique per color }] }],
  "variantPrices": [{ "attributes": { optionKey: value }, "price", "compareAtPrice", "stock" }],
  "specifications": [{ "section": string, "key": string, "value": string }] — MINIMUM 18 specs across sections like: ${SPEC_SECTIONS.join(", ")}. Use realistic technical values for this exact product.
  "faqs": [{ "question", "answer" }] — 6-8 helpful customer FAQs,
  "warranty": string,
  "weight": number (kg)
}
Rules:
- name must be a complete, professional product title — not just the input keyword.
- Each color MUST have a distinct accurate hex (never all white).
- Phones/electronics: color + capacity with realistic specs (OS, RAM, camera MP, battery mAh, etc.).
- Shoes: color + shoe_size. Clothing: color + apparel_size.
- variantPrices cover combinations; premium variants cost more.
- specifications must be category-appropriate and detailed like Amazon product information.`,
    `Product seed name: ${input.name}\n${context}\nBase SKU: ${sku}`,
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
      parsed.variantPrices.map((vp) => [JSON.stringify(vp.attributes), vp])
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

  const aiName = parsed.name?.trim()
    ? formatProductTitle(parsed.name.trim())
    : formatProductTitle(input.name.trim());

  const highlights = Array.isArray(parsed.highlights)
    ? parsed.highlights.map(String).filter(Boolean).slice(0, 10)
    : [];

  let description = String(parsed.description);
  if (highlights.length && !description.includes("•") && !description.includes("- ")) {
    description += `\n\nKey features:\n${highlights.map((h) => `• ${h}`).join("\n")}`;
  }

  const specs = mapSpecifications(parsed.specifications);
  const finalSpecs =
    specs.length >= 8
      ? specs
      : [
          ...specs,
          { section: "Additional details", key: "Brand", value: input.brand ?? "Official" },
          { section: "Additional details", key: "Model", value: aiName.split("—")[0]?.trim() ?? aiName },
          { section: "Additional details", key: "Condition", value: "New" },
        ];

  return {
    name: aiName,
    shortDescription: String(parsed.shortDescription).slice(0, 220),
    description,
    highlights,
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 10) : [],
    seo: {
      title: String(parsed.seo?.title ?? `${aiName} | Buy Online`),
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
    specifications: finalSpecs,
    faqs: (parsed.faqs ?? [])
      .filter((f) => f.question && f.answer)
      .map((f) => ({ question: String(f.question), answer: String(f.answer) }))
      .slice(0, 10),
    warranty: parsed.warranty ? String(parsed.warranty) : undefined,
    weight: parsed.weight != null ? Number(parsed.weight) : undefined,
  };
}

export async function suggestFullProduct(
  input: ProductCopyInput
): Promise<FullProductSuggestion> {
  const sku = input.sku?.trim() || generateUniqueSku();

  const ai = await openAiFullSuggest(input, sku);
  if (ai) return ai;

  return templateFullSuggest(input, sku);
}
