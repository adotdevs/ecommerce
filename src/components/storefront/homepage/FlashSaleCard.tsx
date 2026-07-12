"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { RemoteImage } from "@/components/storefront/RemoteImage";
import { motion } from "framer-motion";
import { Flame, ShoppingBag, Zap, Check } from "lucide-react";
import { Button } from "@/components/ds/button";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";
import { VariantQuickAddModal } from "@/components/storefront/products/VariantQuickAddModal";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { cn } from "@/components/ds/utils";
import { useTranslations } from "next-intl";
import {
  isProductCardInStock,
  type ProductCardData,
} from "@/lib/catalog/product-card";
import { resolveFlashSaleEndsAt } from "@/lib/cms/flash-sale-countdown";

export type FlashSaleProduct = ProductCardData;

function discountPercent(price: number, compareAt?: number) {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** Deterministic “claimed” fill so cards feel urgent without real inventory events */
function claimedPercent(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return 55 + (hash % 35);
}

export function FlashSaleCard({
  product,
  className,
}: {
  product: FlashSaleProduct;
  className?: string;
}) {
  const t = useTranslations("common");
  const { addToCart, justAdded } = useAddToCart();
  const image = product.media?.[0];
  const off = discountPercent(product.pricing.price, product.pricing.compareAtPrice);
  const claimed = claimedPercent(product._id);
  const outOfStock = !isProductCardInStock(product);
  const [variantModalOpen, setVariantModalOpen] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || justAdded) return;
    if (product.hasVariants) {
      setVariantModalOpen(true);
      return;
    }
    addToCart({
      productId: product._id,
      name: product.name,
      slug: product.slug,
      image: image?.url,
      price: product.pricing.price,
      quantity: 1,
      maxQuantity: product.inventory?.stock,
    });
  };

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-2xl",
        "border border-amber-500/25 bg-gradient-to-b from-[#1a1208] to-[#0c0a08]",
        "shadow-[0_0_0_1px_rgba(245,158,11,0.08),0_20px_40px_-20px_rgba(0,0,0,0.6)]",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-500/20 blur-2xl transition-opacity group-hover:opacity-100" />

      <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
          {image ? (
            <div className="absolute inset-0 overflow-hidden">
              <div className="relative h-full w-full origin-center scale-[1.28] transition-transform duration-500 group-hover:scale-[1.34]">
                <RemoteImage
                  src={image.url}
                  alt={image.alt ?? product.name}
                  fill
                  className="object-cover object-center"
                  style={{ objectFit: "cover", objectPosition: "center" }}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  loading="lazy"
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-amber-200/40">—</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a08] via-transparent to-transparent" />

          {off != null && (
            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-black shadow-lg">
              <Zap className="h-3 w-3 fill-current" />
              −{off}%
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2.5 p-4 pt-3">
          {product.brandName && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-500/70">
              {product.brandName}
            </p>
          )}
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-amber-50">
            {product.name}
          </h3>

          <div className="flex items-baseline gap-2">
            <PriceDisplay
              amountUsd={product.pricing.price}
              className="text-lg font-bold text-amber-400"
            />
            {product.pricing.compareAtPrice != null &&
              product.pricing.compareAtPrice > product.pricing.price && (
                <PriceDisplay
                  amountUsd={product.pricing.compareAtPrice}
                  className="text-[13px] text-amber-200/35 line-through"
                />
              )}
          </div>

          <div className="mt-1 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1 font-medium text-amber-200/70">
                <Flame className="h-3 w-3 text-amber-500" />
                {claimed}% claimed
              </span>
              <span className="text-amber-200/40">{outOfStock ? "Sold out" : "Selling fast"}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-amber-950">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
                initial={{ width: 0 }}
                whileInView={{ width: `${claimed}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4">
        <Button
          size="md"
          className={cn(
            "w-full border-0",
            justAdded
              ? "bg-emerald-500 text-white hover:bg-emerald-500"
              : "bg-amber-500 text-black hover:bg-amber-400"
          )}
          onClick={handleAdd}
          disabled={outOfStock || justAdded}
        >
          {justAdded ? (
            <>
              <Check className="h-4 w-4" />
              {t("addedToCart")}
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              {outOfStock ? "Sold out" : "Grab deal"}
            </>
          )}
        </Button>
        {product.hasVariants && (
          <VariantQuickAddModal
            product={product}
            open={variantModalOpen}
            onOpenChange={setVariantModalOpen}
          />
        )}
      </div>
    </motion.article>
  );
}

export function FlashCountdown({ endsAt }: { endsAt?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const effectiveEnd = resolveFlashSaleEndsAt(endsAt, now ?? Date.now());

  // Avoid SSR/client time mismatch — show placeholders until mounted
  if (now == null) {
    return (
      <div className="flex flex-wrap items-center gap-2" aria-hidden>
        {["Hrs", "Min", "Sec"].map((label) => (
          <div
            key={label}
            className="min-w-[3.25rem] rounded-lg border border-amber-500/25 bg-black/40 px-2.5 py-1.5 text-center backdrop-blur-sm"
          >
            <p className="font-mono text-lg font-bold tabular-nums leading-none text-amber-300 md:text-xl">
              --
            </p>
            <p className="mt-1 text-[9px] font-medium uppercase tracking-widest text-amber-200/45">
              {label}
            </p>
          </div>
        ))}
      </div>
    );
  }

  const diff = Math.max(0, effectiveEnd.getTime() - now);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const cells = [
    ...(days > 0 ? [{ label: "Days", value: days }] : []),
    { label: "Hrs", value: hours },
    { label: "Min", value: minutes },
    { label: "Sec", value: seconds },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {cells.map((cell) => (
          <div
            key={cell.label}
            className="min-w-[3.25rem] rounded-lg border border-amber-500/25 bg-black/40 px-2.5 py-1.5 text-center backdrop-blur-sm"
          >
            <p className="font-mono text-lg font-bold tabular-nums leading-none text-amber-300 md:text-xl">
              {String(cell.value).padStart(2, "0")}
            </p>
            <p className="mt-1 text-[9px] font-medium uppercase tracking-widest text-amber-200/45">
              {cell.label}
            </p>
          </div>
      ))}
    </div>
  );
}
