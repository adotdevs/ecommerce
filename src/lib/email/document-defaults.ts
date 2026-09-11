/**
 * Factory functions for creating default EmailDocument blocks and documents.
 */

import type {
  EmailDocument,
  EmailSection,
  GlobalStyles,
  SectionSettings,
  TextBlockContent,
  ButtonBlockContent,
  ImageBlockContent,
  ProductBlockContent,
  HeroBlockContent,
  SpacerBlockContent,
  DividerBlockContent,
  CouponBlockContent,
  BannerBlockContent,
  FooterBlockContent,
  ColumnsBlockContent,
  ProductGridBlockContent,
  ProductGridItem,
  CountdownBlockContent,
  SocialLinksBlockContent,
  TestimonialBlockContent,
  BlockType,
  ProductLayout,
  ColumnSplit,
} from "./document-schema";

let _idCounter = 0;
export function generateBlockId(): string {
  _idCounter += 1;
  return `blk_${Date.now().toString(36)}_${_idCounter.toString(36)}`;
}

// ─── Default Global Styles ───────────────────────────────────────────────────

export function defaultGlobalStyles(): GlobalStyles {
  return {
    backgroundColor: "#f3f4f6",
    contentWidth: 600,
    contentBackground: "#ffffff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    textColor: "#374151",
    linkColor: "#4f46e5",
    buttonColor: "#4f46e5",
    buttonTextColor: "#ffffff",
    buttonRadius: 8,
    headingColor: "#111827",
    sectionSpacing: 0,
    borderRadius: 12,
  };
}

// ─── Default Section Settings ────────────────────────────────────────────────

export function defaultSectionSettings(overrides?: Partial<SectionSettings>): SectionSettings {
  return {
    paddingTop: 16,
    paddingRight: 24,
    paddingBottom: 16,
    paddingLeft: 24,
    alignment: "left",
    visible: true,
    ...overrides,
  };
}

// ─── Block Factories ─────────────────────────────────────────────────────────

function makeSection(type: BlockType, content: unknown, settingsOverrides?: Partial<SectionSettings>): EmailSection {
  return {
    id: generateBlockId(),
    type,
    visible: true,
    settings: defaultSectionSettings(settingsOverrides),
    content: content as EmailSection["content"],
  };
}

export function createTextBlock(overrides?: Partial<TextBlockContent>): EmailSection {
  const content: TextBlockContent = {
    text: "",
    headingLevel: "p",
    fontSize: 15,
    fontWeight: 400,
    lineHeight: 1.6,
    textAlign: "left",
    ...overrides,
  };
  return makeSection("text", content);
}

export function createButtonBlock(overrides?: Partial<ButtonBlockContent>): EmailSection {
  const content: ButtonBlockContent = {
    text: "Shop Now",
    url: "/products",
    alignment: "center",
    width: "auto",
    paddingVertical: 14,
    paddingHorizontal: 28,
    fontSize: 15,
    fontWeight: 600,
    linkType: "CTA_BUTTON",
    ...overrides,
  };
  return makeSection("button", content, { paddingTop: 12, paddingBottom: 12 });
}

export function createImageBlock(overrides?: Partial<ImageBlockContent>): EmailSection {
  const content: ImageBlockContent = {
    src: "",
    alt: "",
    width: "full",
    alignment: "center",
    borderRadius: 8,
    ...overrides,
  };
  return makeSection("image", content, { paddingTop: 8, paddingBottom: 8 });
}

export function createProductBlock(
  productId: string,
  snapshot: ProductBlockContent["productSnapshot"],
  layout: ProductLayout = "image-top",
  overrides?: Partial<ProductBlockContent>
): EmailSection {
  const content: ProductBlockContent = {
    productId,
    productSnapshot: snapshot,
    layout,
    showImage: true,
    showTitle: true,
    showDescription: true,
    showPrice: true,
    showSalePrice: true,
    showDiscount: true,
    showCta: true,
    ctaText: "Shop Now",
    rating: 5,
    reviewsCount: 142,
    badgeText: snapshot.salePrice ? "LIMITED DEAL" : "FEATURED",
    stockStatus: "In Stock • Ships in 24h",
    aspectRatio: "square",
    ...overrides,
  };
  return makeSection("product", content, { paddingTop: 12, paddingBottom: 12 });
}

export function createProductGridBlock(overrides?: Partial<ProductGridBlockContent>): EmailSection {
  const defaultItems: ProductGridItem[] = [
    {
      id: "grid_1",
      productId: "prod_1",
      name: "Signature Minimal Sneaker",
      slug: "signature-minimal-sneaker",
      price: 4999,
      salePrice: 3499,
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
      currency: "Rs",
      badge: "30% OFF",
    },
    {
      id: "grid_2",
      productId: "prod_2",
      name: "Urban Weekender Duffel",
      slug: "urban-weekender-duffel",
      price: 3299,
      salePrice: 2699,
      image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
      currency: "Rs",
      badge: "POPULAR",
    },
    {
      id: "grid_3",
      productId: "prod_3",
      name: "Classic Chrono Watch",
      slug: "classic-chrono-watch",
      price: 6499,
      salePrice: 5199,
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
      currency: "Rs",
      badge: "TOP RATED",
    },
  ];

  const content: ProductGridBlockContent = {
    title: "Curated Recommendations",
    subtitle: "Handpicked deals trending this week",
    columns: 3,
    items: defaultItems,
    showPrices: true,
    showSalePrices: true,
    showBadges: true,
    ctaText: "Shop Now",
    cardBackground: "#ffffff",
    cardBorderColor: "#e5e7eb",
    cardBorderRadius: 12,
    ...overrides,
  };
  return makeSection("product-grid", content, { paddingTop: 16, paddingBottom: 16 });
}

export function createCountdownBlock(overrides?: Partial<CountdownBlockContent>): EmailSection {
  const content: CountdownBlockContent = {
    title: "FLASH SALE ENDS SOON",
    subtitle: "Prices increase once timer expires. Don't miss out!",
    hoursRemaining: 14,
    minutesRemaining: 32,
    secondsRemaining: 45,
    badgeText: "⚡ LIMITED TIME OFFER",
    ctaText: "Unlock Flash Savings",
    ctaUrl: "/products",
    backgroundColor: "#111827",
    textColor: "#ffffff",
    accentColor: "#fbbf24",
    boxBackground: "#1f2937",
    ...overrides,
  };
  return makeSection("countdown", content, { paddingTop: 20, paddingBottom: 20 });
}

export function createSocialLinksBlock(overrides?: Partial<SocialLinksBlockContent>): EmailSection {
  const content: SocialLinksBlockContent = {
    title: "Stay Connected With Us",
    alignment: "center",
    iconStyle: "circle",
    iconColor: "#4f46e5",
    backgroundColor: "transparent",
    links: [
      { platform: "instagram", url: "https://instagram.com", label: "Instagram" },
      { platform: "facebook", url: "https://facebook.com", label: "Facebook" },
      { platform: "twitter", url: "https://x.com", label: "Twitter" },
      { platform: "tiktok", url: "https://tiktok.com", label: "TikTok" },
      { platform: "whatsapp", url: "https://whatsapp.com", label: "WhatsApp" },
    ],
    ...overrides,
  };
  return makeSection("social-links", content, { paddingTop: 16, paddingBottom: 16 });
}

export function createTestimonialBlock(overrides?: Partial<TestimonialBlockContent>): EmailSection {
  const content: TestimonialBlockContent = {
    quote: "“The quality and finish exceeded my highest expectations. Arrived in 2 days and the customer care was stellar!”",
    authorName: "Sarah Jenkins",
    authorTitle: "Verified Buyer • VIP Club",
    authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    verifiedCustomer: true,
    cardBackground: "#f8fafc",
    cardBorderColor: "#e2e8f0",
    textColor: "#1e293b",
    starColor: "#f59e0b",
    ...overrides,
  };
  return makeSection("testimonial", content, { paddingTop: 16, paddingBottom: 16 });
}


export function createHeroBlock(overrides?: Partial<HeroBlockContent>): EmailSection {
  const content: HeroBlockContent = {
    title: "",
    alignment: "center",
    titleSize: 28,
    subtitleSize: 16,
    minHeight: 200,
    ...overrides,
  };
  return makeSection("hero", content, { paddingTop: 32, paddingBottom: 32 });
}

export function createSpacerBlock(height: number = 24): EmailSection {
  const content: SpacerBlockContent = { height };
  return makeSection("spacer", content, { paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 });
}

export function createDividerBlock(overrides?: Partial<DividerBlockContent>): EmailSection {
  const content: DividerBlockContent = {
    thickness: 1,
    style: "solid",
    color: "#e5e7eb",
    width: "full",
    spacing: 16,
    ...overrides,
  };
  return makeSection("divider", content, { paddingTop: 8, paddingBottom: 8 });
}

export function createCouponBlock(overrides?: Partial<CouponBlockContent>): EmailSection {
  const content: CouponBlockContent = {
    title: "Special Offer",
    code: "SAVE20",
    description: "",
    ctaText: "Shop Now",
    ctaUrl: "/products",
    ...overrides,
  };
  return makeSection("coupon", content, { paddingTop: 12, paddingBottom: 12 });
}

export function createBannerBlock(overrides?: Partial<BannerBlockContent>): EmailSection {
  const content: BannerBlockContent = {
    text: "",
    fontSize: 14,
    fontWeight: 600,
    ...overrides,
  };
  return makeSection("banner", content, { paddingTop: 12, paddingBottom: 12 });
}

export function createFooterBlock(overrides?: Partial<FooterBlockContent>): EmailSection {
  const content: FooterBlockContent = {
    companyName: "Findora",
    showUnsubscribe: true,
    ...overrides,
  };
  return makeSection("footer", content, { paddingTop: 24, paddingBottom: 24 });
}

export function createColumnsBlock(
  split: ColumnSplit = "50/50",
  overrides?: Partial<ColumnsBlockContent>
): EmailSection {
  const columnCount = split === "33/33/33" ? 3 : 2;
  const content: ColumnsBlockContent = {
    split,
    columns: Array.from({ length: columnCount }, () => ({ blocks: [] })),
    stackOnMobile: true,
    gap: 16,
    ...overrides,
  };
  return makeSection("columns", content, { paddingTop: 8, paddingBottom: 8 });
}

// ─── Default Document ────────────────────────────────────────────────────────

export function createDefaultEmailDocument(subject: string = ""): EmailDocument {
  return {
    version: 1,
    subject: subject !== undefined ? subject : "Exciting news inside: Our new collection has dropped!",
    previewText: "Discover handpicked styles with exclusive limited-time member savings.",
    globalStyles: defaultGlobalStyles(),
    sections: [
      createBannerBlock({
        text: "⚡ FLASH SALE: Free Shipping on Orders Over Rs 2,500 ⚡",
        backgroundColor: "#4f46e5",
        textColor: "#ffffff",
      }),
      createHeroBlock({
        title: "The New Season Essentials",
        subtitle: "Handcrafted Luxury Designed For Everyday Comfort",
        paragraph: "Hello {{firstName}}, explore our latest curated releases crafted with precision and attention to detail.",
        ctaText: "Shop The Collection",
        ctaUrl: "/products",
        backgroundColor: "#0f172a",
        titleColor: "#ffffff",
        subtitleColor: "#93c5fd",
        paragraphColor: "#cbd5e1",
      }),
      createCountdownBlock({
        title: "24-HOUR VIP CLEARANCE",
        subtitle: "Use code VIP25 at checkout before the countdown reaches zero.",
        hoursRemaining: 18,
        minutesRemaining: 45,
        secondsRemaining: 0,
      }),
      createProductGridBlock({
        title: "Trending Masterpieces",
        subtitle: "Top-rated items loved by over 5,000 customers",
      }),
      createCouponBlock({
        title: "Exclusive Member Perk",
        code: "VIP25",
        description: "Get 25% off storewide on all orders placed today.",
        ctaText: "Claim 25% Off",
        ctaUrl: "/products",
      }),
      createTestimonialBlock(),
      createSocialLinksBlock(),
      createFooterBlock(),
    ],
  };
}

// ─── Simple Email Document Factory ──────────────────────────────────────────

export function createSimpleEmailDocument(
  subject: string,
  bodyText: string,
  options: {
    previewText?: string;
    buttonText?: string;
    buttonUrl?: string;
    signOff?: string;
  } = {}
): EmailDocument {
  const sections: EmailSection[] = [
    createTextBlock({
      text: bodyText || "Hi {{firstName}},\n\nWe wanted to share an update with you.",
      fontSize: 16,
      lineHeight: 1.7,
      textColor: "#1f2937",
    }),
  ];

  if (options.buttonText && options.buttonUrl) {
    sections.push(
      createButtonBlock({
        text: options.buttonText,
        url: options.buttonUrl,
        alignment: "left",
        fontSize: 15,
        fontWeight: 600,
      })
    );
  }

  if (options.signOff) {
    sections.push(
      createTextBlock({
        text: options.signOff,
        fontSize: 14,
        lineHeight: 1.6,
        textColor: "#4b5563",
      })
    );
  }

  sections.push(
    createFooterBlock({
      showUnsubscribe: true,
      text: "You are receiving this email because you opted in on our store.",
    })
  );

  return {
    version: 1,
    subject: subject || "Personal note from the team",
    previewText: options.previewText || "",
    globalStyles: {
      backgroundColor: "#f9fafb",
      contentWidth: 560,
      contentBackground: "#ffffff",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      textColor: "#1f2937",
      linkColor: "#4f46e5",
      buttonColor: "#111827",
      buttonTextColor: "#ffffff",
      buttonRadius: 6,
      headingColor: "#111827",
      sectionSpacing: 0,
      borderRadius: 8,
    },
    sections,
  };
}

export interface StarterSimpleTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  previewText?: string;
  bodyText: string;
  buttonText?: string;
  buttonUrl?: string;
  signOff?: string;
  category: "welcome" | "personal_offer" | "feedback" | "announcement";
  iconName: string;
}

export const STARTER_SIMPLE_TEMPLATES: StarterSimpleTemplate[] = [
  {
    id: "founder_welcome",
    name: "Founder Welcome & Personal Story",
    description: "Heartfelt, high-open-rate personal founder introduction letter.",
    category: "welcome",
    iconName: "Heart",
    subject: "A personal note from our founder",
    previewText: "Why we started this brand and a small welcome gift for you.",
    bodyText: `Hi {{firstName}},

I wanted to personally reach out and welcome you to {{storeName}}.

When we started this journey, our goal was simple: to craft timeless, premium products that don't cut corners on quality or integrity. Every piece in our catalog is something we've personally tested, refined, and stand behind 100%.

As a token of appreciation for joining us, please enjoy a special welcome discount on your first order. Use code **WELCOME10** at checkout.

If you ever have feedback, questions, or just want to tell us how your experience was, simply reply directly to this email. I read every message.`,
    buttonText: "Explore Our Best Sellers",
    buttonUrl: "/products",
    signOff: "Warm regards,\nThe Founder & Team\n{{storeName}}",
  },
  {
    id: "vip_exclusive_invite",
    name: "VIP Private Access Invitation",
    description: "Exclusive tone offering early access or members-only pricing.",
    category: "personal_offer",
    iconName: "Sparkles",
    subject: "Private Invitation: Early access for {{firstName}}",
    previewText: "Your private access pass to our private vault release.",
    bodyText: `Hello {{firstName}},

Because you've been one of our valued subscribers, we're opening up our private archive release 24 hours before it goes public.

Inventory on this curated drop is strictly limited, and once pieces are claimed they won't be restocked this season.

Use your VIP privilege link below to access the private showcase before the general announcement tomorrow.`,
    buttonText: "Access VIP Vault →",
    buttonUrl: "/products",
    signOff: "Best,\nClient Experience Team\n{{storeName}}",
  },
  {
    id: "simple_announcement",
    name: "Clean Store Update & Announcement",
    description: "Direct, scannable text notification for new arrivals or updates.",
    category: "announcement",
    iconName: "FileText",
    subject: "Quick update: Exciting changes at {{storeName}}",
    previewText: "Here is what we've been working on this week.",
    bodyText: `Hey {{firstName}},

Quick update from the workshop today. We just restocked our most popular items and added fresh new colorways that you requested.

Here are the highlights:
• Restocked best-selling sizes across all key collections
• New express shipping options for faster delivery
• Extended 30-day effortless return policy

Take a look around and see what catches your eye.`,
    buttonText: "Check What's New",
    buttonUrl: "/products",
    signOff: "Cheers,\nThe {{storeName}} Team",
  },
];

// ─── Pre-built Designer Templates ──────────────────────────────────────────

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  category: "sale" | "luxury" | "catalog" | "retention" | "newsletter";
  previewColor: string;
  iconName: string;
  document: EmailDocument;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "flash_clearance",
    name: "⚡ 24h Flash Clearance Surge",
    description: "Urgent high-converting countdown, flame badges, discount coupon & product spotlight.",
    category: "sale",
    previewColor: "#dc2626",
    iconName: "Flame",
    document: {
      version: 1,
      subject: "🚨 24 HOURS ONLY: Up to 50% Off Everything!",
      previewText: "Don't sleep on our biggest clearance drop of the season.",
      globalStyles: {
        ...defaultGlobalStyles(),
        buttonColor: "#dc2626",
        linkColor: "#dc2626",
      },
      sections: [
        createBannerBlock({
          text: "🔥 24-HOUR FLASH SALE: Up to 50% Off Selected Items 🔥",
          backgroundColor: "#dc2626",
          textColor: "#ffffff",
        }),
        createCountdownBlock({
          title: "PRICE DROP COUNTDOWN",
          subtitle: "Prices revert to standard retail at midnight sharp.",
          hoursRemaining: 12,
          minutesRemaining: 30,
          secondsRemaining: 0,
        }),
        createProductBlock(
          "spotlight_deal",
          {
            name: "Hyper-Velocity Speed Runners",
            slug: "hyper-velocity-speed-runners",
            price: 5999,
            salePrice: 2999,
            currency: "Rs",
            image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
            description: "Ultra-responsive cushioning engineered for everyday all-day performance.",
          },
          "badge-highlight",
          {
            badgeText: "50% OFF TODAY",
            ctaText: "Grab Deal Before It Sells Out",
          }
        ),
        createCouponBlock({
          title: "Extra 10% Checkout Bonus",
          code: "FLASH10",
          description: "Stack this code on top of sale prices at checkout!",
          ctaText: "Shop Sale With Code",
          ctaUrl: "/products",
        }),
        createFooterBlock(),
      ],
    },
  },
  {
    id: "luxury_drop",
    name: "✨ Haute Couture / Luxury Editorial",
    description: "Obsidian & gold VIP showcase, minimalist typography, and editorial story.",
    category: "luxury",
    previewColor: "#d97706",
    iconName: "Star",
    document: {
      version: 1,
      subject: "Private Invitation: The Obsidian Edition Has Arrived",
      previewText: "An exclusive look at our hand-numbered seasonal atelier collection.",
      globalStyles: {
        ...defaultGlobalStyles(),
        backgroundColor: "#090d16",
        contentBackground: "#030712",
        textColor: "#94a3b8",
        headingColor: "#f8fafc",
        buttonColor: "#d97706",
        buttonTextColor: "#ffffff",
        linkColor: "#fbbf24",
      },
      sections: [
        createHeroBlock({
          title: "ATELIER AUTUMN",
          subtitle: "LIMITED CRAFT RELEASE",
          paragraph: "Hello {{firstName}}, we take immense pleasure in inviting you to experience the finest expressions of modern craft.",
          ctaText: "Explore Private Atelier",
          ctaUrl: "/products",
          backgroundColor: "#030712",
          titleColor: "#f8fafc",
          subtitleColor: "#fbbf24",
          paragraphColor: "#94a3b8",
        }),
        createProductBlock(
          "luxury_item",
          {
            name: "Black Titanium Timepiece No. 04",
            slug: "black-titanium-timepiece",
            price: 18500,
            salePrice: 14900,
            currency: "Rs",
            image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
            description: "Hand-finished aerospace grade titanium with sapphire crystal lens and Swiss automatic movement.",
          },
          "luxury-showcase",
          {
            badgeText: "NUMBERED SERIES",
            ctaText: "Acquire Piece",
          }
        ),
        createTestimonialBlock({
          quote: "“The weight, the finish, the presentation box — pure sophistication. A true statement of elegance.”",
          authorName: "Marcus Vance",
          authorTitle: "Collector & VIP Member",
          cardBackground: "#0f172a",
          cardBorderColor: "#334155",
          textColor: "#e2e8f0",
        }),
        createFooterBlock({
          companyName: "Findora Atelier",
          backgroundColor: "#030712",
          textColor: "#64748b",
        }),
      ],
    },
  },
  {
    id: "product_grid_showcase",
    name: "🛍️ Multi-Product Catalog Grid",
    description: "Clean modern 3-column product grid with customer reviews & free delivery banner.",
    category: "catalog",
    previewColor: "#4f46e5",
    iconName: "ShoppingBag",
    document: {
      version: 1,
      subject: "Weekly Top Picks: What Everyone Is Buying Right Now",
      previewText: "See the 3 most coveted essentials this week with guaranteed 48h dispatch.",
      globalStyles: defaultGlobalStyles(),
      sections: [
        createBannerBlock({
          text: "✨ Free Express Delivery on All Orders Placed Today ✨",
          backgroundColor: "#1e1b4b",
          textColor: "#ffffff",
        }),
        createTextBlock({
          text: "Curated For You, {{firstName}}",
          headingLevel: "h2",
          fontSize: 24,
          fontWeight: 800,
          textAlign: "center",
        }),
        createTextBlock({
          text: "We analyzed our customer favorites and curated our top 3 most-wanted products just for you.",
          textAlign: "center",
          textColor: "#6b7280",
        }),
        createProductGridBlock(),
        createTestimonialBlock(),
        createSocialLinksBlock(),
        createFooterBlock(),
      ],
    },
  },
  {
    id: "customer_winback",
    name: "💌 We Miss You / Comeback Reward",
    description: "Friendly warm tone, special comeback promo code, and handpicked favorites.",
    category: "retention",
    previewColor: "#ec4899",
    iconName: "Heart",
    document: {
      version: 1,
      subject: "{{firstName}}, we saved a special gift for you...",
      previewText: "It has been a while! Here is Rs 500 off your next order.",
      globalStyles: {
        ...defaultGlobalStyles(),
        buttonColor: "#db2777",
        linkColor: "#db2777",
      },
      sections: [
        createHeroBlock({
          title: "We Have Missed You, {{firstName}}",
          subtitle: "A Little Something To Welcome You Back",
          paragraph: "Things haven't been the same without you. Here's an exclusive gift voucher valid for the next 7 days.",
          backgroundColor: "#fdf2f8",
          titleColor: "#831843",
          subtitleColor: "#db2777",
          paragraphColor: "#4c0519",
          ctaText: "Shop With Voucher",
          ctaUrl: "/products",
        }),
        createCouponBlock({
          title: "Your Personal Comeback Gift",
          code: "WELCOMEBACK",
          description: "Valid across the entire store. No minimum spend required.",
          discountText: "Special Gift",
          discountAmount: "Rs 500 OFF",
          backgroundColor: "#fff1f2",
          borderColor: "#fecdd3",
          titleColor: "#9f1239",
          codeColor: "#be123c",
        }),
        createProductGridBlock({
          title: "What You've Missed Recently",
          subtitle: "Explore popular items released since your last visit",
        }),
        createFooterBlock(),
      ],
    },
  },
  {
    id: "weekly_digest",
    name: "📰 The Weekly Style & Culture Digest",
    description: "Magazine layout with story hero, product spotlights, customer quotes & social hub.",
    category: "newsletter",
    previewColor: "#059669",
    iconName: "FileText",
    document: {
      version: 1,
      subject: "Issue #42: Modern Craft, Sustainable Living & New Arrivals",
      previewText: "Your weekend digest featuring curated fashion, interviews, and member deals.",
      globalStyles: defaultGlobalStyles(),
      sections: [
        createBannerBlock({
          text: "THE WEEKLY DISPATCH • ISSUE #42 • SEPTEMBER EDITION",
          backgroundColor: "#064e3b",
          textColor: "#ecfdf5",
          fontSize: 11,
        }),
        createHeroBlock({
          title: "The Evolution of Modern Minimalism",
          subtitle: "By Findora Editorial Team",
          paragraph: "Every product we produce starts with an obsession: eliminating the unnecessary so that the essential may speak.",
          backgroundColor: "#f0fdf4",
          titleColor: "#064e3b",
          subtitleColor: "#059669",
          paragraphColor: "#166534",
          ctaText: "Read Full Feature",
          ctaUrl: "/blog",
        }),
        createProductBlock(
          "curated_item",
          {
            name: "Eco-Luxe Organic Wool Trench",
            slug: "eco-luxe-organic-wool-trench",
            price: 8999,
            salePrice: 6999,
            currency: "Rs",
            image: "https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop&q=80",
            description: "100% sustainably harvested virgin wool with weather-resistant natural wax finish.",
          },
          "editorial-magazine",
          {
            badgeText: "SUSTAINABLE EDIT",
            ctaText: "View Atelier Story",
          }
        ),
        createSocialLinksBlock(),
        createFooterBlock(),
      ],
    },
  },
];

