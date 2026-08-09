import { openAiChatJson } from "@/lib/ai/openai-client";
import {
  type VariantOptionGroup,
  type VariantOptionType,
  VARIANT_OPTION_PRESETS,
  newOptionGroup,
  generateVariantsFromOptions,
  sanitizeOptionGroups,
  applySmartVariantPrices,
  defaultAttributeKey,
  optionKey,
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
          attributeKey: "pack_size",
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

/** Realistic USD anchor when AI returns generic pricing. */
function estimateBasePriceFromName(name: string, categories?: string[]): number {
  const hay = `${name} ${(categories ?? []).join(" ")}`.toLowerCase();

  if (/iphone|galaxy s|pixel pro|flagship phone/i.test(hay)) return 899.99;
  if (/phone|smartphone|galaxy|pixel/i.test(hay)) return 499.99;
  if (/macbook|laptop|notebook/i.test(hay)) return 999.99;
  if (/ipad|tablet/i.test(hay)) return 449.99;
  if (/watch|airpods|earbuds|headphone|speaker/i.test(hay)) return 149.99;
  if (/monitor|tv|television/i.test(hay)) return 349.99;
  if (/shoe|sneaker|boot|footwear/i.test(hay)) return 89.99;
  if (/jacket|coat|hoodie/i.test(hay)) return 79.99;
  if (/shirt|dress|apparel|clothing/i.test(hay)) return 39.99;
  if (/vitamin|supplement|softgel|capsule|gummy|probiotic|omega/i.test(hay))
    return 24.99;
  if (/protein|whey|collagen/i.test(hay)) return 34.99;
  if (/furniture|sofa|chair/i.test(hay)) return 299.99;
  if (/bag|backpack|wallet/i.test(hay)) return 59.99;

  return 39.99;
}

function normalizeCompareAt(price: number, compareAt?: number): number | undefined {
  if (compareAt != null && compareAt > price) {
    return Math.round(compareAt * 100) / 100;
  }
  return Math.round(price * 1.33 * 100) / 100;
}

/** Map AI variantPrices attributes to the keys/values used by generated variants. */
function normalizeVariantPriceAttributes(
  raw: Record<string, string>,
  groups: VariantOptionGroup[]
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [rawKey, rawVal] of Object.entries(raw)) {
    const keyLower = rawKey.toLowerCase().trim();
    const valStr = String(rawVal).trim();
    const valLower = valStr.toLowerCase();

    const group = groups.find((g) => {
      const attrKey = defaultAttributeKey(g);
      return (
        attrKey === keyLower ||
        optionKey(g.name) === keyLower.replace(/\s+/g, "_") ||
        g.name.toLowerCase() === keyLower
      );
    });

    if (!group) {
      normalized[rawKey] = valLower.replace(/\s+/g, "-");
      continue;
    }

    const attrKey = defaultAttributeKey(group);
    const match = group.values.find(
      (v) =>
        v.value === valLower ||
        v.value === valStr.toLowerCase().replace(/\s+/g, "-") ||
        v.label.toLowerCase() === valLower
    );
    normalized[attrKey] = match?.value ?? valLower.replace(/\s+/g, "-");
  }

  return normalized;
}

function applyAiVariantPrices(
  variants: FullProductSuggestion["variants"],
  variantPrices: AiFullResponse["variantPrices"],
  groups: VariantOptionGroup[]
) {
  if (!variantPrices?.length) return variants;

  const priceMap = new Map(
    variantPrices.map((vp) => [
      JSON.stringify(normalizeVariantPriceAttributes(vp.attributes ?? {}, groups)),
      vp,
    ])
  );

  return variants.map((v) => {
    const vp = priceMap.get(JSON.stringify(v.attributes));
    if (!vp) return v;
    return {
      ...v,
      price: Number(vp.price) || v.price,
      compareAtPrice: vp.compareAtPrice
        ? Number(vp.compareAtPrice)
        : v.compareAtPrice,
      stock: vp.stock != null ? Number(vp.stock) : v.stock,
    };
  });
}

function enforceDistinctVariantPrices(
  variants: FullProductSuggestion["variants"],
  basePrice: number,
  compareAt: number | undefined,
  groups: VariantOptionGroup[]
) {
  if (variants.length <= 1 || !groups.length) return variants;

  const distinct = new Set(variants.map((v) => v.price));
  if (distinct.size > 1) return variants;

  return applySmartVariantPrices(variants, basePrice, compareAt, groups);
}

function buildProductAiSystemPrompt(): string {
  return `You are a senior Amazon/e-commerce catalog manager. Return one JSON object with accurate, sellable product data.

Schema:
{
  "name": string — full retail title, Title Case, brand + model + key specs,
  "shortDescription": string — max 180 chars, compelling,
  "description": string — 4-6 short paragraphs plus bullet highlights,
  "highlights": string[] — 6-8 specific benefits,
  "tags": string[] — 6-10 search keywords,
  "seo": { "title", "description", "keywords": string[] },
  "pricing": { "price": number, "compareAtPrice": number, "currency": "USD" },
  "variantOptions": [] OR [{ "type", "name", "values": [{ "value", "label", "hex?" }] }],
  "variantPrices": [{ "attributes": { key: value }, "price", "compareAtPrice", "stock" }],
  "specifications": [{ "section", "key", "value" }] — MINIMUM 12 real specs,
  "faqs": [{ "question", "answer" }] — 6-8 helpful Q&As,
  "warranty": string,
  "weight": number (kg)
}

VARIANT RULES (critical):
- Ask: "Would a shopper choose this before buying?" If no → "variantOptions": [].
- NEVER add Color for vitamins, supplements, softgels, food, drinks, medicine, books, software.
- Supplements/vitamins: use Pack size (1/2/3 Pack) OR Count (30/60/120 count) — never fake colors.
- Apparel: color + apparel_size. Footwear: color + shoe_size. Phones/laptops: color + capacity when realistic.
- Color hex must be accurate when color is used.

PRICING RULES (critical):
- Use realistic US retail prices for this exact product category.
- pricing.price = price of the SMALLEST/cheapest variant (1-pack or lowest count).
- compareAtPrice = MSRP, typically 20-40% above price.
- When variantOptions is non-empty, variantPrices is REQUIRED with one entry per variant combo.
- Each variant MUST have a DIFFERENT price:
  • Pack size: 1-pack = base, 2-pack ≈ base×1.85, 3-pack ≈ base×2.65 (bundle discount).
  • Count: scale sub-linearly (120ct cheaper per unit than 60ct).
  • Color/material/capacity: small realistic deltas.
- variantPrices attributes keys MUST match option keys: pack_size, count, flavor, color, capacity, shoe_size, apparel_size.
- variantPrices attribute values MUST match option values exactly (e.g. "1-pack" not "1 Pack").

COPY RULES:
- Be specific to the product — no generic filler.
- Never use em dashes or en dashes. Use commas, periods, or hyphens.
- Specifications must be factual for the product category (${SPEC_SECTIONS.join(", ")}).`;
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

  const priceAnchor = estimateBasePriceFromName(input.name, input.categories);

  const parsed = await openAiChatJson<AiFullResponse>(
    buildProductAiSystemPrompt(),
    `Product seed: ${input.name}
${context}
Base SKU: ${sku}
Price anchor (USD, adjust to market): ~$${priceAnchor} for smallest variant.
Generate complete catalog-ready JSON. If variants exist, every variant must have distinct pricing in variantPrices.`,
    { temperature: 0.35, maxTokens: 4000 }
  );

  if (!parsed?.shortDescription || !parsed.description) return null;

  const mapped = mapAiOptions(parsed.variantOptions);
  const inferred = inferOptionsFromName(
    parsed.name?.trim() || input.name,
    input.categories
  );
  const variantOptions = sanitizeOptionGroups(
    filterRelevantOptionGroups(
      mapped.length ? mapped : inferred,
      parsed.name?.trim() || input.name,
      input.categories
    )
  );

  let basePrice =
    Number(parsed.pricing?.price) > 0
      ? Number(parsed.pricing?.price)
      : priceAnchor;
  const compareAt = normalizeCompareAt(
    basePrice,
    parsed.pricing?.compareAtPrice
      ? Number(parsed.pricing.compareAtPrice)
      : undefined
  );

  let variants = generateVariantsFromOptions(
    variantOptions,
    { sku, price: basePrice, compareAtPrice: compareAt, stock: 20 },
    [],
    true
  );

  variants = applyAiVariantPrices(variants, parsed.variantPrices, variantOptions);
  variants = enforceDistinctVariantPrices(
    variants,
    basePrice,
    compareAt,
    variantOptions
  );

  // Base price = cheapest variant after smart pricing.
  if (variants.length > 0) {
    const prices = variants.map((v) => v.price).filter((p) => p > 0);
    if (prices.length) basePrice = Math.min(...prices);
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
      .map((f) => ({
        question: sanitizeAiDashes(String(f.question)),
        answer: sanitizeAiDashes(String(f.answer)),
      }))
      .slice(0, 10),
    warranty: parsed.warranty ? sanitizeAiDashes(String(parsed.warranty)) : undefined,
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
