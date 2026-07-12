import { connectDB } from "@/lib/db/mongoose";
import { HomepageSection, Product, Category } from "@/models";
import { isSectionVisible, resolveFeaturedProducts, resolveFlashSaleProducts } from "@/lib/cms/homepage";
import { resolveFlashSaleEndsAtIso } from "@/lib/cms/flash-sale-countdown";
import { toCategoryShowcaseList } from "@/lib/catalog/category-showcase";
import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  await connectDB();
  const sections = await HomepageSection.find().sort({ order: 1 }).lean();
  const visible = sections.filter(isSectionVisible);

  const resolved = await Promise.all(
    visible.map(async (section) => {
      const config = { ...section.config } as Record<string, unknown>;

      if (section.type === "featured_products") {
        const limit = (config.limit as number) ?? 8;
        config.products = await resolveFeaturedProducts(limit);
      }

      if (section.type === "flash_sale") {
        const limit = (config.limit as number) ?? 4;
        config.products = await resolveFlashSaleProducts({ ...config, limit });
        config.endsAt = resolveFlashSaleEndsAtIso(config.endsAt as string | undefined);
      }

      if (section.type === "category_showcase") {
        const categories = await Category.find().sort({ sortOrder: 1 }).limit(8).lean();
        config.categories = toCategoryShowcaseList(categories);
      }

      if (section.type === "hero_slider" && config.productIds) {
        const productIds = config.productIds as string[];
        config.products = await Product.find({
          _id: { $in: productIds },
          status: "published",
        }).lean();
      }

      return { ...section, config };
    })
  );

  return apiSuccess(resolved);
}
