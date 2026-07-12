import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ISiteSettings extends Document {
  key: string;
  announcement?: string;
  offers?: string[];
  deliveryInfo?: string;
  supportPhone?: string;
  supportEmail?: string;
  logo?: string;
  logoDark?: string;
  storeName?: string;
  storeTagline?: string;
  adminBrandShort?: string;
  currencies: { code: string; symbol: string; rate: number }[];
  languages: { code: string; label: string; nativeLabel?: string; dir?: "ltr" | "rtl"; enabled?: boolean }[];
  countries: {
    code: string;
    label: string;
    currency: string;
    language: string;
  }[];
  defaultCurrency: string;
  defaultLanguage: string;
  defaultCountry: string;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
    canonical?: string;
    ogImage?: string;
  };
  navigation: { label: string; href: string; children?: { label: string; href: string }[] }[];
  exchangeRatesCache?: {
    rates?: Record<string, number>;
    updatedAt?: Date;
  };
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    key: { type: String, default: "global", unique: true },
    announcement: String,
    offers: [String],
    deliveryInfo: String,
    supportPhone: String,
    supportEmail: String,
    logo: String,
    logoDark: String,
    storeName: String,
    storeTagline: String,
    adminBrandShort: String,
    currencies: [
      { code: String, symbol: String, rate: { type: Number, default: 1 } },
    ],
    languages: [{
      code: String,
      label: String,
      nativeLabel: String,
      dir: { type: String, enum: ["ltr", "rtl"], default: "ltr" },
      enabled: { type: Boolean, default: true },
    }],
    countries: [
      { code: String, label: String, currency: String, language: String },
    ],
    defaultCurrency: { type: String, default: "USD" },
    defaultLanguage: { type: String, default: "en" },
    defaultCountry: { type: String, default: "US" },
    seo: {
      title: String,
      description: String,
      keywords: [String],
      canonical: String,
      ogImage: String,
    },
    navigation: [
      {
        label: String,
        href: String,
        children: [{ label: String, href: String }],
      },
    ],
    exchangeRatesCache: {
      rates: Schema.Types.Mixed,
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

export const SiteSettings: Model<ISiteSettings> =
  mongoose.models.SiteSettings ??
  mongoose.model<ISiteSettings>("SiteSettings", SiteSettingsSchema);
