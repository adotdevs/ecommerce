import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import {
  generateVariantsFromOptions,
  sanitizeOptionGroups,
  type VariantOptionGroup,
  type ProductVariantInput,
} from "@/lib/catalog/variant-options";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  /** Remove only Color groups, or clear every option group. */
  mode: z.enum(["color", "all"]).default("color"),
});

const COLOR_ATTR_KEYS = new Set(["color", "colour"]);

function isColorGroup(g: {
  type?: string;
  name?: string;
  attributeKey?: string;
}) {
  const type = String(g.type ?? "").toLowerCase();
  const name = String(g.name ?? "").toLowerCase().trim();
  const key = String(g.attributeKey ?? "").toLowerCase();
  return (
    type === "color" ||
    name === "color" ||
    name === "colour" ||
    /colou?r/.test(name) ||
    key === "color" ||
    key === "colour"
  );
}

function isColorAttributeKey(key: string) {
  return COLOR_ATTR_KEYS.has(key.toLowerCase());
}

function variantsHaveColor(variants: ProductVariantInput[]) {
  return variants.some((v) =>
    Object.keys(v.attributes ?? {}).some((key) => isColorAttributeKey(key))
  );
}

function variantNameFromAttributes(attrs: Record<string, string>) {
  const vals = Object.values(attrs).filter(Boolean);
  if (!vals.length) return "Default";
  return vals
    .map((v) =>
      v
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    )
    .join(" / ");
}

/** Remove color/colour from variant rows and merge duplicates (e.g. Black/32GB + White/32GB → 32GB). */
function stripColorFromVariants(
  variants: ProductVariantInput[]
): ProductVariantInput[] {
  if (!variants.length) return [];

  const stripped = variants.map((v) => {
    const attributes = { ...(v.attributes ?? {}) };
    for (const key of Object.keys(attributes)) {
      if (isColorAttributeKey(key)) delete attributes[key];
    }
    return { ...v, attributes };
  });

  if (stripped.every((v) => Object.keys(v.attributes).length === 0)) {
    return [];
  }

  const merged = new Map<string, ProductVariantInput>();
  for (const v of stripped) {
    const key = JSON.stringify(v.attributes);
    const existing = merged.get(key);
    if (existing) {
      existing.stock += Number(v.stock) || 0;
      continue;
    }
    merged.set(key, {
      ...v,
      name: variantNameFromAttributes(v.attributes),
    });
  }

  return [...merged.values()];
}

function toPlainOptionGroups(raw: unknown): VariantOptionGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((g, i) => {
    const group = (g ?? {}) as Record<string, unknown>;
    const values = Array.isArray(group.values) ? group.values : [];
    return {
      id: String(group.id ?? `opt-${i}`),
      name: String(group.name ?? ""),
      type: (group.type as VariantOptionGroup["type"]) || "custom",
      attributeKey:
        group.attributeKey != null ? String(group.attributeKey) : undefined,
      values: values.map((v) => {
        const val = (v ?? {}) as Record<string, unknown>;
        return {
          value: val.value != null ? String(val.value) : "",
          label: val.label != null ? String(val.label) : "",
          hex: val.hex != null ? String(val.hex) : undefined,
        };
      }),
    };
  });
}

function rebuildVariants(
  remaining: VariantOptionGroup[],
  product: {
    sku?: string;
    pricing?: { price?: number; compareAtPrice?: number };
    inventory?: { stock?: number };
    variants?: ProductVariantInput[];
  }
): ProductVariantInput[] {
  if (!remaining.length) return [];

  const existing = Array.isArray(product.variants) ? product.variants : [];
  const basePrice =
    Number(product.pricing?.price) ||
    Number(existing[0]?.price) ||
    0;
  const compareAt =
    product.pricing?.compareAtPrice != null
      ? Number(product.pricing.compareAtPrice)
      : existing[0]?.compareAtPrice;
  const firstValues = remaining[0]?.values?.length || 1;
  const stock =
    Number(product.inventory?.stock) ||
    existing.reduce((sum, v) => sum + (Number(v.stock) || 0), 0) ||
    0;

  return generateVariantsFromOptions(
    remaining,
    {
      sku: String(product.sku || "SKU"),
      price: basePrice,
      compareAtPrice: compareAt,
      stock: Math.max(0, Math.floor(stock / Math.max(1, firstValues))),
    },
    existing,
    false
  );
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const { ids, mode } = parsed.data;
    const uniqueIds = [...new Set(ids)];
    const products = await Product.find({ _id: { $in: uniqueIds } });

    let modified = 0;
    let failed = 0;
    let skipped = 0;
    for (const product of products) {
      try {
        const existingVariants = (product.variants ??
          []) as ProductVariantInput[];
        const currentGroups = toPlainOptionGroups(product.variantOptions);
        const hadColorGroup = currentGroups.some((g) => isColorGroup(g));
        const hadColorVariants = variantsHaveColor(existingVariants);

        if (mode === "color" && !hadColorGroup && !hadColorVariants) {
          skipped += 1;
          continue;
        }

        const remaining =
          mode === "all"
            ? []
            : sanitizeOptionGroups(
                currentGroups.filter((g) => !isColorGroup(g))
              );

        let nextVariants: ProductVariantInput[];
        if (mode === "all") {
          nextVariants = [];
        } else if (remaining.length > 0) {
          nextVariants = rebuildVariants(remaining, {
            sku: product.sku,
            pricing: product.pricing,
            inventory: product.inventory,
            variants: existingVariants,
          });
        } else if (hadColorVariants) {
          nextVariants = stripColorFromVariants(existingVariants);
        } else {
          nextVariants = [];
        }

        // Move stock back to parent inventory when all variants are cleared.
        if (!nextVariants.length) {
          const variantStock = (product.variants ?? []).reduce(
            (sum, v) => sum + (Number((v as { stock?: number }).stock) || 0),
            0
          );
          const currentStock = Number(product.inventory?.stock) || 0;
          if (variantStock > 0) {
            product.set("inventory.stock", Math.max(currentStock, variantStock));
          }
        }

        product.set("variantOptions", remaining);
        product.set("variants", nextVariants);

        // Drop bogus "Color" specs when color options are gone.
        if (Array.isArray(product.specifications)) {
          product.set(
            "specifications",
            product.specifications.filter(
              (s) =>
                !/^(color|colour)$/i.test(
                  String((s as { key?: string }).key ?? "")
                )
            )
          );
        }

        await product.save();
        modified += 1;
      } catch (productErr) {
        failed += 1;
        console.error(
          `Bulk clear options failed for product ${String(product._id)}:`,
          productErr
        );
      }
    }

    return apiSuccess({
      matched: products.length,
      modified,
      skipped,
      failed,
      requested: uniqueIds.length,
      mode,
    });
  } catch (err) {
    console.error("Bulk clear options error:", err);
    return apiError("Failed to clear product options", 500);
  }
}, PERMISSIONS.PRODUCTS_WRITE);
