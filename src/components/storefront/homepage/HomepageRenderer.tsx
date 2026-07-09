"use client";

import { motion } from "framer-motion";
import {
  HeroSliderSection,
  FeaturedProductsSection,
  CategoryShowcaseSection,
  PromoBannerSection,
  TrustBadgesSection,
  NewsletterSection,
  FlashSaleSection,
} from "./sections";

interface Section {
  _id: string;
  type: string;
  config: Record<string, unknown>;
}

const SECTION_MAP: Record<
  string,
  React.ComponentType<{ config: Record<string, unknown> }>
> = {
  hero_slider: HeroSliderSection,
  featured_products: FeaturedProductsSection,
  category_showcase: CategoryShowcaseSection,
  promo_banner: PromoBannerSection,
  trust_badges: TrustBadgesSection,
  newsletter: NewsletterSection,
  flash_sale: FlashSaleSection,
};

export function HomepageRenderer({ sections }: { sections: Section[] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {sections.map((section, index) => {
        const Component = SECTION_MAP[section.type];
        if (!Component) return null;
        return (
          <motion.div
            key={section._id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Component config={section.config} />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
