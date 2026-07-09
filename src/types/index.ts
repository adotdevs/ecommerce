import type { Permission } from "@/config/permissions";

export interface SeoFields {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
}

export interface ProductMedia {
  url: string;
  alt?: string;
  type: "image" | "video";
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface ProductPricing {
  price: number;
  compareAtPrice?: number;
  currency: string;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  slug: string;
  image?: string;
  price: number;
  quantity: number;
  sku?: string;
}

export type HomepageSectionType =
  | "hero_slider"
  | "featured_products"
  | "category_showcase"
  | "promo_banner"
  | "newsletter"
  | "trust_badges"
  | "flash_sale"
  | "custom_html";

export interface HomepageSection {
  _id: string;
  type: HomepageSectionType;
  order: number;
  enabled: boolean;
  schedule?: { start?: string; end?: string };
  config: Record<string, unknown>;
}

export interface CmsBlock {
  id: string;
  type: "hero" | "text" | "image" | "faq" | "cta" | "product_grid";
  config: Record<string, unknown>;
}

export interface SiteSettingsPublic {
  announcement?: string;
  supportPhone?: string;
  supportEmail?: string;
  deliveryInfo?: string;
  logo?: string;
  logoDark?: string;
  currencies: { code: string; symbol: string; rate: number }[];
  languages: { code: string; label: string; nativeLabel?: string; dir?: "ltr" | "rtl"; enabled?: boolean }[];
  countries: { code: string; label: string; currency: string; language: string }[];
  defaultCurrency: string;
  defaultLanguage: string;
  defaultCountry: string;
  seo: SeoFields;
  navigation?: { label: string; href: string; children?: { label: string; href: string }[] }[];
}

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  permissions: Permission[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
