"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { ProductGallery } from "@/components/storefront/products/ProductGallery";
import { ProductDetailPrice } from "@/components/storefront/products/ProductDetailPrice";
import { ProductReviews } from "@/components/storefront/products/ProductReviews";
import { StarRating } from "@/components/storefront/products/StarRating";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { cn } from "@/components/ds/utils";
import { Check } from "lucide-react";
import { ProductVariantSelector } from "@/components/storefront/products/ProductVariantSelector";
import type { VariantOptionGroup } from "@/lib/catalog/variant-options";

interface ProductData {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  brandName?: string;
  description?: string;
  shortDescription?: string;
  media: { url: string; alt?: string; sortOrder?: number }[];
  variantOptions?: VariantOptionGroup[];
  variants: {
    id: string;
    name: string;
    sku: string;
    price: number;
    compareAtPrice?: number;
    stock: number;
    attributes: Record<string, string>;
  }[];
  pricing: { price: number; compareAtPrice?: number; currency?: string };
  inventory: { stock: number };
  specifications: { key: string; value: string }[];
  faqs: { question: string; answer: string }[];
  rating: { average: number; count: number };
}

function scrollToReviews() {
  document.getElementById("customer-reviews")?.scrollIntoView({ behavior: "smooth" });
}

export function ProductDetailView({ product }: { product: ProductData }) {
  const t = useTranslations("common");
  const tp = useTranslations("products");
  const tr = useTranslations("reviews");
  const { addToCart, justAdded } = useAddToCart();

  const sortedMedia = useMemo(
    () => [...product.media].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [product.media]
  );

  const [selectedVariant, setSelectedVariant] = useState<
    ProductData["variants"][number] | null
  >(() => product.variants[0] ?? null);

  const handleVariantChange = useCallback(
    (variant: typeof product.variants[0] | undefined) => {
      setSelectedVariant(variant ?? null);
    },
    []
  );
  const price = selectedVariant?.price ?? product.pricing.price;
  const compareAt = selectedVariant?.compareAtPrice ?? product.pricing.compareAtPrice;
  const stock = selectedVariant?.stock ?? product.inventory.stock;
  const inStock = stock > 0;

  const { average: ratingAvg, count: reviewCount } = product.rating;
  const hasDescription = Boolean(product.description || product.shortDescription);
  const hasSpecs = product.specifications?.length > 0;

  const handleAddToCart = () => {
    if (!inStock || justAdded) return;
    addToCart({
      productId: product._id,
      variantId: selectedVariant?.id ?? undefined,
      name: selectedVariant ? `${product.name} — ${selectedVariant.name}` : product.name,
      slug: product.slug,
      image: sortedMedia[0]?.url,
      price,
      quantity: 1,
    });
  };

  return (
    <div className="space-y-0">
      {/* Buy box — gallery + purchase column */}
      <div className="grid gap-10 overflow-visible lg:grid-cols-2 lg:gap-14">
        <ProductGallery
          images={sortedMedia.map((m) => ({ url: m.url, alt: m.alt }))}
          productName={product.name}
        />

        <div className="lg:pt-2">
          {product.brandName && (
            <p className="text-small font-medium uppercase tracking-widest text-muted-foreground">
              {product.brandName}
            </p>
          )}
          <h1 className="mt-2 text-display-h2 text-foreground">{product.name}</h1>

          {reviewCount > 0 && (
            <button
              type="button"
              onClick={scrollToReviews}
              className="mt-3 inline-flex transition-opacity hover:opacity-80"
            >
              <StarRating rating={ratingAvg} count={reviewCount} size="md" />
            </button>
          )}

          <p className="mt-1 text-small text-muted-foreground">
            {tp("sku")}: {product.sku}
          </p>

          <div className="mt-6">
            <ProductDetailPrice price={price} compareAtPrice={compareAt} />
          </div>

          <p className="mt-4 text-body leading-relaxed text-muted-foreground">
            {product.shortDescription}
          </p>

          <div className="mt-4">
            {inStock ? (
              <Badge variant="success">
                {t("inStock")} ({stock})
              </Badge>
            ) : (
              <Badge variant="destructive">{t("outOfStock")}</Badge>
            )}
          </div>

          {product.variants.length > 0 && (
            <div className="mt-6">
              <ProductVariantSelector
                variantOptions={product.variantOptions ?? []}
                variants={product.variants}
                onVariantChange={handleVariantChange}
              />
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className={cn(
                "flex-1",
                justAdded && "bg-brand-accent text-white hover:bg-brand-accent"
              )}
              variant={justAdded ? "accent" : "primary"}
              onClick={handleAddToCart}
              disabled={!inStock}
            >
              {justAdded ? (
                <>
                  <Check className="h-4 w-4" />
                  {t("addedToCart")}
                </>
              ) : (
                t("addToCart")
              )}
            </Button>
            <Button size="lg" variant="outline" className="flex-1" asChild disabled={!inStock}>
              <Link href="/checkout">{t("buyNow")}</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Amazon-style stacked sections */}
      <div className="mt-14 border-t border-border lg:mt-16">
        {hasDescription && (
          <section className="border-b border-border py-10 md:py-12">
            <h2 className="text-lg font-semibold text-foreground md:text-xl">
              {tp("aboutItem")}
            </h2>
            <div className="mt-5 max-w-3xl whitespace-pre-line text-body leading-relaxed text-muted-foreground">
              {product.description ?? product.shortDescription}
            </div>
          </section>
        )}

        {hasSpecs && (
          <section className="border-b border-border py-10 md:py-12">
            <h2 className="text-lg font-semibold text-foreground md:text-xl">
              {tp("productInformation")}
            </h2>
            <div className="mt-5 max-w-2xl overflow-hidden rounded-[var(--radius-md)] border border-border">
              <table className="w-full text-small">
                <tbody>
                  {product.specifications.map((spec, i) => (
                    <tr
                      key={spec.key}
                      className={cn(
                        "border-b border-border last:border-0",
                        i % 2 === 0 ? "bg-secondary/40" : "bg-card"
                      )}
                    >
                      <th className="w-[40%] px-4 py-3 text-left font-medium text-muted-foreground">
                        {spec.key}
                      </th>
                      <td className="px-4 py-3 font-medium text-foreground">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section id="customer-reviews" className="py-10 md:py-12">
          <h2 className="text-lg font-semibold text-foreground md:text-xl">
            {tr("customerReviews")}
            {reviewCount > 0 && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({reviewCount})
              </span>
            )}
          </h2>
          <div className="mt-6">
            <ProductReviews
              productSlug={product.slug}
              initialSummary={{
                average: ratingAvg,
                count: reviewCount,
                distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
