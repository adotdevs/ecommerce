/**
 * Structured Email Document Schema
 *
 * Instead of storing emails as uncontrolled HTML, we define a structured document
 * composed of typed sections/blocks. The document renderer converts this to
 * email-safe HTML with inline styles.
 *
 * AI generates content matching this schema — never raw HTML.
 * Admin has full control to edit every field.
 */

// ─── Global Styles ───────────────────────────────────────────────────────────

export interface GlobalStyles {
  backgroundColor: string;
  contentWidth: number;
  contentBackground: string;
  fontFamily: string;
  textColor: string;
  linkColor: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonRadius: number;
  headingColor: string;
  sectionSpacing: number;
  borderRadius: number;
  brandLogo?: string;
}

// ─── Block Types ─────────────────────────────────────────────────────────────

export type BlockType =
  | "text"
  | "button"
  | "image"
  | "product"
  | "hero"
  | "spacer"
  | "divider"
  | "coupon"
  | "banner"
  | "footer"
  | "columns"
  | "product-grid"
  | "countdown"
  | "social-links"
  | "testimonial";

// ─── Section Settings (shared by all blocks) ────────────────────────────────

export interface SectionSettings {
  backgroundColor?: string;
  backgroundImage?: string;
  contentBackground?: string;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  alignment?: "left" | "center" | "right";
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  maxWidth?: number;
  visible?: boolean;
}

// ─── Text Block ──────────────────────────────────────────────────────────────

export interface TextBlockContent {
  text: string;
  headingLevel?: "h1" | "h2" | "h3" | "p";
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  textAlign?: "left" | "center" | "right";
  textColor?: string;
  letterSpacing?: number;
}

// ─── Button Block ────────────────────────────────────────────────────────────

export interface ButtonBlockContent {
  text: string;
  url: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: number;
  alignment?: "left" | "center" | "right";
  width?: "auto" | "full";
  paddingVertical?: number;
  paddingHorizontal?: number;
  fontSize?: number;
  fontWeight?: number;
  /** For tracked links */
  linkType?: string;
}

// ─── Image Block ─────────────────────────────────────────────────────────────

export interface ImageBlockContent {
  src: string;
  alt: string;
  width?: number | "full";
  alignment?: "left" | "center" | "right";
  clickUrl?: string;
  borderRadius?: number;
  /** For tracked links */
  linkType?: string;
}

// ─── Product Block ───────────────────────────────────────────────────────────

export type ProductLayout =
  | "image-top"
  | "image-left"
  | "image-right"
  | "hero"
  | "compact"
  | "price-focused"
  | "image-button-only"
  | "luxury-showcase"
  | "gradient-spotlight"
  | "badge-highlight"
  | "editorial-magazine"
  | "glassmorphism-card"
  | "neon-cyber"
  | "star-rated-deal"
  | "minimal-boutique"
  | "pill-badge-row";

export interface ProductBlockContent {
  productId: string;
  /** Immutable product values snapshotted at design/send time */
  productSnapshot: {
    name: string;
    slug: string;
    image?: string;
    price?: number;
    salePrice?: number;
    description?: string;
    currency?: string;
  };
  layout: ProductLayout;
  /** Admin display overrides (shown instead of DB values) */
  displayTitle?: string;
  displayDescription?: string;
  ctaText?: string;
  ctaUrl?: string;
  /** Extended badge and review fields */
  badgeText?: string;
  rating?: number;
  reviewsCount?: number;
  stockStatus?: string;
  aspectRatio?: "square" | "portrait" | "landscape";
  /** Toggle visibility of product card elements */
  showImage: boolean;
  showTitle: boolean;
  showDescription: boolean;
  showPrice: boolean;
  showSalePrice: boolean;
  showDiscount: boolean;
  showCta: boolean;
  /** Styling */
  imageHeight?: number;
  cardBackground?: string;
  cardBorderColor?: string;
  cardBorderRadius?: number;
  titleColor?: string;
  titleSize?: number;
  priceColor?: string;
  salePriceColor?: string;
  ctaBackgroundColor?: string;
  ctaTextColor?: string;
}

// ─── Hero Block ──────────────────────────────────────────────────────────────

export interface HeroBlockContent {
  backgroundImage?: string;
  backgroundColor?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  title: string;
  subtitle?: string;
  paragraph?: string;
  ctaText?: string;
  ctaUrl?: string;
  ctaBackgroundColor?: string;
  ctaTextColor?: string;
  alignment?: "left" | "center" | "right";
  titleColor?: string;
  titleSize?: number;
  subtitleColor?: string;
  subtitleSize?: number;
  paragraphColor?: string;
  minHeight?: number;
}

// ─── Spacer Block ────────────────────────────────────────────────────────────

export interface SpacerBlockContent {
  height: number;
}

// ─── Divider Block ───────────────────────────────────────────────────────────

export interface DividerBlockContent {
  thickness: number;
  style: "solid" | "dashed" | "dotted";
  color: string;
  width: number | "full";
  spacing: number;
}

// ─── Coupon Block ────────────────────────────────────────────────────────────

export interface CouponBlockContent {
  title: string;
  code: string;
  description?: string;
  discountText?: string;
  discountAmount?: string;
  ctaText?: string;
  ctaUrl?: string;
  backgroundColor?: string;
  borderColor?: string;
  titleColor?: string;
  codeColor?: string;
  codeBackgroundColor?: string;
}

// ─── Banner Block ────────────────────────────────────────────────────────────

export interface BannerBlockContent {
  text: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: number;
  icon?: string;
  ctaText?: string;
  ctaUrl?: string;
}

// ─── Footer Block ────────────────────────────────────────────────────────────

export interface FooterBlockContent {
  companyName?: string;
  text?: string;
  websiteUrl?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
  contactEmail?: string;
  address?: string;
  /** Admin can style but cannot remove unsubscribe from final output */
  showUnsubscribe: boolean;
  backgroundColor?: string;
  textColor?: string;
}

// ─── Columns Block ───────────────────────────────────────────────────────────

export type ColumnSplit = "50/50" | "40/60" | "60/40" | "33/33/33";

export interface ColumnsBlockContent {
  split: ColumnSplit;
  columns: Array<{
    blocks: EmailSection[];
  }>;
  /** Stack on mobile */
  stackOnMobile: boolean;
  gap?: number;
}

// ─── Product Grid Block ──────────────────────────────────────────────────────

export interface ProductGridItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  image?: string;
  currency?: string;
  badge?: string;
}

export interface ProductGridBlockContent {
  title?: string;
  subtitle?: string;
  columns: 2 | 3;
  items: ProductGridItem[];
  showPrices: boolean;
  showSalePrices: boolean;
  showBadges: boolean;
  ctaText?: string;
  cardBackground?: string;
  cardBorderColor?: string;
  cardBorderRadius?: number;
}

// ─── Countdown Block ─────────────────────────────────────────────────────────

export interface CountdownBlockContent {
  title: string;
  headline?: string;
  subtitle?: string;
  targetDate?: string;
  urgentThresholdHours?: number;
  hoursRemaining?: number;
  minutesRemaining?: number;
  secondsRemaining?: number;
  ctaText?: string;
  ctaUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  boxBackground?: string;
  digitBgColor?: string;
  digitTextColor?: string;
  badgeText?: string;
}

// ─── Social Links Block ──────────────────────────────────────────────────────

export type SocialPlatform = "instagram" | "facebook" | "twitter" | "tiktok" | "youtube" | "whatsapp" | "website";

export interface SocialLinkItem {
  platform: SocialPlatform;
  url: string;
  label?: string;
}

export interface SocialLinksBlockContent {
  title?: string;
  headline?: string;
  links: SocialLinkItem[];
  alignment?: "left" | "center" | "right";
  iconStyle?: "circle" | "rounded" | "minimal" | "filled" | "outlined";
  style?: "filled" | "outlined" | "minimal";
  iconColor?: string;
  backgroundColor?: string;
}

// ─── Testimonial Block ───────────────────────────────────────────────────────

export interface TestimonialBlockContent {
  quote: string;
  authorName: string;
  authorTitle?: string;
  authorAvatar?: string;
  rating?: number;
  verifiedCustomer?: boolean;
  cardBackground?: string;
  cardBorderColor?: string;
  textColor?: string;
  starColor?: string;
}

// ─── Union Content Type ──────────────────────────────────────────────────────

export type BlockContent =
  | TextBlockContent
  | ButtonBlockContent
  | ImageBlockContent
  | ProductBlockContent
  | HeroBlockContent
  | SpacerBlockContent
  | DividerBlockContent
  | CouponBlockContent
  | BannerBlockContent
  | FooterBlockContent
  | ColumnsBlockContent
  | ProductGridBlockContent
  | CountdownBlockContent
  | SocialLinksBlockContent
  | TestimonialBlockContent;

// ─── Email Section ───────────────────────────────────────────────────────────

export interface EmailSection {
  id: string;
  type: BlockType;
  visible: boolean;
  settings: SectionSettings;
  content: BlockContent;
}

// ─── Localized Email Variant ──────────────────────────────────────────────────

export interface LocalizedEmailVariant {
  locale: string;
  subject: string;
  previewText?: string;
  bodyText?: string;
  sections?: EmailSection[];
  direction?: "ltr" | "rtl";
  updatedAt?: string;
}

// ─── Email Document ──────────────────────────────────────────────────────────

export interface EmailDocument {
  version: number;
  subject: string;
  previewText?: string;
  globalStyles: GlobalStyles;
  sections: EmailSection[];
  defaultLocale?: string;
  translations?: Record<string, LocalizedEmailVariant>;
  metadata?: {
    lastSavedAt?: string;
    autoSaveId?: string;
    templateId?: string;
    templateName?: string;
  };
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isTextBlock(content: BlockContent, type: BlockType): content is TextBlockContent {
  return type === "text";
}
export function isButtonBlock(content: BlockContent, type: BlockType): content is ButtonBlockContent {
  return type === "button";
}
export function isImageBlock(content: BlockContent, type: BlockType): content is ImageBlockContent {
  return type === "image";
}
export function isProductBlock(content: BlockContent, type: BlockType): content is ProductBlockContent {
  return type === "product";
}
export function isHeroBlock(content: BlockContent, type: BlockType): content is HeroBlockContent {
  return type === "hero";
}
export function isSpacerBlock(content: BlockContent, type: BlockType): content is SpacerBlockContent {
  return type === "spacer";
}
export function isDividerBlock(content: BlockContent, type: BlockType): content is DividerBlockContent {
  return type === "divider";
}
export function isCouponBlock(content: BlockContent, type: BlockType): content is CouponBlockContent {
  return type === "coupon";
}
export function isBannerBlock(content: BlockContent, type: BlockType): content is BannerBlockContent {
  return type === "banner";
}
export function isFooterBlock(content: BlockContent, type: BlockType): content is FooterBlockContent {
  return type === "footer";
}
export function isColumnsBlock(content: BlockContent, type: BlockType): content is ColumnsBlockContent {
  return type === "columns";
}
export function isProductGridBlock(content: BlockContent, type: BlockType): content is ProductGridBlockContent {
  return type === "product-grid";
}
export function isCountdownBlock(content: BlockContent, type: BlockType): content is CountdownBlockContent {
  return type === "countdown";
}
export function isSocialLinksBlock(content: BlockContent, type: BlockType): content is SocialLinksBlockContent {
  return type === "social-links";
}
export function isTestimonialBlock(content: BlockContent, type: BlockType): content is TestimonialBlockContent {
  return type === "testimonial";
}
