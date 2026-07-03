import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { getTranslations } from "next-intl/server";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Products",
  description: "Browse our complete collection of premium products.",
};

interface PageProps {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const t = await getTranslations("products");
  const tc = await getTranslations("common");
  await connectDB();

  const page = parseInt(params.page ?? "1");
  const limit = 12;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { status: "published" };
  if (params.q) filter.$text = { $search: params.q };

  let sortQuery: Record<string, 1 | -1> = { createdAt: -1 };
  if (params.sort === "price-asc") sortQuery = { "pricing.price": 1 };
  if (params.sort === "price-desc") sortQuery = { "pricing.price": -1 };
  if (params.sort === "deals") {
    filter["pricing.compareAtPrice"] = { $exists: true, $gt: 0 };
  }

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortQuery).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  return (
    <div className="container-store py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-display-h2 text-foreground">
          {params.q ? t("resultsFor", { query: params.q }) : t("title")}
        </h1>
        <p className="mt-2 text-body text-muted-foreground">
          {t("found", { count: total })}
        </p>
      </div>

      {products.length === 0 ? (
        <div className="py-24 text-center text-body text-muted-foreground">
          {tc("noResults")}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product._id.toString()}
              product={{
                ...product,
                _id: product._id.toString(),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
