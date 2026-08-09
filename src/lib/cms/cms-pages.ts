export type CmsPageSlug = "about" | "contact" | "privacy";

export type CmsPageContent = Record<string, unknown>;

export interface CmsFieldDef {
  key: string;
  label: string;
  multiline?: boolean;
  skip?: boolean;
}

export const CMS_PAGE_META: Record<
  CmsPageSlug,
  { label: string; description: string; path: string }
> = {
  about: {
    label: "About Us",
    description: "Company story, mission, and values",
    path: "/pages/about",
  },
  contact: {
    label: "Contact",
    description: "Contact details and support information",
    path: "/pages/contact",
  },
  privacy: {
    label: "Privacy Policy",
    description: "Privacy policy sections and legal copy",
    path: "/pages/privacy",
  },
};

export const CMS_PAGE_FIELDS: Record<CmsPageSlug, CmsFieldDef[]> = {
  about: [
    { key: "pageTitle", label: "Page title" },
    { key: "heroTitle", label: "Hero title" },
    { key: "heroSubtitle", label: "Hero subtitle", multiline: true },
    { key: "heroImage", label: "Hero image URL", skip: true },
    { key: "introTitle", label: "Introduction title" },
    { key: "introBody", label: "Introduction body", multiline: true },
    { key: "missionTitle", label: "Mission title" },
    { key: "missionBody", label: "Mission body", multiline: true },
    { key: "valuesTitle", label: "Values section title" },
    { key: "value1Title", label: "Value 1 title" },
    { key: "value1Body", label: "Value 1 description", multiline: true },
    { key: "value2Title", label: "Value 2 title" },
    { key: "value2Body", label: "Value 2 description", multiline: true },
    { key: "value3Title", label: "Value 3 title" },
    { key: "value3Body", label: "Value 3 description", multiline: true },
    { key: "seoTitle", label: "SEO title" },
    { key: "seoDescription", label: "SEO description", multiline: true },
  ],
  contact: [
    { key: "pageTitle", label: "Page title" },
    { key: "intro", label: "Introduction", multiline: true },
    { key: "emailLabel", label: "Email label" },
    { key: "email", label: "Email address" },
    { key: "phoneLabel", label: "Phone label" },
    { key: "phone", label: "Phone number" },
    { key: "addressLabel", label: "Address label" },
    { key: "address", label: "Address", multiline: true },
    { key: "hoursLabel", label: "Hours label" },
    { key: "hours", label: "Business hours", multiline: true },
    { key: "responseNote", label: "Response time note", multiline: true },
    { key: "seoTitle", label: "SEO title" },
    { key: "seoDescription", label: "SEO description", multiline: true },
  ],
  privacy: [
    { key: "pageTitle", label: "Page title" },
    { key: "intro", label: "Introduction", multiline: true },
    { key: "lastUpdated", label: "Last updated line" },
    { key: "seoTitle", label: "SEO title" },
    { key: "seoDescription", label: "SEO description", multiline: true },
  ],
};

export const DEFAULT_CMS_PAGES: Record<CmsPageSlug, CmsPageContent> = {
  about: {
    pageTitle: "About Us",
    heroTitle: "Our Story",
    heroSubtitle: "Building the future of premium ecommerce",
    heroImage:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200",
    introTitle: "Who we are",
    introBody:
      "YourStore was founded with a simple mission: to deliver world-class products with an unmatched shopping experience. We curate every item in our collection to meet the highest standards of quality and design.",
    missionTitle: "Our mission",
    missionBody:
      "We believe shopping should feel effortless, trustworthy, and inspiring. From product discovery to delivery, every detail is designed around you.",
    valuesTitle: "What we stand for",
    value1Title: "Quality first",
    value1Body:
      "Every product is reviewed by our team before it reaches our catalog.",
    value2Title: "Customer care",
    value2Body:
      "Real people, real support — before, during, and after your purchase.",
    value3Title: "Transparency",
    value3Body:
      "Clear pricing, honest policies, and no surprises at checkout.",
    seoTitle: "About Us",
    seoDescription: "Learn about our mission, values, and story.",
  },
  contact: {
    pageTitle: "Contact Us",
    intro:
      "We'd love to hear from you. Whether you have a question about an order, a product, or anything else — our team is ready to help.",
    emailLabel: "Email",
    email: "support@yourstore.com",
    phoneLabel: "Phone",
    phone: "+1 (800) 555-0199",
    addressLabel: "Address",
    address: "123 Commerce Street\nNew York, NY 10001\nUnited States",
    hoursLabel: "Business hours",
    hours: "Monday – Friday: 9:00 AM – 6:00 PM\nSaturday: 10:00 AM – 4:00 PM\nSunday: Closed",
    responseNote:
      "We typically respond to emails within one business day.",
    seoTitle: "Contact Us",
    seoDescription: "Get in touch with our support team.",
  },
  privacy: {
    pageTitle: "Privacy Policy",
    intro:
      "Your privacy is important to us. This policy explains what information we collect, how we use it, and the choices you have.",
    lastUpdated: "Last updated: January 1, 2026",
    sections: [
      {
        title: "Information we collect",
        body: "We collect information you provide directly, such as your name, email address, shipping address, phone number, and payment details when you create an account or place an order. We also collect technical data such as browser type, device information, and pages visited.",
      },
      {
        title: "How we use your information",
        body: "We use your information to process orders, provide customer support, personalize your experience, improve our website, prevent fraud, and send order updates or marketing communications when you opt in.",
      },
      {
        title: "Sharing your information",
        body: "We do not sell your personal information. We share data only with trusted service providers who help us operate our store — such as payment processors, shipping carriers, and email providers — and only to the extent necessary.",
      },
      {
        title: "Cookies and analytics",
        body: "We use cookies and similar technologies to remember your preferences, keep you signed in, and understand how our site is used. You can control cookies through your browser settings.",
      },
      {
        title: "Data retention",
        body: "We retain personal information for as long as needed to fulfill the purposes described in this policy, comply with legal obligations, resolve disputes, and enforce our agreements.",
      },
      {
        title: "Your rights",
        body: "Depending on your location, you may have the right to access, correct, delete, or export your personal data, and to opt out of certain processing. Contact us to exercise these rights.",
      },
      {
        title: "Contact us",
        body: "If you have questions about this privacy policy, please contact us at support@yourstore.com.",
      },
    ],
    seoTitle: "Privacy Policy",
    seoDescription: "How we collect, use, and protect your personal information.",
  },
};

export function isCmsPageSlug(slug: string): slug is CmsPageSlug {
  return slug === "about" || slug === "contact" || slug === "privacy";
}

export function stringField(content: CmsPageContent, key: string): string {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

export interface PrivacySection {
  title: string;
  body: string;
}

export function privacySections(content: CmsPageContent): PrivacySection[] {
  const sections = content.sections;
  if (!Array.isArray(sections)) return [];
  return sections
    .filter(
      (item): item is PrivacySection =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as PrivacySection).title === "string" &&
        typeof (item as PrivacySection).body === "string"
    )
    .map((item) => ({
      title: item.title,
      body: item.body,
    }));
}
