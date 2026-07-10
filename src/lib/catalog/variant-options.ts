import { resolveColorHex } from "@/lib/catalog/color-hex";

export type VariantOptionType =
  | "color"
  | "size"
  | "shoe_size"
  | "apparel_size"
  | "material"
  | "style"
  | "capacity"
  | "custom";

export interface VariantOptionValue {
  value: string;
  label: string;
  hex?: string;
}

export interface VariantOptionGroup {
  id: string;
  name: string;
  type: VariantOptionType;
  values: VariantOptionValue[];
  /** Stable key used in variant.attributes — survives locale translation of name. */
  attributeKey?: string;
}

export interface ProductVariantInput {
  id: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  attributes: Record<string, string>;
}

export const VARIANT_OPTION_PRESETS: Record<
  VariantOptionType,
  { label: string; description: string; values: VariantOptionValue[] }
> = {
  color: {
    label: "Color",
    description: "Color swatches on the storefront",
    values: [
      { value: "black", label: "Black", hex: "#111111" },
      { value: "white", label: "White", hex: "#f5f5f5" },
      { value: "navy", label: "Navy", hex: "#1e3a5f" },
      { value: "gray", label: "Gray", hex: "#6b7280" },
      { value: "red", label: "Red", hex: "#dc2626" },
      { value: "blue", label: "Blue", hex: "#2563eb" },
      { value: "green", label: "Green", hex: "#16a34a" },
      { value: "beige", label: "Beige", hex: "#d4c4a8" },
    ],
  },
  shoe_size: {
    label: "Shoe size (US)",
    description: "Numeric sizes for footwear",
    values: ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "13"].map(
      (s) => ({ value: s, label: `US ${s}` })
    ),
  },
  apparel_size: {
    label: "Apparel size",
    description: "XS through XXL",
    values: ["XS", "S", "M", "L", "XL", "XXL", "3XL"].map((s) => ({
      value: s.toLowerCase(),
      label: s,
    })),
  },
  size: {
    label: "Size",
    description: "General size labels",
    values: ["Small", "Medium", "Large", "X-Large"].map((s) => ({
      value: s.toLowerCase().replace(/\s+/g, "-"),
      label: s,
    })),
  },
  material: {
    label: "Material",
    description: "Fabric or material type",
    values: [
      { value: "cotton", label: "Cotton" },
      { value: "polyester", label: "Polyester" },
      { value: "leather", label: "Leather" },
      { value: "wool", label: "Wool" },
      { value: "silk", label: "Silk" },
      { value: "linen", label: "Linen" },
    ],
  },
  style: {
    label: "Style",
    description: "Style or fit variant",
    values: [
      { value: "regular", label: "Regular fit" },
      { value: "slim", label: "Slim fit" },
      { value: "relaxed", label: "Relaxed fit" },
      { value: "oversized", label: "Oversized" },
    ],
  },
  capacity: {
    label: "Capacity",
    description: "Storage or volume",
    values: [
      { value: "32gb", label: "32 GB" },
      { value: "64gb", label: "64 GB" },
      { value: "128gb", label: "128 GB" },
      { value: "256gb", label: "256 GB" },
      { value: "512gb", label: "512 GB" },
      { value: "1tb", label: "1 TB" },
    ],
  },
  custom: {
    label: "Custom option",
    description: "Define your own option name and values",
    values: [],
  },
};

export function optionKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}

export function defaultAttributeKey(group: VariantOptionGroup): string {
  if (group.attributeKey?.trim()) return group.attributeKey.trim();
  if (group.type === "color") return "color";
  return optionKey(group.name);
}

/** Match a translated option group to the attribute keys stored on variants. */
export function inferAttributeKeyForGroup(
  group: VariantOptionGroup,
  variants: ProductVariantInput[]
): string {
  const preset = defaultAttributeKey(group);
  const groupValues = new Set(group.values.map((v) => v.value));
  if (!groupValues.size || !variants.length) return preset;

  const attrKeys = [
    ...new Set(variants.flatMap((v) => Object.keys(v.attributes ?? {}))),
  ];

  for (const key of attrKeys) {
    const variantValues = new Set(
      variants.map((v) => v.attributes?.[key]).filter(Boolean) as string[]
    );
    if ([...groupValues].every((val) => variantValues.has(val))) {
      return key;
    }
  }

  return preset;
}

export function newOptionGroup(type: VariantOptionType): VariantOptionGroup {
  const preset = VARIANT_OPTION_PRESETS[type];
  return {
    id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: preset.label,
    type,
    values: preset.values.map((v) => ({ ...v })),
  };
}

function cartesian<T>(arrays: T[][]): T[][] {
  if (!arrays.length) return [[]];
  return arrays.reduce<T[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]]
  );
}

export function sanitizeOptionGroups(groups: VariantOptionGroup[]): VariantOptionGroup[] {
  return groups
    .map((g) => ({
      ...g,
      name: g.type === "color" ? "Color" : g.name.trim(),
      attributeKey: defaultAttributeKey(g),
      values: g.values
        .filter((v) => v.value.trim() && v.label.trim())
        .map((v) => ({
          ...v,
          hex:
            g.type === "color"
              ? resolveColorHex(v.label.trim(), v.hex)
              : v.hex,
        })),
    }))
    .filter((g) => g.name && g.values.length > 0);
}

const COLOR_PRICE_ADJUST: Record<string, number> = {
  gold: 15,
  silver: 10,
  red: 5,
  blue: 3,
  green: 3,
  navy: 4,
  beige: 2,
  white: 0,
  black: 0,
  gray: 0,
  grey: 0,
};

const MATERIAL_PRICE_ADJUST: Record<string, number> = {
  leather: 25,
  wool: 15,
  silk: 20,
  linen: 8,
  cotton: 0,
  polyester: -5,
};

const APPAREL_SIZE_ADJUST: Record<string, number> = {
  xs: -5,
  s: 0,
  m: 0,
  l: 3,
  xl: 5,
  xxl: 8,
  "3xl": 12,
};

export function suggestVariantPrice(
  basePrice: number,
  attributes: Record<string, string>,
  groups: VariantOptionGroup[]
): number {
  if (!basePrice || basePrice <= 0) return 0;

  let delta = 0;

  for (const [key, val] of Object.entries(attributes)) {
    const group = groups.find((g) => defaultAttributeKey(g) === key);
    if (!group) continue;
    const normalized = val.toLowerCase();

    switch (group.type) {
      case "color":
        delta += COLOR_PRICE_ADJUST[normalized] ?? 0;
        break;
      case "material":
        delta += MATERIAL_PRICE_ADJUST[normalized] ?? 0;
        break;
      case "shoe_size": {
        const size = parseFloat(val);
        if (!Number.isNaN(size) && size > 9) delta += (size - 9) * 4;
        break;
      }
      case "apparel_size":
        delta += APPAREL_SIZE_ADJUST[normalized] ?? 0;
        break;
      case "capacity": {
        const idx = group.values.findIndex((v) => v.value === val);
        if (idx > 0) delta += idx * 12;
        break;
      }
      case "style":
        if (normalized === "oversized") delta += 8;
        else if (normalized === "slim") delta += 3;
        break;
      default:
        break;
    }
  }

  return Math.max(0, Math.round((basePrice + delta) * 100) / 100);
}

export function applySmartVariantPrices<T extends { price: number; compareAtPrice?: number; attributes: Record<string, string> }>(
  variants: T[],
  basePrice: number,
  baseCompareAt: number | undefined,
  groups: VariantOptionGroup[]
): T[] {
  return variants.map((v) => ({
    ...v,
    price: suggestVariantPrice(basePrice, v.attributes, groups),
    compareAtPrice:
      baseCompareAt != null && baseCompareAt > 0
        ? suggestVariantPrice(baseCompareAt, v.attributes, groups)
        : v.compareAtPrice,
  }));
}

export function generateVariantsFromOptions(
  groups: VariantOptionGroup[],
  base: { sku: string; price: number; compareAtPrice?: number; stock: number },
  existing: ProductVariantInput[] = [],
  smartPricing = true
): ProductVariantInput[] {
  const active = sanitizeOptionGroups(groups);
  if (!active.length) return [];

  const combos = cartesian(
    active.map((g) =>
      g.values.map((v) => ({
        groupName: g.name,
        key: defaultAttributeKey(g),
        value: v.value,
        label: v.label,
      }))
    )
  );

  const existingByKey = new Map(
    existing.map((v) => [JSON.stringify(v.attributes), v])
  );

  return combos.map((combo) => {
    const attributes: Record<string, string> = {};
    const labels: string[] = [];
    for (const part of combo) {
      attributes[part.key] = part.value;
      labels.push(part.label);
    }
    const attrKey = JSON.stringify(attributes);
    const prev = existingByKey.get(attrKey);
    const suffix = combo.map((c) => c.value).join("-");
    const sku = prev?.sku ?? `${base.sku}-${suffix}`.toUpperCase().slice(0, 48);

    let price = prev?.price ?? base.price;
    let compareAtPrice = prev?.compareAtPrice ?? base.compareAtPrice;

    if (!prev && smartPricing && base.price > 0) {
      price = suggestVariantPrice(base.price, attributes, active);
      if (base.compareAtPrice != null && base.compareAtPrice > 0) {
        compareAtPrice = suggestVariantPrice(base.compareAtPrice, attributes, active);
      }
    }

    return {
      id: prev?.id ?? `var-${suffix}-${Date.now().toString(36).slice(2, 6)}`,
      name: labels.join(" / "),
      sku,
      price,
      compareAtPrice,
      stock: prev?.stock ?? base.stock,
      attributes,
    };
  });
}

export function findVariantByAttributes(
  variants: ProductVariantInput[],
  selected: Record<string, string>
): ProductVariantInput | undefined {
  if (!Object.keys(selected).length) return variants[0];
  return variants.find((v) =>
    Object.entries(selected).every(([k, val]) => v.attributes[k] === val)
  );
}

export function getAvailableValues(
  variants: ProductVariantInput[],
  groupKey: string,
  selected: Record<string, string>
): Set<string> {
  const available = new Set<string>();
  for (const v of variants) {
    if (v.stock <= 0) continue;
    const matches = Object.entries(selected).every(
      ([k, val]) => k === groupKey || v.attributes[k] === val
    );
    if (matches && v.attributes[groupKey]) {
      available.add(v.attributes[groupKey]);
    }
  }
  return available;
}

export function inferOptionGroupsFromVariants(
  variants: ProductVariantInput[]
): VariantOptionGroup[] {
  const map = new Map<string, Map<string, VariantOptionValue>>();

  for (const v of variants) {
    for (const [key, val] of Object.entries(v.attributes ?? {})) {
      if (!map.has(key)) map.set(key, new Map());
      const group = map.get(key)!;
      if (!group.has(val)) {
        group.set(val, { value: val, label: val });
      }
    }
  }

  return Array.from(map.entries()).map(([key, valuesMap]) => {
    const name = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const isShoe = key.includes("shoe") || /^\d/.test([...valuesMap.keys()][0] ?? "");
    const isColor = key === "color" || key.includes("colour");
    let type: VariantOptionType = "custom";
    if (isColor) type = "color";
    else if (isShoe || key === "shoe_size") type = "shoe_size";
    else if (["xs", "s", "m", "l", "xl"].some((s) => valuesMap.has(s))) type = "apparel_size";
    else if (key === "size") type = "size";

    return {
      id: `opt-${key}`,
      name,
      type,
      values: Array.from(valuesMap.values()),
    };
  });
}
