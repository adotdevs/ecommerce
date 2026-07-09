"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ds/tabs";
import { ProductDetailPrice } from "@/components/storefront/products/ProductDetailPrice";
import { StarRating, getProductRating } from "@/components/storefront/products/StarRating";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { cn } from "@/components/ds/utils";
import { Check } from "lucide-react";

interface ProductData {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  brandName?: string;
  description?: string;
  shortDescription?: string;
  media: { url: string; alt?: string; sortOrder?: number }[];
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
}

export function ProductDetailView({ product }: { product: ProductData }) {
  const t = useTranslations("common");
  const tp = useTranslations("products");
  const { addToCart, justAdded } = useAddToCart();

  const sortedMedia = useMemo(
    () => [...product.media].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [product.media]
  );

  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants[0]?.id ?? null
  );

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const price = selectedVariant?.price ?? product.pricing.price;
  const compareAt = selectedVariant?.compareAtPrice ?? product.pricing.compareAtPrice;
  const stock = selectedVariant?.stock ?? product.inventory.stock;
  const inStock = stock > 0;

  const attributeGroups = useMemo(() => {
    const groups: Record<string, Set<string>> = {};
    for (const v of product.variants) {
      for (const [key, val] of Object.entries(v.attributes ?? {})) {
        if (!groups[key]) groups[key] = new Set();
        groups[key].add(val);
      }
    }
    return groups;
  }, [product.variants]);

  const { rating, count } = getProductRating(product._id);

  const handleAddToCart = () => {
    if (!inStock || justAdded) return;
    addToCart({
      productId: product._id,
      variantId: selectedVariantId ?? undefined,
      name: selectedVariant ? `${product.name} — ${selectedVariant.name}` : product.name,
      slug: product.slug,
      image: sortedMedia[activeImage]?.url,
      price,
      quantity: 1,
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* Gallery */}
      <div className="space-y-4">
        <div className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-border bg-secondary">
          {sortedMedia[activeImage] && (
            <Image
              src={sortedMedia[activeImage].url}
              alt={sortedMedia[activeImage].alt ?? product.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width:1024px) 100vw, 50vw"
            />
          )}
        </div>
        {sortedMedia.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sortedMedia.map((m, i) => (
              <button
                key={m.url}
                type="button"
                onClick={() => setActiveImage(i)}
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border-2 transition-colors",
                  i === activeImage ? "border-primary" : "border-border hover:border-muted-foreground"
                )}
              >
                <Image src={m.url} alt="" fill className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        {product.brandName && (
          <p className="text-small font-medium uppercase tracking-widest text-muted-foreground">
            {product.brandName}
          </p>
        )}
        <h1 className="mt-2 text-display-h2 text-foreground">{product.name}</h1>
        <p className="mt-1 text-small text-muted-foreground">
          {tp("sku")}: {product.sku}
        </p>

        <div className="mt-4">
          <StarRating rating={rating} count={count} size="md" />
        </div>

        <div className="mt-6">
          <ProductDetailPrice price={price} compareAtPrice={compareAt} />
        </div>

        <p className="mt-4 text-body text-muted-foreground">
          {product.shortDescription ?? product.description}
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

        {/* Variant selectors */}
        {Object.entries(attributeGroups).map(([attr, values]) => (
          <div key={attr} className="mt-6">
            <p className="mb-2 text-small font-medium capitalize text-foreground">{attr}</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(values).map((val) => {
                const variant = product.variants.find(
                  (v) => v.attributes?.[attr] === val
                );
                const isSelected = variant?.id === selectedVariantId;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => variant && setSelectedVariantId(variant.id)}
                    className={cn(
                      "rounded-[var(--radius-sm)] border px-4 py-2 text-small font-medium transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-muted-foreground"
                    )}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

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

        {/* Tabs */}
        <Tabs defaultValue="description" className="mt-12">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="specs">{tp("specifications")}</TabsTrigger>
          </TabsList>
          <TabsContent value="description">
            <div className="prose prose-sm max-w-none text-body text-muted-foreground">
              {product.description ?? product.shortDescription ?? "—"}
            </div>
          </TabsContent>
          <TabsContent value="reviews">
            <div className="rounded-[var(--radius-md)] border border-border p-6">
              <div className="flex items-center gap-4">
                <span className="text-display-h3">{rating}</span>
                <div>
                  <StarRating rating={rating} count={count} size="md" />
                  <p className="mt-1 text-small text-muted-foreground">
                    Based on {count} reviews
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="specs">
            {product.specifications?.length > 0 ? (
              <dl className="divide-y divide-border rounded-[var(--radius-md)] border border-border">
                {product.specifications.map((spec) => (
                  <div key={spec.key} className="flex justify-between px-4 py-3 text-small">
                    <dt className="text-muted-foreground">{spec.key}</dt>
                    <dd className="font-medium text-foreground">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-small text-muted-foreground">—</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
