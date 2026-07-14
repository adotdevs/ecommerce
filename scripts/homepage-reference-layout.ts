/**
 * Shared homepage CMS layout for seed + migrate scripts.
 */
export const REFERENCE_HOMEPAGE_SECTIONS = [
  {
    type: "hero_slider",
    order: 0,
    enabled: true,
    config: {
      heroBadge: "NEW COLLECTION 2026",
      exploreNewLabel: "View Lookbook",
      exploreNewHref: "/new-arrivals",
      floatCardTitle: "Seasonal Edit",
      floatCardSubtitle: "Up to 30% off select styles",
      trustPoints: [
        { icon: "truck", label: "Free Shipping" },
        { icon: "shield", label: "Secure Payment" },
        { icon: "refresh", label: "Easy Returns" },
        { icon: "headphones", label: "24/7 Support" },
      ],
      slides: [
        {
          eyebrow: "NEW COLLECTION 2026",
          title: "Refined style for every moment",
          subtitle:
            "Thoughtfully curated pieces with premium materials and timeless silhouettes.",
          cta: { label: "Shop Collection", href: "/products" },
          secondaryCta: { label: "View Lookbook", href: "/new-arrivals" },
          floatCardTitle: "Seasonal Edit",
          floatCardSubtitle: "Up to 30% off select styles",
          image:
            "https://images.unsplash.com/photo-1483985988350-763728e1935b?auto=format&fit=crop&w=1920&q=80",
        },
        {
          eyebrow: "ESSENTIALS",
          title: "Elevate your everyday wardrobe",
          subtitle:
            "Versatile foundations designed for comfort, quality, and lasting wear.",
          cta: { label: "Shop Essentials", href: "/categories" },
          secondaryCta: { label: "Best Sellers", href: "/bestsellers" },
          floatCardTitle: "Bestselling Sets",
          floatCardSubtitle: "Starting from $49",
          image:
            "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1920&q=80",
        },
        {
          eyebrow: "MEMBER EXCLUSIVE",
          title: "Early access to seasonal drops",
          subtitle:
            "Be first to shop limited releases and member-only pricing.",
          cta: { label: "Join & Shop", href: "/deals" },
          secondaryCta: { label: "Create Account", href: "/account" },
          floatCardTitle: "Members Save More",
          floatCardSubtitle: "Extra 15% this week",
          image:
            "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=80",
        },
      ],
    },
  },
  {
    type: "category_showcase",
    order: 1,
    enabled: true,
    config: {
      title: "Shop by Category",
      viewAllLabel: "View all categories",
      viewAllHref: "/categories",
      selectionMode: "auto",
      categoryLinks: [],
    },
  },
  {
    type: "promo_grid",
    order: 2,
    enabled: true,
    config: {
      sectionTitle: "Curated Offers",
      sectionSubtitle: "Handpicked promotions updated weekly.",
      tiles: [
        {
          eyebrow: "LIMITED TIME",
          title: "Summer Sale Up to 40% Off",
          subtitle: "Save on selected essentials for a limited time.",
          ctaLabel: "Shop the Sale",
          ctaHref: "/deals",
          variant: "lavender",
          image: "",
        },
        {
          eyebrow: "NEW ARRIVALS",
          title: "Fresh Styles Just Dropped",
          subtitle: "Explore the latest products curated for you.",
          ctaLabel: "Explore Now",
          ctaHref: "/new-arrivals",
          variant: "cream",
          image: "",
        },
        {
          eyebrow: "EXCLUSIVE DEALS",
          title: "Deals You'll Love",
          subtitle: "Handpicked offers with exceptional value.",
          ctaLabel: "Shop Deals",
          ctaHref: "/deals",
          variant: "mint",
          image: "",
        },
      ],
    },
  },
  {
    type: "product_slider",
    order: 3,
    enabled: true,
    config: {
      title: "Best Sellers",
      viewAllLabel: "View all best sellers",
      viewAllHref: "/bestsellers",
      preset: "bestsellers",
      showNewBadge: false,
      selectionMode: "auto",
      limit: 8,
      productLinks: [],
      emptyMessage: "Bestsellers will appear here once products are published.",
    },
  },
  {
    type: "promo_banner",
    order: 4,
    enabled: true,
    config: {
      eyebrow: "WEEKEND EXCLUSIVE",
      title: "Save on signature pieces",
      subtitle:
        "Enjoy exceptional value on our most-loved products — this weekend only.",
      discountLabel: "30%",
      cta: { label: "Shop the Offer", href: "/deals" },
      image:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
      productLinks: [],
    },
  },
  {
    type: "flash_sale",
    order: 5,
    enabled: true,
    config: {
      eyebrow: "FLASH SALE",
      title: "Limited-time deals",
      subtitle:
        "Prices drop for 7 days — reset automatically when the timer ends.",
      endsInLabel: "Ends in",
      ctaLabel: "View all deals",
      ctaHref: "/deals",
      emptyMessage: "New deals arriving soon. Check back shortly.",
      selectionMode: "auto",
      limit: 4,
      productLinks: [],
    },
  },
  {
    type: "brand_strip",
    order: 6,
    enabled: true,
    config: {
      title: "Trusted by 1000+ brands worldwide",
    },
  },
  {
    type: "product_slider",
    order: 7,
    enabled: true,
    config: {
      title: "New Arrivals",
      viewAllLabel: "View all new arrivals",
      viewAllHref: "/new-arrivals",
      preset: "new_arrivals",
      showNewBadge: true,
      selectionMode: "auto",
      limit: 8,
      productLinks: [],
      emptyMessage: "New arrivals will appear here soon.",
    },
  },
  {
    type: "product_slider",
    order: 8,
    enabled: true,
    config: {
      title: "Today's Deals",
      viewAllLabel: "View all deals",
      viewAllHref: "/deals",
      preset: "deals",
      showNewBadge: false,
      selectionMode: "auto",
      limit: 8,
      productLinks: [],
      emptyMessage: "No active deals at the moment.",
    },
  },
  {
    type: "value_proposition",
    order: 9,
    enabled: true,
    config: {
      eyebrow: "Why shop with us",
      title: "A better way to shop online",
      subtitle: "Quality, service, and value — built into every order.",
      items: [
        {
          title: "Curated selection",
          description:
            "Every product is vetted for quality, design, and value.",
        },
        {
          title: "Fast fulfillment",
          description: "Orders ship within 24 hours on in-stock items.",
        },
        {
          title: "Hassle-free returns",
          description: "30-day returns on eligible purchases.",
        },
        {
          title: "Dedicated support",
          description: "Real people ready to help, whenever you need us.",
        },
      ],
    },
  },
  {
    type: "newsletter",
    order: 10,
    enabled: true,
    config: {
      title: "Stay in the loop",
      subtitle:
        "Get early access to sales, new arrivals, and style inspiration.",
      emailPlaceholder: "Enter your email",
      buttonLabel: "Subscribe",
      privacyNote: "We respect your privacy. Unsubscribe anytime.",
    },
  },
  {
    type: "trust_badges",
    order: 11,
    enabled: true,
    config: {
      badges: [
        {
          icon: "truck",
          title: "Free Shipping",
          description: "On orders over $100",
        },
        {
          icon: "shield",
          title: "Secure Payment",
          description: "100% secure payment",
        },
        {
          icon: "refresh",
          title: "Easy Returns",
          description: "30-day return policy",
        },
        {
          icon: "headphones",
          title: "24/7 Support",
          description: "Always here to help",
        },
      ],
    },
  },
];
