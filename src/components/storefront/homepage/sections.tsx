"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Truck,
  Shield,
  RefreshCw,
  Headphones,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import {
  fadeUp,
  staggerContainer,
  staggerItem,
  viewportOnce,
  scaleIn,
  slideFromLeft,
  slideFromRight,
} from "@/components/storefront/homepage/motion";

interface SectionProps {
  config: Record<string, unknown>;
}

const BADGE_ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  shield: Shield,
  refresh: RefreshCw,
  headphones: Headphones,
};

const DEFAULT_HERO_STATS = [
  { value: "10K+", label: "Happy Customers" },
  { value: "500+", label: "Premium Products" },
  { value: "4.9", label: "Average Rating" },
];

/* ─── Hero ─── */
export function HeroSliderSection({ config }: SectionProps) {
  const t = useTranslations("home");
  const heroBadge = (config.heroBadge as string) || t("heroBadge");
  const exploreNewLabel = (config.exploreNewLabel as string) || t("exploreNew");
  const stats =
    (config.stats as Array<{ value: string; label: string }> | undefined)?.length
      ? (config.stats as Array<{ value: string; label: string }>)
      : DEFAULT_HERO_STATS;
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
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[active];

  return (
    <section className="relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-brand-accent/10 blur-[100px]" />
      </div>

      <div className="container-store relative py-10 md:py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div className="order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/80 px-3 py-1 text-[12px] font-medium text-muted-foreground backdrop-blur-sm"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              {heroBadge}
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-tight text-foreground">
                  {slide.title}
                </h1>
                <p className="mt-4 max-w-md text-body text-muted-foreground md:text-lg">
                  {slide.subtitle}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {slide.cta && (
                    <Button size="lg" asChild>
                      <Link href={slide.cta.href}>
                        {slide.cta.label}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/products?sort=new">{exploreNewLabel}</Link>
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slide dots */}
            {slides.length > 1 && (
              <div className="mt-10 flex items-center gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Slide ${i + 1}`}
                    onClick={() => setActive(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === active ? "w-8 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Stats */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="mt-12 grid grid-cols-3 gap-4 border-t border-border pt-8"
            >
              {stats.map((stat) => (
                <motion.div key={stat.label} variants={staggerItem}>
                  <p className="text-xl font-bold text-foreground md:text-2xl">{stat.value}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="order-1 lg:order-2"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-secondary shadow-[var(--shadow-card)] sm:aspect-[5/6] lg:aspect-square">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.image}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width:1024px) 100vw, 50vw"
                  />
                </motion.div>
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            </div>
          </motion.div>
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
    <section className="border-y border-border bg-secondary/40">
      <div className="container-store py-8 md:py-10">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8"
        >
          {badges.map((badge) => {
            const Icon = BADGE_ICONS[badge.icon ?? ""] ?? Shield;
            const title = badge.title ?? badge.label ?? "";
            return (
              <motion.div
                key={title}
                variants={staggerItem}
                className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left md:gap-3"
              >
                <div className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 text-primary md:mb-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-small font-semibold text-foreground">{title}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{badge.description}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
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

        {/* Mobile: horizontal scroll */}
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4 lg:gap-6">
          {products.map((product, i) => (
            <motion.div
              key={product._id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="w-[72vw] shrink-0 sm:w-[280px] md:w-auto"
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
    <section className="bg-secondary/30 py-16 md:py-24">
      <div className="container-store">
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
            <p className="mt-2 text-body text-muted-foreground">{subtitle}</p>
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
                className="group relative block h-full overflow-hidden rounded-[var(--radius-md)] border border-border bg-card"
              >
                <div
                  className={`relative bg-secondary ${
                    i === 0 ? "aspect-[4/3] md:aspect-auto md:min-h-[320px]" : "aspect-square"
                  }`}
                >
                  {cat.image ? (
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      sizes={i === 0 ? "50vw" : "25vw"}
                    />
                  ) : (
                    <div className="flex h-full min-h-[120px] items-center justify-center text-muted-foreground">
                      {cat.name.charAt(0)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                    <p className={`font-semibold text-foreground ${i === 0 ? "text-lg md:text-xl" : "text-small"}`}>
                      {cat.name}
                    </p>
                    <span className="mt-1 inline-flex items-center gap-1 text-[12px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
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
          className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border"
        >
          {image ? (
            <div className="absolute inset-0">
              <Image src={image} alt={title} fill className="object-cover" sizes="100vw" />
              <div className="absolute inset-0 bg-background/75" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-brand-accent/10" />
          )}
          <div className="relative grid items-center gap-8 p-8 md:grid-cols-2 md:p-12 lg:p-16">
            <motion.div variants={slideFromLeft}>
              <p className="text-small font-medium uppercase tracking-widest text-primary">{eyebrow}</p>
              <h2 className="mt-3 text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-tight text-foreground">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-3 text-body text-muted-foreground">{subtitle}</p>
              )}
              {cta && (
                <Button size="lg" className="mt-8" asChild>
                  <Link href={cta.href}>
                    {cta.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </motion.div>
            <motion.div variants={slideFromRight} className="hidden md:flex md:justify-end">
              <div className="flex h-40 w-40 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-5xl font-bold text-primary lg:h-48 lg:w-48 lg:text-6xl">
                {discountLabel}
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
          className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card p-8 md:p-12"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
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
              <Button type="submit" size="lg" className="shrink-0">
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
