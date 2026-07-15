"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Truck,
  Shield,
  RefreshCw,
  Headphones,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { cn } from "@/components/ds/utils";
import { RemoteImage } from "@/components/storefront/RemoteImage";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import {
  FlashSaleCard,
  FlashCountdown,
  type FlashSaleProduct,
} from "@/components/storefront/homepage/FlashSaleCard";
import { ProductSliderCard } from "@/components/storefront/homepage/ProductSliderCard";
import { ProductCarousel } from "@/components/storefront/homepage/ProductCarousel";
import {
  fadeUp,
  staggerContainer,
  staggerItem,
  viewportOnce,
  scaleIn,
  slideFromLeft,
  slideFromRight,
} from "@/components/storefront/homepage/motion";
import { PRODUCT_GRID_CLASS } from "@/lib/catalog/product-grid";

interface SectionProps {
  config: Record<string, unknown>;
}

const BADGE_ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  shield: Shield,
  refresh: RefreshCw,
  headphones: Headphones,
};

function CmsSectionHeader({
  title,
  viewAllLabel,
  viewAllHref,
}: {
  title: string;
  viewAllLabel?: string;
  viewAllHref?: string;
}) {
  return (
    <div className="store-section-header">
      <h2 className="store-section-title">{title}</h2>
      {viewAllLabel && viewAllHref && (
        <Link href={viewAllHref} className="store-section-header__link">
          {viewAllLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

type HeroSlide = {
  title: string;
  subtitle: string;
  image: string;
  eyebrow?: string;
  floatCardTitle?: string;
  floatCardSubtitle?: string;
  cta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

/* ─── Hero ─── */
export function HeroSliderSection({ config }: SectionProps) {
  const heroBadge = (config.heroBadge as string) ?? "";
  const exploreNewLabel = (config.exploreNewLabel as string) ?? "";
  const exploreNewHref = (config.exploreNewHref as string) || "/new-arrivals";
  const floatCardTitle = (config.floatCardTitle as string) ?? "";
  const floatCardSubtitle = (config.floatCardSubtitle as string) ?? "";
  const trustPoints = (config.trustPoints as Array<{ icon?: string; label: string }>) ?? [];
  const slides = (config.slides as HeroSlide[]) ?? [];

  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[active];
  const go = (dir: -1 | 1) =>
    setActive((i) => (i + dir + slides.length) % slides.length);

  const eyebrow = slide.eyebrow || heroBadge;
  const offerTitle = slide.floatCardTitle || floatCardTitle;
  const offerSub = slide.floatCardSubtitle || floatCardSubtitle;
  const secondaryLabel = slide.secondaryCta?.label || exploreNewLabel;
  const secondaryHref = slide.secondaryCta?.href || exploreNewHref;

  return (
    <section className="store-hero-banner w-full">
      <div className="container-store py-5 md:py-7">
        <div className="store-hero-banner__shell">
          {slides.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => go(-1)}
                className="store-hero-banner__nav store-hero-banner__nav--left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => go(1)}
                className="store-hero-banner__nav store-hero-banner__nav--right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="store-hero-banner__frame">
            <div className="store-hero-banner__content">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  {eyebrow && <p className="store-hero-banner__eyebrow">{eyebrow}</p>}
                  <h1 className="store-hero-banner__title">{slide.title}</h1>
                  {slide.subtitle && (
                    <p className="store-hero-banner__subtitle">{slide.subtitle}</p>
                  )}
                  <div className="store-hero-banner__actions">
                    {slide.cta?.label && (
                      <Button size="lg" asChild>
                        <Link href={slide.cta.href || "/products"}>
                          {slide.cta.label}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    {secondaryLabel && (
                      <Button size="lg" variant="outline" asChild>
                        <Link href={secondaryHref}>{secondaryLabel}</Link>
                      </Button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {trustPoints.length > 0 && (
                <div className="store-hero-banner__trust">
                  {trustPoints.map((point) => {
                    const Icon = BADGE_ICONS[point.icon ?? ""] ?? Shield;
                    return (
                      <div key={point.label} className="store-hero-banner__trust-item">
                        <span className="store-hero-banner__trust-icon">
                          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                        <span>{point.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="store-hero-banner__media">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.image || String(active)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55 }}
                  className="absolute inset-0"
                >
                  {slide.image ? (
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      fill
                      priority={active === 0}
                      className="object-cover object-center"
                      sizes="(max-width:1024px) 100vw, 55vw"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-muted" />
                  )}
                </motion.div>
              </AnimatePresence>
              {(offerTitle || offerSub) && (
                <div className="store-hero-banner__float">
                  {offerTitle && (
                    <p className="store-hero-banner__float-title">{offerTitle}</p>
                  )}
                  {offerSub && <p className="store-hero-banner__float-sub">{offerSub}</p>}
                </div>
              )}
            </div>
          </div>

          {slides.length > 1 && (
            <div className="store-hero-banner__footer">
              <div className="store-hero-banner__dots">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Slide ${i + 1}`}
                    onClick={() => setActive(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === active
                        ? "w-8 bg-primary"
                        : "w-1.5 bg-border hover:bg-muted-foreground"
                    )}
                  />
                ))}
              </div>
              <span className="store-hero-banner__counter">
                {active + 1} / {slides.length}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── Trust badges ─── */
export function TrustBadgesSection({ config }: SectionProps) {
  const badges = (config.badges as Array<{
    icon?: string;
    title?: string;
    label?: string;
    description: string;
  }>) ?? [];

  if (badges.length === 0) return null;

  return (
    <section className="store-trust-strip--end w-full">
      <div className="container-store">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="store-trust-strip"
        >
          {badges.map((badge) => {
            const Icon = BADGE_ICONS[badge.icon ?? ""] ?? Shield;
            const title = badge.title ?? badge.label ?? "";
            return (
              <motion.div key={title} variants={staggerItem} className="store-trust-item">
                <div className="store-trust-item__icon">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold tracking-tight text-foreground md:text-small">
                    {title}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                    {badge.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Flash sale ─── */
export function FlashSaleSection({ config }: SectionProps) {
  const products = (config.products as FlashSaleProduct[]) ?? [];
  const title = (config.title as string) ?? "";
  const subtitle = (config.subtitle as string) ?? "";
  const eyebrow = (config.eyebrow as string) ?? "";
  const endsAt = config.endsAt as string | undefined;
  const ctaLabel = (config.ctaLabel as string) ?? "";
  const ctaHref = (config.ctaHref as string) || "/deals";
  const endsInLabel = (config.endsInLabel as string) ?? "";
  const emptyMessage = (config.emptyMessage as string) ?? "";

  if (!title && products.length === 0) return null;

  return (
    <section className="store-section relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.06),transparent_55%)]" />

      <div className="container-store relative">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          className="mb-10 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-xl">
            {eyebrow && (
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
                {eyebrow}
              </p>
            )}
            <h2 className="store-section-title">{title}</h2>
            {subtitle && <p className="store-section-subtitle">{subtitle}</p>}
          </div>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div>
              {endsInLabel && (
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  {endsInLabel}
                </p>
              )}
              <FlashCountdown endsAt={endsAt} />
            </div>
            {ctaLabel && (
              <Button variant="outline" asChild className="shrink-0">
                <Link href={ctaHref}>
                  {ctaLabel} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </motion.div>

        {products.length > 0 ? (
          <div className={PRODUCT_GRID_CLASS}>
            {products.map((product, i) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportOnce}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                className="w-full"
              >
                <FlashSaleCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : emptyMessage ? (
          <p className="text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : null}
      </div>
    </section>
  );
}

/* ─── Featured products (legacy grid — optional section) ─── */
export function FeaturedProductsSection({ config }: SectionProps) {
  const products = (config.products as Parameters<typeof ProductCard>[0]["product"][]) ?? [];
  const title = (config.title as string) ?? "";
  const viewAllLabel = (config.viewAllLabel as string) ?? "";
  const viewAllHref = (config.viewAllHref as string) || "/products";

  if (!title && products.length === 0) return null;

  return (
    <section className="store-section">
      <div className="container-store">
        <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
          <CmsSectionHeader title={title} viewAllLabel={viewAllLabel} viewAllHref={viewAllHref} />
        </motion.div>

        {products.length > 0 ? (
          <div className={cn(PRODUCT_GRID_CLASS, "lg:gap-6")}>
            {products.map((product, i) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportOnce}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="w-full"
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ─── Shop by category ─── */
export function CategoryShowcaseSection({ config }: SectionProps) {
  const categories = (config.categories as Array<{
    _id: string;
    name: string;
    slug: string;
    image?: string;
  }>) ?? [];

  const title = (config.title as string) ?? "";
  const viewAllLabel = (config.viewAllLabel as string) ?? "";
  const viewAllHref = (config.viewAllHref as string) || "/categories";

  if (categories.length === 0) return null;

  return (
    <section className="store-section">
      <div className="container-store">
        <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
          <CmsSectionHeader title={title} viewAllLabel={viewAllLabel} viewAllHref={viewAllHref} />
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="store-category-row"
        >
          {categories.slice(0, 11).map((cat) => (
            <motion.div key={cat._id} variants={staggerItem} className="shrink-0 sm:shrink">
              <Link href={`/categories/${cat.slug}`} className="store-category-orbit group">
                <div className="store-category-orbit__ring">
                  {cat.image ? (
                    <RemoteImage
                      src={cat.image}
                      alt={cat.name}
                      fill
                      className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                      sizes="120px"
                    />
                  ) : (
                    <span className="text-2xl font-semibold text-muted-foreground">
                      {cat.name.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="store-category-orbit__label group-hover:text-primary">
                  {cat.name}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Promo banner ─── */
export function PromoBannerSection({ config }: SectionProps) {
  const title = config.title as string;
  const subtitle = config.subtitle as string;
  const cta = config.cta as { label: string; href: string } | undefined;
  const eyebrow = (config.eyebrow as string) ?? "";
  const discountLabel = (config.discountLabel as string) ?? "";
  const image = config.image as string | undefined;

  if (!title) return null;

  return (
    <section className="store-section store-section--tight">
      <div className="container-store">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="store-card relative overflow-hidden"
        >
          {image ? (
            <div className="absolute inset-0">
              <Image src={image} alt={title} fill className="object-cover" sizes="100vw" />
              <div className="absolute inset-0 bg-background/82 backdrop-blur-[1px]" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-background to-brand-accent/8" />
          )}

          <div className="relative grid items-center gap-8 p-8 md:grid-cols-[1.2fr_0.8fr] md:p-12 lg:p-14">
            <motion.div variants={slideFromLeft}>
              {eyebrow && <p className="store-section-eyebrow mb-4">{eyebrow}</p>}
              <h2 className="store-section-title max-w-lg">{title}</h2>
              {subtitle && (
                <p className="store-section-subtitle mt-3">{subtitle}</p>
              )}
              {cta && (
                <Button size="lg" className="mt-8 shadow-md shadow-primary/15" asChild>
                  <Link href={cta.href}>
                    {cta.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </motion.div>
            <motion.div variants={slideFromRight} className="hidden md:flex md:justify-end">
              {discountLabel && (
                <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-primary/20 bg-primary/8 lg:h-48 lg:w-48">
                  <span className="text-5xl font-bold tracking-tight text-primary lg:text-6xl">
                    {discountLabel}
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Promo grid (3 sales cards) ─── */
const PROMO_VARIANTS: Record<string, string> = {
  lavender: "store-promo-tile--lavender",
  cream: "store-promo-tile--cream",
  mint: "store-promo-tile--mint",
};

export function PromoGridSection({ config }: SectionProps) {
  const sectionTitle = (config.sectionTitle as string) ?? "";
  const sectionSubtitle = (config.sectionSubtitle as string) ?? "";
  const tiles = (config.tiles as Array<{
    eyebrow?: string;
    title: string;
    subtitle?: string;
    ctaLabel?: string;
    ctaHref?: string;
    image?: string;
    variant?: string;
  }>) ?? [];

  if (tiles.length === 0) return null;

  return (
    <section className="store-section store-section--tight">
      <div className="container-store">
        {(sectionTitle || sectionSubtitle) && (
          <div className="mb-8">
            {sectionTitle && <h2 className="store-section-title">{sectionTitle}</h2>}
            {sectionSubtitle && (
              <p className="store-section-subtitle mt-2">{sectionSubtitle}</p>
            )}
          </div>
        )}
        <div className="store-promo-grid">
          {tiles.map((tile, i) => (
            <motion.div
              key={`${tile.title}-${i}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.35, delay: i * 0.06 }}
            >
              <Link
                href={tile.ctaHref || "/products"}
                className={cn(
                  "store-promo-tile group block transition-transform hover:-translate-y-1",
                  PROMO_VARIANTS[tile.variant ?? "lavender"] ?? PROMO_VARIANTS.lavender
                )}
              >
                <div className="relative z-10 max-w-[65%]">
                  {tile.eyebrow && (
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {tile.eyebrow}
                    </p>
                  )}
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground md:text-2xl">
                    {tile.title}
                  </h3>
                  {tile.subtitle && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {tile.subtitle}
                    </p>
                  )}
                  {tile.ctaLabel && (
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      {tile.ctaLabel}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  )}
                </div>
                {tile.image && (
                  <div className="store-promo-tile__image">
                    <Image
                      src={tile.image}
                      alt={tile.title}
                      fill
                      className="object-contain"
                      sizes="140px"
                    />
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Product slider (best sellers / new arrivals) ─── */
export function ProductSliderSection({ config }: SectionProps) {
  const products = (config.products as Parameters<typeof ProductSliderCard>[0]["product"][]) ?? [];
  const title = (config.title as string) ?? "";
  const viewAllLabel = (config.viewAllLabel as string) ?? "";
  const viewAllHref = (config.viewAllHref as string) || "/products";
  const showNewBadge = Boolean(config.showNewBadge);
  const emptyMessage = (config.emptyMessage as string) ?? "";

  if (!title && products.length === 0) return null;

  return (
    <section className="store-section store-section--tight">
      <div className="container-store">
        <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
          <CmsSectionHeader
            title={title}
            viewAllLabel={viewAllLabel}
            viewAllHref={viewAllHref}
          />
        </motion.div>

        {products.length > 0 ? (
          <ProductCarousel>
            {products.map((product) => (
              <ProductSliderCard
                key={product._id}
                product={product}
                showNewBadge={showNewBadge}
              />
            ))}
          </ProductCarousel>
        ) : emptyMessage ? (
          <p className="text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : null}
      </div>
    </section>
  );
}

/* ─── Brand strip ─── */
export function BrandStripSection({ config }: SectionProps) {
  const title = (config.title as string) ?? "";
  const brands = (config.brands as Array<{
    _id: string;
    name: string;
    slug: string;
    logo?: string;
  }>) ?? [];

  if (!title || brands.length === 0) return null;

  return (
    <section className="store-section store-section--muted store-section--tight">
      <div className="container-store">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          className="store-brand-strip"
        >
          <h2 className="store-section-title">{title}</h2>
          <div className="store-brand-strip__logos">
            {brands.map((brand) => (
              <Link
                key={brand._id}
                href={`/products?brand=${encodeURIComponent(brand.slug)}`}
                className="store-brand-logo"
                title={brand.name}
              >
                {brand.logo ? (
                  <Image
                    src={brand.logo}
                    alt={brand.name}
                    width={100}
                    height={32}
                    className="h-7 w-auto max-w-[6rem] object-contain"
                  />
                ) : (
                  <span className="text-sm font-semibold text-foreground">{brand.name}</span>
                )}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Value proposition ─── */
export function ValuePropositionSection({ config }: SectionProps) {
  const eyebrow = (config.eyebrow as string) ?? "";
  const title = (config.title as string) ?? "";
  const subtitle = (config.subtitle as string) ?? "";
  const items = (config.items as Array<{ title: string; description: string }>) ?? [];

  if (!title && items.length === 0) return null;

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
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="store-value-grid"
        >
          {items.map((item) => (
            <motion.div key={item.title} variants={staggerItem} className="store-value-card">
              <h3 className="store-value-card__title">{item.title}</h3>
              <p className="store-value-card__text">{item.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Newsletter ─── */
export function NewsletterSection({ config }: SectionProps) {
  const title = (config.title as string) ?? "";
  const subtitle = (config.subtitle as string) ?? "";
  const emailPlaceholder = (config.emailPlaceholder as string) ?? "";
  const buttonLabel = (config.buttonLabel as string) ?? "";
  const privacyNote = (config.privacyNote as string) ?? "";

  return (
    <section className="store-section store-section--tight pb-20 md:pb-28">
      <div className="container-store">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={scaleIn}
          className="store-newsletter p-8 md:p-12"
        >
          <div className="relative mx-auto max-w-xl text-center">
            <h2 className="store-section-title">{title}</h2>
            {subtitle && <p className="store-section-subtitle mx-auto mt-3">{subtitle}</p>}
            <form
              className="mt-8 flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => e.preventDefault()}
            >
              <Input
                type="email"
                placeholder={emailPlaceholder}
                className="h-12 flex-1 rounded-full bg-background px-5"
                aria-label={emailPlaceholder}
              />
              <Button type="submit" size="lg" className="shrink-0 rounded-full px-8">
                {buttonLabel}
              </Button>
            </form>
            <p className="mt-4 text-[12px] text-muted-foreground">{privacyNote}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
