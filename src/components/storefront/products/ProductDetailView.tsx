"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { ProductGallery } from "@/components/storefront/products/ProductGallery";
import { ProductDetailPrice } from "@/components/storefront/products/ProductDetailPrice";
import { ProductReviews } from "@/components/storefront/products/ProductReviews";
import { ProductDetailSectionNav } from "@/components/storefront/products/ProductDetailSectionNav";
import { StarRating } from "@/components/storefront/products/StarRating";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { useCartStore } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/components/ds/utils";
import { Check, ChevronDown, Heart } from "lucide-react";
import { ProductVariantSelector } from "@/components/storefront/products/ProductVariantSelector";
import { QuantitySelector } from "@/components/storefront/cart/QuantitySelector";
import { LowStockHint } from "@/components/storefront/products/LowStockHint";
import { isLowStock } from "@/lib/inventory/stock";
import type { VariantOptionGroup } from "@/lib/catalog/variant-options";

interface ProductSpecification {
  section?: string;
  key: string;
  value: string;
}

interface ProductData {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  brandName?: string;
  description?: string;
  shortDescription?: string;
  highlights?: string[];
  warranty?: string;
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
  specifications: ProductSpecification[];
  faqs: { question: string; answer: string }[];
  rating: { average: number; count: number };
}

function groupSpecifications(specs: ProductSpecification[]) {
  const groups = new Map<string, ProductSpecification[]>();
  for (const spec of specs) {
    const section = spec.section?.trim() || "Additional details";
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section)!.push(spec);
  }
  return Array.from(groups.entries());
}

function scrollToReviews() {
  document.getElementById("customer-reviews")?.scrollIntoView({ behavior: "smooth" });
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="font-medium text-foreground">{question}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <p className="pb-4 text-body leading-relaxed text-muted-foreground">{answer}</p>
      )}
    </div>
  );
}

export function ProductDetailView({ product }: { product: ProductData }) {
  const t = useTranslations("common");
  const tp = useTranslations("products");
  const tr = useTranslations("reviews");
  const { addToCart, justAdded } = useAddToCart();
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const router = useRouter();
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isWishlisted = useWishlistStore((s) => s.hasItem(product._id));

  const sortedMedia = useMemo(
    () => [...product.media].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [product.media]
  );

  const [selectedVariant, setSelectedVariant] = useState<
    ProductData["variants"][number] | null
  >(() => product.variants[0] ?? null);
  const [quantity, setQuantity] = useState(1);

  const handleVariantChange = useCallback(
    (variant: (typeof product.variants)[0] | undefined) => {
      setSelectedVariant(variant ?? null);
    },
    []
  );

  const price = selectedVariant?.price ?? product.pricing.price;
  const compareAt = selectedVariant?.compareAtPrice ?? product.pricing.compareAtPrice;
  const availableStock = useMemo(() => {
    if (selectedVariant != null) {
      return Math.max(0, Number(selectedVariant.stock) || 0);
    }
    if (product.variants.length) {
      return product.variants.reduce(
        (sum, v) => sum + Math.max(0, Number(v.stock) || 0),
        0
      );
    }
    return Math.max(0, Number(product.inventory.stock) || 0);
  }, [selectedVariant, product.variants, product.inventory.stock]);

  useEffect(() => {
    setQuantity((current) => {
      if (availableStock <= 0) return 1;
      return Math.min(Math.max(1, current), availableStock);
    });
  }, [availableStock, selectedVariant?.id]);

  const inStock = availableStock > 0;
  const canAddToCart = inStock && quantity > 0 && quantity <= availableStock;
  const showLowStock = isLowStock(availableStock);

  const { average: ratingAvg, count: reviewCount } = product.rating;
  const hasDescription = Boolean(product.description || product.shortDescription);
  const hasHighlights = (product.highlights?.length ?? 0) > 0;
  const hasSpecs = product.specifications?.length > 0;
  const hasFaqs = product.faqs?.length > 0;
  const specGroups = useMemo(
    () => groupSpecifications(product.specifications ?? []),
    [product.specifications]
  );

  const detailSections = useMemo(
    () => [
      {
        id: "about-item",
        label: tp("aboutItem"),
        icon: "about" as const,
        show: hasDescription,
      },
      {
        id: "product-specs",
        label: tp("productInformation"),
        icon: "specs" as const,
        show: hasSpecs,
      },
      {
        id: "product-faqs",
        label: "Q&A",
        icon: "faq" as const,
        show: hasFaqs,
      },
      {
        id: "customer-reviews",
        label: tr("customerReviews"),
        icon: "reviews" as const,
        show: true,
        badge: reviewCount,
      },
    ],
    [tp, tr, hasDescription, hasSpecs, hasFaqs, reviewCount]
  );

  const handleAddToCart = () => {
    if (!canAddToCart || justAdded) return;
    if (product.variants.length > 0 && !selectedVariant) return;
    addToCart({
      productId: product._id,
      variantId: selectedVariant?.id ?? undefined,
      name: selectedVariant ? `${product.name} — ${selectedVariant.name}` : product.name,
      slug: product.slug,
      image: sortedMedia[0]?.url,
      price,
      quantity,
      maxQuantity: availableStock,
    });
  };

  const handleBuyNow = () => {
    if (!canAddToCart) return;
    if (product.variants.length > 0 && !selectedVariant) return;

    const cartItem = {
      productId: product._id,
      variantId: selectedVariant?.id ?? undefined,
      name: selectedVariant
        ? `${product.name} — ${selectedVariant.name}`
        : product.name,
      slug: product.slug,
      image: sortedMedia[0]?.url,
      price,
      quantity,
      maxQuantity: availableStock,
    };

    const existing = useCartStore
      .getState()
      .items.find(
        (i) =>
          i.productId === cartItem.productId &&
          i.variantId === cartItem.variantId
      );

    if (existing) {
      updateQuantity(cartItem.productId, quantity, cartItem.variantId);
    } else {
      addItem(cartItem);
    }

    router.push("/checkout");
  };

  const handleWishlist = () => {
    const added = !isWishlisted;
    toggleWishlist({
      productId: product._id,
      name: product.name,
      slug: product.slug,
      image: sortedMedia[0]?.url,
      price,
    });
    if (added) {
      toast({
        variant: "success",
        title: t("addedToWishlist"),
        description: product.name,
      });
    }
  };

  return (
    <div className="space-y-0">
      <div
        id="product-detail-hero"
        className="grid gap-10 overflow-visible lg:grid-cols-2 lg:gap-14"
      >
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

          {hasHighlights && (
            <ul className="mt-4 space-y-1.5 text-body text-foreground">
              {product.highlights!.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4">
            {inStock ? (
              <Badge variant="success">{t("inStock")}</Badge>
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

          {inStock && (
            <div className="mt-6">
              <p className="mb-2 text-small font-medium text-foreground">
                {tp("quantity")}
              </p>
              <QuantitySelector
                quantity={quantity}
                max={availableStock}
                onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
                onIncrease={() =>
                  setQuantity((q) => Math.min(availableStock, q + 1))
                }
              />
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className={cn(
                "flex-1",
                justAdded && "bg-brand-accent text-white hover:bg-brand-accent",
                showLowStock && !justAdded && "h-auto min-h-12 py-2.5"
              )}
              variant={justAdded ? "accent" : "primary"}
              onClick={handleAddToCart}
              disabled={!canAddToCart}
            >
              {justAdded ? (
                <>
                  <Check className="h-4 w-4" />
                  {t("addedToCart")}
                </>
              ) : (
                <span className="flex flex-col items-center gap-0.5">
                  <span>{t("addToCart")}</span>
                  {showLowStock && (
                    <LowStockHint count={availableStock} compact className="text-white/90" />
                  )}
                </span>
              )}
            </Button>
            {inStock ? (
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={handleBuyNow}
                disabled={!canAddToCart}
              >
                {t("buyNow")}
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={handleWishlist}
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    isWishlisted && "fill-red-500 text-red-500"
                  )}
                />
                {t("addToWishlist")}
              </Button>
            )}
          </div>

          {product.warranty && (
            <p className="mt-6 text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">Warranty: </span>
              {product.warranty}
            </p>
          )}
        </div>
      </div>

      <div id="product-detail-sections" className="mt-10 border-t border-border lg:mt-12">
        <ProductDetailSectionNav sections={detailSections} />

        {hasDescription && (
          <section
            id="about-item"
            className="scroll-mt-[calc(var(--site-header-height,6.5rem)+3.5rem)] border-b border-border py-10 md:py-12"
          >
            <h2 className="text-lg font-semibold text-foreground md:text-xl">
              {tp("aboutItem")}
            </h2>
            <div className="mt-5 max-w-3xl whitespace-pre-line text-body leading-relaxed text-muted-foreground">
              {product.description ?? product.shortDescription}
            </div>
          </section>
        )}

        {hasSpecs && (
          <section
            id="product-specs"
            className="scroll-mt-[calc(var(--site-header-height,6.5rem)+3.5rem)] border-b border-border py-10 md:py-12"
          >
            <h2 className="text-lg font-semibold text-foreground md:text-xl">
              {tp("productInformation")}
            </h2>
            <div className="mt-6 space-y-8">
              {specGroups.map(([section, items]) => (
                <div key={section}>
                  <h3 className="mb-3 text-base font-semibold text-foreground">{section}</h3>
                  <div className="max-w-3xl overflow-hidden rounded-[var(--radius-md)] border border-border">
                    <table className="w-full text-small">
                      <tbody>
                        {items.map((spec, i) => (
                          <tr
                            key={`${section}-${spec.key}`}
                            className={cn(
                              "border-b border-border last:border-0",
                              i % 2 === 0 ? "bg-secondary/40" : "bg-card"
                            )}
                          >
                            <th className="w-[42%] px-4 py-3 text-left font-medium text-muted-foreground">
                              {spec.key}
                            </th>
                            <td className="px-4 py-3 font-medium text-foreground">
                              {spec.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {hasFaqs && (
          <section
            id="product-faqs"
            className="scroll-mt-[calc(var(--site-header-height,6.5rem)+3.5rem)] border-b border-border py-10 md:py-12"
          >
            <h2 className="text-lg font-semibold text-foreground md:text-xl">
              Questions &amp; answers
            </h2>
            <div className="mt-5 max-w-3xl divide-y divide-border rounded-[var(--radius-md)] border border-border px-4">
              {product.faqs.map((faq) => (
                <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </section>
        )}

        <section
          id="customer-reviews"
          className="scroll-mt-[calc(var(--site-header-height,6.5rem)+3.5rem)] py-10 md:py-12"
        >
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
