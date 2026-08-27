import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ISiteSettings extends Document {
  key: string;
  announcement?: string;
  offers?: string[];
  deliveryInfo?: string;
  supportPhone?: string;
  supportEmail?: string;
  contactLocations?: {
    countryCode: string;
    email?: string;
    phone?: string;
    address?: string;
    hours?: string;
  }[];
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
  shipping?: {
    standardRateUsd?: number;
    expressRateUsd?: number;
    overnightRateUsd?: number;
    freeShippingThresholdUsd?: number;
    countryRules?: {
      countryCode: string;
      shippingOff?: boolean;
      percentOff?: number;
      standardRateUsd?: number;
      expressRateUsd?: number;
      overnightRateUsd?: number;
      freeShippingThresholdUsd?: number;
    }[];
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
    contactLocations: [
      {
        countryCode: String,
        email: String,
        phone: String,
        address: String,
        hours: String,
      },
    ],
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
    shipping: {
      standardRateUsd: { type: Number, default: 9.99 },
      expressRateUsd: { type: Number, default: 14.99 },
      overnightRateUsd: { type: Number, default: 29.99 },
      freeShippingThresholdUsd: { type: Number, default: 100 },
      countryRules: [
        {
          countryCode: String,
          shippingOff: { type: Boolean, default: false },
          percentOff: { type: Number, default: 0 },
          standardRateUsd: Number,
          expressRateUsd: Number,
          overnightRateUsd: Number,
          freeShippingThresholdUsd: Number,
        },
      ],
    },
  },
  { timestamps: true }
);

export const SiteSettings: Model<ISiteSettings> =
  mongoose.models.SiteSettings ??
  mongoose.model<ISiteSettings>("SiteSettings", SiteSettingsSchema);
