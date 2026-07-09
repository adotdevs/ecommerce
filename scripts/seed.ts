import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

import { connectDB } from "../src/lib/db/mongoose";
import { hashPassword } from "../src/lib/auth/password";
import { ROLE_DEFINITIONS } from "../src/config/permissions";
import {
  Role,
  User,
  SiteSettings,
  HomepageSection,
  Category,
  Brand,
  Product,
  CmsPage,
} from "../src/models";

async function seed() {
  await connectDB();
  console.log("Connected to MongoDB");

  // Roles
  for (const roleDef of ROLE_DEFINITIONS) {
    await Role.findOneAndUpdate(
      { name: roleDef.name },
      { name: roleDef.name, label: roleDef.label, permissions: [...roleDef.permissions] },
      { upsert: true, new: true }
    );
  }
  console.log("Roles seeded");

  // Admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@yourstore.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const passwordHash = await hashPassword(adminPassword);

  await User.findOneAndUpdate(
    { email: adminEmail },
    {
      email: adminEmail,
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      roles: ["super_admin"],
      emailVerified: true,
    },
    { upsert: true, new: true }
  );
  console.log(`Admin user seeded: ${adminEmail}`);

  // Site settings
  await SiteSettings.findOneAndUpdate(
    { key: "global" },
    {
      key: "global",
      announcement: "Free express shipping on orders over $100 — Limited time only",
      deliveryInfo: "Delivered in 2-5 business days",
      supportPhone: "+1 (800) 555-0199",
      supportEmail: "support@yourstore.com",
      logo: "/brand/logo.svg",
      currencies: [
        { code: "USD", symbol: "$", rate: 1 },
        { code: "AUD", symbol: "A$", rate: 1.52 },
        { code: "EUR", symbol: "€", rate: 0.92 },
        { code: "GBP", symbol: "£", rate: 0.79 },
      ],
      languages: [
        { code: "en", label: "English", nativeLabel: "English", dir: "ltr", enabled: true },
        { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl", enabled: true },
        { code: "ur", label: "Urdu", nativeLabel: "اردو", dir: "rtl", enabled: true },
        { code: "fr", label: "French", nativeLabel: "Français", dir: "ltr", enabled: true },
        { code: "de", label: "German", nativeLabel: "Deutsch", dir: "ltr", enabled: true },
        { code: "es", label: "Spanish", nativeLabel: "Español", dir: "ltr", enabled: true },
      ],
      countries: [
        { code: "US", label: "United States", currency: "USD", language: "en" },
        { code: "AU", label: "Australia", currency: "AUD", language: "en" },
        { code: "GB", label: "United Kingdom", currency: "GBP", language: "en" },
        { code: "DE", label: "Germany", currency: "EUR", language: "en" },
      ],
      defaultCurrency: "USD",
      defaultLanguage: "en",
      defaultCountry: "US",
      seo: {
        title: "YourStore — Premium Shopping Experience",
        description: "Discover curated premium products with fast delivery worldwide.",
        keywords: ["ecommerce", "premium", "shopping"],
      },
      navigation: [
        { label: "New Arrivals", href: "/new-arrivals" },
        { label: "Best Sellers", href: "/bestsellers" },
        {
          label: "Categories",
          href: "/products",
          children: [
            { label: "Electronics", href: "/categories/electronics" },
            { label: "Fashion", href: "/categories/fashion" },
            { label: "Home", href: "/categories/home-living" },
          ],
        },
        { label: "Deals", href: "/deals" },
      ],
    },
    { upsert: true, new: true }
  );
  console.log("Site settings seeded");

  // Categories
  const categories = [
    { name: "Electronics", slug: "electronics", sortOrder: 1 },
    { name: "Fashion", slug: "fashion", sortOrder: 2 },
    { name: "Home & Living", slug: "home-living", sortOrder: 3 },
    { name: "Sports", slug: "sports", sortOrder: 4 },
  ];

  const categoryDocs = [];
  for (const cat of categories) {
    const doc = await Category.findOneAndUpdate({ slug: cat.slug }, cat, {
      upsert: true,
      new: true,
    });
    categoryDocs.push(doc);
  }
  console.log("Categories seeded");

  // Brands
  const brands = [
    {
      name: "Apex",
      slug: "apex",
      description: "Premium tech innovation",
      categoryIds: [categoryDocs[0]._id],
    },
    {
      name: "Nova",
      slug: "nova",
      description: "Modern lifestyle essentials",
      categoryIds: [categoryDocs[1]._id, categoryDocs[2]._id],
    },
    {
      name: "Stride",
      slug: "stride",
      description: "Performance athletic gear",
      categoryIds: [categoryDocs[3]._id],
    },
  ];

  const brandDocs = [];
  for (const brand of brands) {
    const doc = await Brand.findOneAndUpdate({ slug: brand.slug }, brand, {
      upsert: true,
      new: true,
    });
    brandDocs.push(doc);
  }
  console.log("Brands seeded");

  // Products
  const products = [
    {
      name: "Apex Pro Wireless Headphones",
      slug: "apex-pro-wireless-headphones",
      sku: "APX-HP-001",
      brandId: brandDocs[0]._id,
      brandName: "Apex",
      categoryIds: [categoryDocs[0]._id],
      categoryNames: ["Electronics"],
      tags: ["wireless", "audio", "premium"],
      shortDescription: "Studio-grade sound with adaptive noise cancellation.",
      description:
        "Experience immersive audio with 40-hour battery life, premium materials, and intelligent noise cancellation.",
      media: [
        {
          url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
          alt: "Apex Pro Wireless Headphones",
          type: "image" as const,
          sortOrder: 0,
        },
      ],
      pricing: { price: 349.99, compareAtPrice: 399.99, currency: "USD" },
      inventory: { stock: 120, lowStockThreshold: 10, trackInventory: true },
      specifications: [
        { key: "Battery", value: "40 hours" },
        { key: "Connectivity", value: "Bluetooth 5.3" },
        { key: "Weight", value: "250g" },
      ],
      status: "published" as const,
      featured: true,
      seo: {
        title: "Apex Pro Wireless Headphones | YourStore",
        description: "Premium wireless headphones with adaptive noise cancellation.",
      },
    },
    {
      name: "Nova Minimalist Watch",
      slug: "nova-minimalist-watch",
      sku: "NVA-WT-002",
      brandId: brandDocs[1]._id,
      brandName: "Nova",
      categoryIds: [categoryDocs[1]._id],
      categoryNames: ["Fashion"],
      tags: ["watch", "minimalist", "luxury"],
      shortDescription: "Swiss movement meets modern minimal design.",
      description: "A timeless timepiece crafted with sapphire crystal and Italian leather.",
      media: [
        {
          url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
          alt: "Nova Minimalist Watch",
          type: "image" as const,
          sortOrder: 0,
        },
      ],
      pricing: { price: 289.0, compareAtPrice: 349.0, currency: "USD" },
      inventory: { stock: 45, lowStockThreshold: 5, trackInventory: true },
      status: "published" as const,
      featured: true,
    },
    {
      name: "Stride Elite Running Shoes",
      slug: "stride-elite-running-shoes",
      sku: "STR-SH-003",
      brandId: brandDocs[2]._id,
      brandName: "Stride",
      categoryIds: [categoryDocs[3]._id],
      categoryNames: ["Sports"],
      tags: ["running", "shoes", "performance"],
      shortDescription: "Lightweight performance for serious runners.",
      description: "Engineered with responsive foam and breathable mesh upper.",
      media: [
        {
          url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
          alt: "Stride Elite Running Shoes",
          type: "image" as const,
          sortOrder: 0,
        },
      ],
      pricing: { price: 159.99, currency: "USD" },
      inventory: { stock: 200, lowStockThreshold: 15, trackInventory: true },
      variants: [
        {
          id: "size-9",
          name: "Size 9",
          sku: "STR-SH-003-9",
          price: 159.99,
          stock: 50,
          attributes: { size: "9" },
        },
        {
          id: "size-10",
          name: "Size 10",
          sku: "STR-SH-003-10",
          price: 159.99,
          stock: 75,
          attributes: { size: "10" },
        },
      ],
      status: "published" as const,
      featured: true,
    },
    {
      name: "Nova Smart Home Hub",
      slug: "nova-smart-home-hub",
      sku: "NVA-HB-004",
      brandId: brandDocs[1]._id,
      brandName: "Nova",
      categoryIds: [categoryDocs[0]._id, categoryDocs[2]._id],
      categoryNames: ["Electronics", "Home & Living"],
      tags: ["smart home", "hub", "automation"],
      shortDescription: "Control your entire home from one elegant hub.",
      media: [
        {
          url: "https://images.unsplash.com/photo-1558002038-1051097df827?w=800",
          alt: "Nova Smart Home Hub",
          type: "image" as const,
          sortOrder: 0,
        },
      ],
      pricing: { price: 199.99, compareAtPrice: 249.99, currency: "USD" },
      inventory: { stock: 80, lowStockThreshold: 8, trackInventory: true },
      status: "published" as const,
      featured: false,
    },
  ];

  for (const product of products) {
    await Product.findOneAndUpdate({ slug: product.slug }, product, {
      upsert: true,
      new: true,
    });
  }
  console.log("Products seeded");

  // Homepage sections
  await HomepageSection.deleteMany({});
  const sections = [
    {
      type: "hero_slider",
      order: 0,
      enabled: true,
      config: {
        heroBadge: "Free shipping over $100",
        exploreNewLabel: "New arrivals",
        exploreNewHref: "/new-arrivals",
        slides: [
          {
            title: "Shop the season's bestsellers",
            subtitle: "Premium picks, fast delivery, and easy returns — everything you need in one store.",
            cta: { label: "Shop Now", href: "/products" },
            image: "https://images.unsplash.com/photo-1441986300917-64644bd600d8?auto=format&fit=crop&w=1920&q=80",
          },
          {
            title: "New arrivals just dropped",
            subtitle: "Fresh styles and limited drops. Grab yours before they're gone.",
            cta: { label: "Explore New", href: "/new-arrivals" },
            image: "https://images.unsplash.com/photo-1483985988350-763728e1935b?auto=format&fit=crop&w=1920&q=80",
          },
        ],
      },
    },
    {
      type: "trust_badges",
      order: 1,
      enabled: true,
      config: {
        badges: [
          { icon: "truck", title: "Free Shipping", description: "On orders $100+" },
          { icon: "shield", title: "Secure Payment", description: "256-bit encryption" },
          { icon: "refresh", title: "Easy Returns", description: "30-day guarantee" },
          { icon: "headphones", title: "24/7 Support", description: "Always here to help" },
        ],
      },
    },
    {
      type: "flash_sale",
      order: 2,
      enabled: true,
      config: {
        eyebrow: "Limited time",
        title: "Flash Sale",
        subtitle: "Lightning deals — grab them before the clock hits zero.",
        endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        ctaLabel: "Shop all deals",
        ctaHref: "/deals",
        selectionMode: "auto",
        limit: 4,
        productLinks: [],
      },
    },
    {
      type: "featured_products",
      order: 3,
      enabled: true,
      config: {
        title: "Featured Products",
        subtitle: "Handpicked favorites from our collection",
        viewAllLabel: "View All",
        layout: "grid",
        limit: 4,
      },
    },
    {
      type: "category_showcase",
      order: 4,
      enabled: true,
      config: {
        title: "Shop by Category",
        subtitle: "Find exactly what you're looking for",
      },
    },
    {
      type: "promo_banner",
      order: 5,
      enabled: true,
      config: {
        eyebrow: "Limited offer",
        title: "Summer Sale — Up to 40% Off",
        subtitle: "Limited time offer on select items",
        discountLabel: "40%",
        cta: { label: "Shop Deals", href: "/deals" },
      },
    },
    {
      type: "newsletter",
      order: 6,
      enabled: true,
      config: {
        title: "Stay in the Loop",
        subtitle: "Get exclusive offers and new arrivals delivered to your inbox.",
        emailPlaceholder: "Enter your email",
        buttonLabel: "Subscribe",
        privacyNote: "No spam. Unsubscribe anytime.",
      },
    },
  ];

  await HomepageSection.insertMany(sections);
  console.log("Homepage sections seeded");

  // CMS Pages
  const cmsPages = [
    {
      title: "About Us",
      slug: "about",
      status: "published" as const,
      publishedAt: new Date(),
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          config: {
            title: "Our Story",
            subtitle: "Building the future of premium ecommerce",
            image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200",
          },
        },
        {
          id: "text-1",
          type: "text",
          config: {
            content:
              "YourStore was founded with a simple mission: to deliver world-class products with an unmatched shopping experience. We curate every item in our collection to meet the highest standards of quality and design.",
          },
        },
      ],
      seo: {
        title: "About Us | YourStore",
        description: "Learn about YourStore's mission and values.",
      },
    },
    {
      title: "Contact",
      slug: "contact",
      status: "published" as const,
      publishedAt: new Date(),
      blocks: [
        {
          id: "text-1",
          type: "text",
          config: {
            content:
              "We'd love to hear from you. Reach us at support@yourstore.com or call +1 (800) 555-0199.",
          },
        },
      ],
    },
    {
      title: "Privacy Policy",
      slug: "privacy",
      status: "published" as const,
      publishedAt: new Date(),
      blocks: [
        {
          id: "text-1",
          type: "text",
          config: {
            content:
              "Your privacy is important to us. This policy describes how we collect, use, and protect your personal information.",
          },
        },
      ],
    },
  ];

  for (const page of cmsPages) {
    await CmsPage.findOneAndUpdate({ slug: page.slug }, page, {
      upsert: true,
      new: true,
    });
  }
  console.log("CMS pages seeded");

  console.log("\nSeed completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
