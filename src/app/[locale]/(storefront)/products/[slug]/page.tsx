import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import { ProductDetailView } from "@/components/storefront/products/ProductDetailView";
import { toProductCardData } from "@/lib/catalog/product-card";
import { PRODUCT_GRID_CLASS } from "@/lib/catalog/product-grid";
import { computeReviewSummary, syncProductRating } from "@/lib/reviews/sync-rating";
import { localizeProductDoc } from "@/lib/i18n/product";
import type { Locale } from "@/config/locales";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connectDB();
  const { slug, locale } = await params;
  const raw = await Product.findOne({ slug, status: "published" }).lean();
  if (!raw) return { title: "Product Not Found" };

  const product = localizeProductDoc(
    raw as unknown as Record<string, unknown>,
    locale
  );

  return {
    title: (product.seo as { title?: string })?.title ?? String(product.name),
    description:
      (product.seo as { description?: string })?.description ??
      String(product.shortDescription ?? ""),
    keywords: (product.seo as { keywords?: string[] })?.keywords,
    openGraph: {
      title: (product.seo as { title?: string })?.title ?? String(product.name),
      description: (product.seo as { description?: string })?.description,
      images: Array.isArray(product.media) && product.media[0]
        ? [(product.media[0] as { url: string }).url]
        : [],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  await connectDB();
  const { slug, locale } = await params;
  const raw = await Product.findOne({ slug, status: "published" }).lean();
  if (!raw) notFound();

  const product = localizeProductDoc(
    raw as unknown as Record<string, unknown>,
    locale
  );

  const reviewSummary = await computeReviewSummary(raw._id);
  if (
    reviewSummary.count !== (raw.rating?.count ?? 0) ||
    reviewSummary.average !== (raw.rating?.average ?? 0)
  ) {
    await syncProductRating(raw._id);
  }

  const t = await getTranslations("products");

  const relatedRaw = await Product.find({
    _id: { $ne: raw._id },
    status: "published",
    categoryIds: { $in: raw.categoryIds },
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
    image: (product.media as { url: string }[])?.map((m) => m.url),
    offers: {
      "@type": "Offer",
      price: (product.pricing as { price: number }).price,
      priceCurrency:
        (product.pricing as { currency?: string }).currency ?? "USD",
      availability:
        (product.inventory as { stock: number }).stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  const p = product as Record<string, unknown>;
  const pricing = p.pricing as Record<string, unknown>;
  const inventory = p.inventory as Record<string, unknown>;

  const productData = {
    _id: String(p._id),
    name: String(p.name),
    slug: String(p.slug),
    sku: String(p.sku),
    brandName: p.brandName != null ? String(p.brandName) : undefined,
    description: p.description != null ? String(p.description) : undefined,
    shortDescription:
      p.shortDescription != null ? String(p.shortDescription) : undefined,
    media: ((p.media as unknown[]) ?? []).map((m) => {
      const item = m as Record<string, unknown>;
      return {
        url: String(item.url),
        alt: item.alt ? String(item.alt) : undefined,
        sortOrder: item.sortOrder as number | undefined,
      };
    }),
    variantOptions: ((p.variantOptions as unknown[]) ?? []).map((g) => {
      const group = g as Record<string, unknown>;
      return {
        id: String(group.id),
        name: String(group.name),
        type: group.type as
          | "color"
          | "size"
          | "shoe_size"
          | "apparel_size"
          | "material"
          | "style"
          | "capacity"
          | "custom",
        values: ((group.values as unknown[]) ?? []).map((v) => {
          const val = v as Record<string, unknown>;
          return {
            value: String(val.value),
            label: String(val.label ?? val.value),
            hex: val.hex ? String(val.hex) : undefined,
          };
        }),
      };
    }),
    variants: ((p.variants as unknown[]) ?? []).map((v) => {
      const variant = v as Record<string, unknown>;
      return {
        id: String(variant.id),
        name: String(variant.name),
        sku: String(variant.sku),
        price: Number(variant.price),
        compareAtPrice:
          variant.compareAtPrice != null
            ? Number(variant.compareAtPrice)
            : undefined,
        stock: Number(variant.stock),
        attributes: Object.fromEntries(
          Object.entries(
            (variant.attributes as Record<string, unknown>) ?? {}
          ).map(([k, val]) => [k, String(val)])
        ),
      };
    }),
    pricing: {
      price: Number(pricing.price),
      compareAtPrice:
        pricing.compareAtPrice != null
          ? Number(pricing.compareAtPrice)
          : undefined,
      currency: pricing.currency != null ? String(pricing.currency) : undefined,
    },
    inventory: {
      stock: Number(inventory.stock),
    },
    specifications: ((p.specifications as unknown[]) ?? []).map((s) => {
      const spec = s as Record<string, unknown>;
      return {
        section: spec.section ? String(spec.section) : undefined,
        key: String(spec.key),
        value: String(spec.value),
      };
    }),
    highlights: ((p.highlights as string[]) ?? []).map(String),
    warranty: p.warranty ? String(p.warranty) : undefined,
    faqs: ((p.faqs as unknown[]) ?? []).map((f) => {
      const faq = f as Record<string, unknown>;
      return {
        question: String(faq.question),
        answer: String(faq.answer),
      };
    }),
    rating: {
      average: reviewSummary.average,
      count: reviewSummary.count,
    },
  };

  if (productData.rating.count > 0) {
    Object.assign(jsonLd, {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: productData.rating.average,
        reviewCount: productData.rating.count,
      },
    });
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container-store py-8 md:py-12">
        <ProductDetailView product={productData} />

        {relatedRaw.length > 0 && (
          <section className="mt-16 border-t border-border pt-16 md:mt-24 md:pt-24">
            <h2 className="mb-8 text-display-h3 text-foreground">{t("related")}</h2>
            <div className={PRODUCT_GRID_CLASS}>
              {relatedRaw.map((rel) => (
                <ProductCard
                  key={String(rel._id)}
                  product={toProductCardData(
                    rel as unknown as Record<string, unknown>,
                    locale
                  )}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
