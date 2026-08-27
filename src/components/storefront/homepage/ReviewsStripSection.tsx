"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { RemoteImage } from "@/components/storefront/RemoteImage";
import { StarRating } from "@/components/storefront/products/StarRating";
import {
  fadeUp,
  staggerContainer,
  staggerItem,
  viewportOnce,
} from "@/components/storefront/homepage/motion";
import type { ReviewsStripItem } from "@/lib/cms/homepage";

interface SectionProps {
  config: Record<string, unknown>;
}

function truncateQuote(value: string, max = 160) {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function ReviewsStripSection({ config }: SectionProps) {
  const t = useTranslations("reviews");
  const reviews = (config.reviews as ReviewsStripItem[]) ?? [];
  const eyebrow = (config.eyebrow as string) ?? "";
  const title = (config.title as string) ?? "";
  const subtitle = (config.subtitle as string) ?? "";
  const emptyMessage = (config.emptyMessage as string) ?? "";

  if (!title && reviews.length === 0) return null;

  return (
    <section className="store-section store-section--muted">
      <div className="container-store">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          className="mb-10 text-center"
        >
          {eyebrow && (
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </p>
          )}
          {title && <h2 className="store-section-title">{title}</h2>}
          {subtitle && (
            <p className="store-section-subtitle mx-auto mt-3">{subtitle}</p>
          )}
        </motion.div>

        {reviews.length > 0 ? (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="store-reviews-strip"
          >
            {reviews.map((review) => (
              <motion.article
                key={review.id}
                variants={staggerItem}
                className="store-reviews-card"
              >
                <div className="store-reviews-card__photo">
                  {review.photoUrl ? (
                    <RemoteImage
                      src={review.photoUrl}
                      alt={review.photoAlt || t("reviewPhoto")}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 80vw, (max-width: 1024px) 40vw, 22vw"
                      loading="lazy"
                    />
                  ) : (
                    <span className="store-reviews-card__photo-fallback">
                      {review.initial}
                    </span>
                  )}
                </div>
                <div className="store-reviews-card__body">
                  <div className="flex items-center gap-3">
                    <span className="store-reviews-card__avatar" aria-hidden>
                      {review.initial}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {review.userName}
                      </p>
                      <StarRating rating={review.rating} size="sm" />
                    </div>
                  </div>
                  {review.title && (
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                      {review.title}
                    </h3>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {truncateQuote(review.body)}
                  </p>
                  {review.productSlug && (
                    <Link
                      href={`/products/${review.productSlug}`}
                      className="store-reviews-card__product"
                      aria-label={t("viewProduct")}
                    >
                      <span className="truncate">
                        {t("shopProduct", { name: review.productName })}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                    </Link>
                  )}
                </div>
              </motion.article>
            ))}
          </motion.div>
        ) : emptyMessage ? (
          <p className="text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : null}
      </div>
    </section>
  );
}
