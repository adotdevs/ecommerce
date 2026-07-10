import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { suggestFullProduct } from "@/lib/admin/product-ai-suggest";
import { nameToSku, type ProductCopyInput } from "@/lib/admin/product-copy-suggest";
import { slugify } from "@/lib/utils";
import {
  resolveBrandFields,
  resolveCategoryFields,
} from "@/lib/admin/product-helpers";

export function parseProductNameList(input: string): string[] {
  const lines = input
    .split(/[\n\r]+/)
    .flatMap((line) => line.split(/,(?=\s*[^,])/))
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter((s) => s.length > 1);

  return [...new Set(lines)];
}

export interface BulkImportItemResult {
  name: string;
  success: boolean;
  productId?: string;
  error?: string;
}

export async function bulkImportProducts(
  names: string[],
  opts?: { publish?: boolean; categoryIds?: string[]; brandId?: string }
): Promise<{ results: BulkImportItemResult[]; created: number; failed: number }> {
  await connectDB();
  const results: BulkImportItemResult[] = [];
  let created = 0;
  let failed = 0;

  const [categoryFields, brandFields] = await Promise.all([
    resolveCategoryFields(opts?.categoryIds ?? []),
    opts?.brandId ? resolveBrandFields(opts.brandId) : Promise.resolve({}),
  ]);

  for (const name of names) {
    try {
      const input: ProductCopyInput = { name, sku: nameToSku(name) };
      const suggestion = await suggestFullProduct(input);

      const slug = slugify(name);
      const existing = await Product.findOne({
        $or: [{ slug }, { sku: suggestion.variants[0]?.sku ?? nameToSku(name) }],
      }).lean();

      if (existing) {
        results.push({
          name,
          success: false,
          error: "Product with same slug or SKU already exists",
        });
        failed++;
        continue;
      }

      const totalStock = suggestion.variants.reduce((s, v) => s + v.stock, 0);

      const product = await Product.create({
        name: name.trim(),
        slug,
        sku: suggestion.variants[0]?.sku ?? nameToSku(name),
        shortDescription: suggestion.shortDescription,
        description: suggestion.description,
        tags: suggestion.tags,
        variantOptions: suggestion.variantOptions,
        variants: suggestion.variants,
        pricing: suggestion.pricing,
        inventory: {
          stock: totalStock || 25,
          lowStockThreshold: 5,
          trackInventory: true,
        },
        specifications: suggestion.specifications,
        faqs: suggestion.faqs,
        warranty: suggestion.warranty,
        weight: suggestion.weight,
        status: opts?.publish ? "published" : "draft",
        seo: suggestion.seo,
        ...categoryFields,
        ...brandFields,
      });

      results.push({
        name,
        success: true,
        productId: String(product._id),
      });
      created++;
    } catch (err) {
      results.push({
        name,
        success: false,
        error: err instanceof Error ? err.message : "Import failed",
      });
      failed++;
    }
  }

  return { results, created, failed };
}
