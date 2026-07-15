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
  sanitizeAiDashes,
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

/** Products that are almost never sold with color swatches. */
const NO_COLOR_RE =
  /vitamin|supplement|softgel|capsule|tablet|pill|gummy| probiot|omega[\s-]?3|collagen|protein\s*powder|whey|creatine|multivitamin|medicine|pharma|grocery|snack|food|beverage|drink|tea|coffee|oil\b|serum|lotion|cream\b|shampoo|conditioner|soap|detergent|cleaner|book|ebook|magazine|software|license|subscription|gift\s*card|ticket|service|consult/i;

/** Products that commonly offer color / finish choices. */
const COLOR_LIKELY_RE =
  /shoe|sneaker|boot|sandal|footwear|trainer|shirt|dress|jacket|hoodie|pants|jeans|apparel|clothing|top|blouse|sweater|coat|sock|hat|cap|bag|wallet|belt|backpack|watch|phone|iphone|ipad|tablet|laptop|macbook|galaxy|pixel|case|cover|earbuds|headphone|speaker|furniture|sofa|chair|lamp|mug|bottle|tumbler|backpack/i;

const FOOTWEAR_RE = /shoe|sneaker|boot|sandal|footwear|trainer/i;
const APPAREL_RE =
  /shirt|dress|jacket|hoodie|pants|jeans|apparel|clothing|top|blouse|sweater|coat|tee|t-shirt/i;
const ELECTRONICS_CAPACITY_RE =
  /phone|laptop|tablet|ssd|storage|usb|drive|iphone|ipad|macbook|galaxy|pixel|earbuds|headphone/i;
const BAG_LEATHER_RE = /bag|wallet|belt|leather|backpack|purse/i;
const FLAVOR_PACK_RE =
  /vitamin|supplement|softgel|capsule|protein|whey|snack|tea|coffee|gummy/i;

function productHaystack(name: string, categories?: string[]) {
  return `${name} ${(categories ?? []).join(" ")}`.trim();
}

/**
 * Infer option groups only when this product type typically has shopper choices.
 * Default is NO options (single SKU) — never force Color onto unrelated products.
 */
export function inferOptionsFromName(
  name: string,
  categories?: string[]
): VariantOptionGroup[] {
  const haystack = productHaystack(name, categories);
  if (!haystack.trim()) return [];

  // Consumables / digital / services: usually pack size or flavor, not color.
  if (NO_COLOR_RE.test(haystack)) {
    if (FLAVOR_PACK_RE.test(haystack)) {
      // Prefer a simple custom "Pack size" style option over fake colors.
      return [
        {
          id: `opt-pack-${Date.now().toString(36)}`,
          name: "Pack size",
          type: "custom",
          values: [
            { value: "1-pack", label: "1 Pack" },
            { value: "2-pack", label: "2 Pack" },
            { value: "3-pack", label: "3 Pack" },
          ],
        },
      ];
    }
    return [];
  }

  if (FOOTWEAR_RE.test(haystack)) {
    return [newOptionGroup("color"), newOptionGroup("shoe_size")];
  }
  if (APPAREL_RE.test(haystack)) {
    return [newOptionGroup("color"), newOptionGroup("apparel_size")];
  }
  if (ELECTRONICS_CAPACITY_RE.test(haystack)) {
    return [newOptionGroup("color"), newOptionGroup("capacity")];
  }
  if (BAG_LEATHER_RE.test(haystack)) {
    return [newOptionGroup("color"), newOptionGroup("material")];
  }

  // Only add standalone color when the product type clearly sells finishes.
  if (COLOR_LIKELY_RE.test(haystack)) {
    return [newOptionGroup("color")];
  }

  return [];
}

/** Drop options that do not make sense for this product (e.g. Color on vitamins). */
export function filterRelevantOptionGroups(
  groups: VariantOptionGroup[],
  name: string,
  categories?: string[]
): VariantOptionGroup[] {
  const haystack = productHaystack(name, categories);
  if (!groups.length) return [];

  return groups.filter((g) => {
    const isColor =
      g.type === "color" || /^(color|colour)$/i.test(g.name.trim());

    if (isColor && NO_COLOR_RE.test(haystack)) return false;

    if (
      g.type === "shoe_size" &&
      !FOOTWEAR_RE.test(haystack) &&
      !/shoe|size/i.test(haystack)
    ) {
      return false;
    }

    if (
      g.type === "apparel_size" &&
      !APPAREL_RE.test(haystack) &&
      !/cloth|apparel|shirt|dress|size/i.test(haystack)
    ) {
      return false;
    }

    if (
      g.type === "capacity" &&
      !ELECTRONICS_CAPACITY_RE.test(haystack) &&
      !/gb|tb|storage|memory|capacity/i.test(haystack)
    ) {
      return false;
    }

    return true;
  });
}

function templateFullSuggest(
  input: ProductCopyInput,
  sku: string
): FullProductSuggestion {
  const name = formatProductTitle(input.name.trim());
  const variantOptions = inferOptionsFromName(name, input.categories);
  const basePrice = 49.99;
  const compareAt = 69.99;

  const variants = generateVariantsFromOptions(
    variantOptions,
    { sku, price: basePrice, compareAtPrice: compareAt, stock: 25 },
    [],
    true
  );

  const specs: ProductSpecification[] = [
    { section: "Additional details", key: "Brand", value: input.brand ?? "Store brand" },
    { section: "Additional details", key: "Condition", value: "New" },
  ];
  if (variantOptions.some((g) => g.type === "color")) {
    specs.push({
      section: "Additional details",
      key: "Color",
      value: "Multiple options",
    });
  }

  return {
    name,
    shortDescription: `Premium ${name}, engineered for performance, backed by our store guarantee.`,
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
    specifications: specs,
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
    `You are an expert e-commerce catalog manager. Return complete product JSON:
{
  "name": string, full retail title with brand/model/key specs. Proper Title Case.
  "shortDescription": string (max 200 chars),
  "description": string (4-6 paragraphs + bullets),
  "highlights": string[] (5-8),
  "tags": string[],
  "seo": { "title", "description", "keywords": string[] },
  "pricing": { "price": number (USD), "compareAtPrice": number, "currency": "USD" },
  "variantOptions": [] OR option groups shoppers actually choose for THIS product,
  "variantPrices": [{ "attributes": { optionKey: value }, "price", "compareAtPrice", "stock" }],
  "specifications": [{ "section", "key", "value" }], MINIMUM 12 category-appropriate specs (${SPEC_SECTIONS.join(", ")}),
  "faqs": [{ "question", "answer" }], 6-8,
  "warranty": string,
  "weight": number (kg)
}
CRITICAL variantRules — think carefully before adding any option:
- Ask: "Would a shopper pick this option for THIS exact product?" If unsure, use "variantOptions": [].
- Empty variantOptions is correct for many products (single SKU): vitamins, supplements, softgels, food, groceries, books, software, services, one-size accessories.
- NEVER invent Color / colour swatches for vitamins, supplements, medicine, food, drinks, or similar consumables.
- Only add Color when the product is truly sold in different colors or finishes (apparel, shoes, phones, bags, cases, furniture).
- Footwear: color + shoe_size. Apparel: color + apparel_size. Phones/storage devices: color + capacity when realistic.
- Supplements/vitamins: if variants exist, prefer Pack size, Count, or Flavor — never fake color chips.
- Each color (only when used) MUST have a distinct accurate hex.
- Never use em dashes or en dashes. Use commas, periods, or hyphens.
- variantPrices only when variantOptions is non-empty.`,
    `Product seed name: ${input.name}\n${context}\nBase SKU: ${sku}\nDecide options only from what this product type truly needs.`,
    { temperature: 0.4, maxTokens: 3500 }
  );

  if (!parsed?.shortDescription || !parsed.description) return null;

  const mapped = mapAiOptions(parsed.variantOptions);
  const inferred = inferOptionsFromName(
    parsed.name?.trim() || input.name,
    input.categories
  );
  // Prefer AI options when present; otherwise smart inference (often empty).
  // Never force Color when neither AI nor inference wants it.
  const variantOptions = sanitizeOptionGroups(
    filterRelevantOptionGroups(
      mapped.length ? mapped : inferred,
      parsed.name?.trim() || input.name,
      input.categories
    )
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

  const aiName = sanitizeAiDashes(
    parsed.name?.trim()
      ? formatProductTitle(parsed.name.trim())
      : formatProductTitle(input.name.trim())
  );

  const highlights = Array.isArray(parsed.highlights)
    ? parsed.highlights.map((h) => sanitizeAiDashes(String(h))).filter(Boolean).slice(0, 10)
    : [];

  let description = sanitizeAiDashes(String(parsed.description));
  if (highlights.length && !description.includes("•") && !description.includes("- ")) {
    description += `\n\nKey features:\n${highlights.map((h) => `• ${h}`).join("\n")}`;
  }

  const specs = mapSpecifications(parsed.specifications);
  const hasColorOption = variantOptions.some(
    (g) => g.type === "color" || /^(color|colour)$/i.test(g.name)
  );
  const cleanedSpecs = hasColorOption
    ? specs
    : specs.filter((s) => !/^(color|colour)$/i.test(s.key.trim()));

  const finalSpecs =
    cleanedSpecs.length >= 8
      ? cleanedSpecs
      : [
          ...cleanedSpecs,
          { section: "Additional details", key: "Brand", value: input.brand ?? "Official" },
          { section: "Additional details", key: "Model", value: aiName.split(",")[0]?.trim() ?? aiName },
          { section: "Additional details", key: "Condition", value: "New" },
        ];

  return {
    name: aiName,
    shortDescription: sanitizeAiDashes(String(parsed.shortDescription)).slice(0, 220),
    description,
    highlights,
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 10) : [],
    seo: {
      title: sanitizeAiDashes(String(parsed.seo?.title ?? `${aiName} | Buy Online`)),
      description: sanitizeAiDashes(
        String(parsed.seo?.description ?? parsed.shortDescription)
      ).slice(0, 200),
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
