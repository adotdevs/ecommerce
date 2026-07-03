import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import { ProductDetailView } from "@/components/storefront/products/ProductDetailView";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connectDB();
  const { slug } = await params;
  const product = await Product.findOne({ slug, status: "published" }).lean();
  if (!product) return { title: "Product Not Found" };

  return {
    title: product.seo?.title ?? product.name,
    description: product.seo?.description ?? product.shortDescription,
    keywords: product.seo?.keywords,
    openGraph: {
      title: product.seo?.title ?? product.name,
      description: product.seo?.description,
      images: product.media?.[0]?.url ? [product.media[0].url] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  await connectDB();
  const { slug } = await params;
  const product = await Product.findOne({ slug, status: "published" }).lean();
  if (!product) notFound();

  const t = await getTranslations("products");

  const related = await Product.find({
    _id: { $ne: product._id },
    status: "published",
    categoryIds: { $in: product.categoryIds },
  })
    .limit(4)
    .lean();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brandName },
    image: product.media?.map((m) => m.url),
    offers: {
      "@type": "Offer",
      price: product.pricing.price,
      priceCurrency: product.pricing.currency ?? "USD",
      availability:
        product.inventory.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  const productData = {
    _id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    brandName: product.brandName,
    description: product.description,
    shortDescription: product.shortDescription,
    media: product.media ?? [],
    variants: product.variants ?? [],
    pricing: product.pricing,
    inventory: product.inventory,
    specifications: product.specifications ?? [],
    faqs: product.faqs ?? [],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container-store py-8 md:py-12">
        <ProductDetailView product={productData} />

        {related.length > 0 && (
          <section className="mt-16 border-t border-border pt-16 md:mt-24 md:pt-24">
            <h2 className="mb-8 text-display-h3 text-foreground">{t("related")}</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {related.map((p) => (
                <ProductCard
                  key={p._id.toString()}
                  product={{ ...p, _id: p._id.toString() }}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
