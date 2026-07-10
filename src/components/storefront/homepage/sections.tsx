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
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { cn } from "@/components/ds/utils";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import {
  FlashSaleCard,
  FlashCountdown,
  type FlashSaleProduct,
} from "@/components/storefront/homepage/FlashSaleCard";
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

/* ─── Hero (retail promo banner — theme aware) ─── */
export function HeroSliderSection({ config }: SectionProps) {
  const t = useTranslations("home");
  const heroBadge = (config.heroBadge as string) || t("heroBadge");
  const exploreNewLabel = (config.exploreNewLabel as string) || t("exploreNew");
  const exploreNewHref = (config.exploreNewHref as string) || "/new-arrivals";
  const slides = (config.slides as Array<{
    title: string;
    subtitle: string;
    image: string;
    cta?: { label: string; href: string };
  }>) ?? [];

  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[active];
  const go = (dir: -1 | 1) =>
    setActive((i) => (i + dir + slides.length) % slides.length);

  return (
    <section className="w-full border-b border-border bg-background">
      {/* Retail promo strip — shorter than a landing hero */}
      <div className="relative overflow-hidden bg-secondary">
        <div className="container-store relative">
          <div className="grid min-h-[340px] md:min-h-[400px] lg:min-h-[440px] lg:grid-cols-12">
            {/* Copy panel — solid theme surface */}
            <div className="relative z-10 flex flex-col justify-center py-10 md:py-12 lg:col-span-5 lg:py-14">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="max-w-md"
                >
                  {heroBadge && (
                    <span className="mb-4 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                      <Sparkles className="h-3 w-3" />
                      {heroBadge}
                    </span>
                  )}
                  <h1 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.1] tracking-tight text-foreground">
                    {slide.title}
                  </h1>
                  {slide.subtitle && (
                    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground md:text-base">
                      {slide.subtitle}
                    </p>
                  )}
                  <div className="mt-7 flex flex-wrap gap-3">
                    {slide.cta?.label && (
                      <Button size="lg" asChild>
                        <Link href={slide.cta.href || "/products"}>
                          {slide.cta.label}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button size="lg" variant="outline" asChild>
                      <Link href={exploreNewHref}>{exploreNewLabel}</Link>
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>

              {slides.length > 1 && (
                <div className="mt-8 flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Slide ${i + 1}`}
                        onClick={() => setActive(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === active
                            ? "w-7 bg-primary"
                            : "w-1.5 bg-border hover:bg-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="hidden items-center gap-1 sm:flex">
                    <button
                      type="button"
                      aria-label="Previous slide"
                      onClick={() => go(-1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-secondary"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next slide"
                      onClick={() => go(1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-secondary"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Product visual — edge image, no dark wash */}
            <div className="relative -mx-4 min-h-[240px] sm:-mx-6 md:mx-0 md:min-h-[320px] lg:col-span-7 lg:min-h-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.image || active}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 lg:left-6"
                >
                  {slide.image ? (
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      fill
                      priority
                      className="object-cover object-center lg:rounded-l-[var(--radius-lg)]"
                      sizes="(max-width:1024px) 100vw, 58vw"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-muted lg:rounded-l-[var(--radius-lg)]" />
                  )}
                </motion.div>
              </AnimatePresence>
              {/* Soft fade only on mobile where text stacks above image */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-secondary to-transparent lg:hidden" />
            </div>
          </div>
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
    <section className="relative overflow-hidden border-b border-border bg-background py-8 md:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.08),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.14),transparent_55%)]" />

      <div className="container-store relative">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
        >
          {badges.map((badge) => {
            const Icon = BADGE_ICONS[badge.icon ?? ""] ?? Shield;
            const title = badge.title ?? badge.label ?? "";
            return (
              <motion.div
                key={title}
                variants={staggerItem}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-[var(--shadow-subtle)] transition-shadow duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-card)] md:p-5"
              >
                <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/15 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold tracking-tight text-foreground md:text-small">
                      {title}
                    </p>
                    <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                      {badge.description}
                    </p>
                  </div>
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
  const t = useTranslations("home");
  const products = (config.products as FlashSaleProduct[]) ?? [];
  const title = (config.title as string) || t("flashSale");
  const subtitle = (config.subtitle as string) || t("flashSaleSubtitle");
  const eyebrow = (config.eyebrow as string) || "Limited time";
  const endsAt = config.endsAt as string | undefined;
  const ctaLabel = (config.ctaLabel as string) || t("flashSaleCta");
  const ctaHref = (config.ctaHref as string) || "/deals";

  if (products.length === 0) return null;

  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute -left-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-amber-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-orange-600/10 blur-[80px]" />

      <div className="container-store relative">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          className="mb-10 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-xl">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-400">
              <Zap className="h-3 w-3 fill-current" />
              {eyebrow}
            </p>
            <h2 className="text-[clamp(1.85rem,3.5vw,2.5rem)] font-bold tracking-tight text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-body text-muted-foreground">{subtitle}</p>
            )}
          </div>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                {t("endsIn")}
              </p>
              <FlashCountdown endsAt={endsAt} />
            </div>
            <Button
              variant="outline"
              asChild
              className="shrink-0 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
            >
              <Link href={ctaHref}>
                {ctaLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>

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
      </div>
    </section>
  );
}

/* ─── Featured products ─── */
export function FeaturedProductsSection({ config }: SectionProps) {
  const t = useTranslations("home");
  const products = (config.products as Parameters<typeof ProductCard>[0]["product"][]) ?? [];
  const title = (config.title as string) ?? t("featuredProducts");
  const subtitle = (config.subtitle as string) ?? t("featuredSubtitle");
  const viewAllLabel = (config.viewAllLabel as string) || t("viewAll");

  return (
    <section className="py-16 md:py-24">
      <div className="container-store">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end md:mb-12"
        >
          <div>
            <h2 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold tracking-tight text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 max-w-lg text-body text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link href="/products">
              {viewAllLabel} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>

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
      </div>
    </section>
  );
}

/* ─── Categories bento grid ─── */
export function CategoryShowcaseSection({ config }: SectionProps) {
  const t = useTranslations("home");
  const categories = (config.categories as Array<{
    _id: string;
    name: string;
    slug: string;
    image?: string;
  }>) ?? [];

  const title = (config.title as string) ?? t("shopByCategory");
  const subtitle = config.subtitle as string | undefined;

  if (categories.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-secondary/40 py-16 md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(79,70,229,0.08),transparent_50%)]" />
      <div className="container-store relative">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          className="mb-10 text-center md:mb-12"
        >
          <h2 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto mt-2 max-w-lg text-body text-muted-foreground">{subtitle}</p>
          )}
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
        >
          {categories.slice(0, 4).map((cat, i) => (
            <motion.div
              key={cat._id}
              variants={staggerItem}
              className={i === 0 ? "col-span-2 row-span-2 md:col-span-2 md:row-span-2" : ""}
            >
              <Link
                href={`/categories/${cat.slug}`}
                className="group relative block h-full overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-card shadow-[var(--shadow-subtle)] transition-shadow hover:shadow-[var(--shadow-card)]"
              >
                <div
                  className={`relative bg-secondary ${
                    i === 0 ? "aspect-[4/3] md:aspect-auto md:min-h-[340px]" : "aspect-square"
                  }`}
                >
                  {cat.image ? (
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                      sizes={i === 0 ? "50vw" : "25vw"}
                    />
                  ) : (
                    <div className="flex h-full min-h-[120px] items-center justify-center text-muted-foreground">
                      {cat.name.charAt(0)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent opacity-90" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                    <p
                      className={`font-semibold text-foreground ${
                        i === 0 ? "text-lg md:text-2xl" : "text-small"
                      }`}
                    >
                      {cat.name}
                    </p>
                    <span className="mt-1.5 inline-flex translate-y-1 items-center gap-1 text-[12px] text-primary opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                      Shop now <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
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
  const eyebrow = (config.eyebrow as string) || "Limited offer";
  const discountLabel = (config.discountLabel as string) || "40%";
  const image = config.image as string | undefined;

  if (!title) return null;

  return (
    <section className="py-16 md:py-20">
      <div className="container-store">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border/70 shadow-[var(--shadow-card)]"
        >
          {image ? (
            <div className="absolute inset-0">
              <Image src={image} alt={title} fill className="object-cover" sizes="100vw" />
              <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-background to-brand-accent/15" />
          )}
          <div className="pointer-events-none absolute -right-10 top-0 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid items-center gap-8 p-8 md:grid-cols-2 md:p-12 lg:p-16">
            <motion.div variants={slideFromLeft}>
              <p className="text-small font-medium uppercase tracking-widest text-primary">
                {eyebrow}
              </p>
              <h2 className="mt-3 text-[clamp(1.5rem,3vw,2.35rem)] font-bold leading-tight text-foreground">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-3 max-w-md text-body text-muted-foreground">{subtitle}</p>
              )}
              {cta && (
                <Button size="lg" className="mt-8 shadow-lg shadow-primary/20" asChild>
                  <Link href={cta.href}>
                    {cta.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </motion.div>
            <motion.div variants={slideFromRight} className="hidden md:flex md:justify-end">
              <div className="relative flex h-44 w-44 items-center justify-center lg:h-52 lg:w-52">
                <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl" />
                <div className="relative flex h-full w-full items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-5xl font-bold text-primary ring-4 ring-primary/10 lg:text-6xl">
                  {discountLabel}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Newsletter ─── */
export function NewsletterSection({ config }: SectionProps) {
  const t = useTranslations("home");
  const title = (config.title as string) ?? t("newsletterTitle");
  const subtitle = (config.subtitle as string) ?? t("newsletterSubtitle");
  const emailPlaceholder = (config.emailPlaceholder as string) || t("emailPlaceholder");
  const buttonLabel = (config.buttonLabel as string) ?? t("subscribe");
  const privacyNote = (config.privacyNote as string) || t("newsletterPrivacy");

  return (
    <section className="pb-16 md:pb-24">
      <div className="container-store">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={scaleIn}
          className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-card p-8 shadow-[var(--shadow-card)] md:p-12"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-brand-accent/10 blur-3xl" />
          <div className="relative mx-auto max-w-xl text-center">
            <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-bold text-foreground">{title}</h2>
            {subtitle && (
              <p className="mt-3 text-body text-muted-foreground">{subtitle}</p>
            )}
            <form
              className="mt-8 flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => e.preventDefault()}
            >
              <Input
                type="email"
                placeholder={emailPlaceholder}
                className="h-12 flex-1 bg-background"
              />
              <Button type="submit" size="lg" className="shrink-0 shadow-md shadow-primary/20">
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
