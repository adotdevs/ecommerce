import { connectDB } from "@/lib/db/mongoose";
import { Category, Product } from "@/models";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connectDB();
  const { slug } = await params;
  const category = await Category.findOne({ slug }).lean();
  return { title: category?.name ?? "Category" };
}

export default async function CategoryPage({ params }: PageProps) {
  await connectDB();
  const { slug } = await params;
  const category = await Category.findOne({ slug }).lean();
  if (!category) notFound();

  const products = await Product.find({
    status: "published",
    categoryIds: category._id,
  }).lean();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">{category.name}</h1>
      {category.description && (
        <p className="mb-8 text-muted-foreground">{category.description}</p>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        {products.map((p) => (
          <ProductCard key={p._id.toString()} product={{ ...p, _id: p._id.toString() }} />
        ))}
      </div>
    </div>
  );
}
