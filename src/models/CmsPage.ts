import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { Locale } from "@/config/locales";
import type { CmsPageSlug } from "@/lib/cms/cms-pages";

export interface ICmsPage extends Document {
  title: string;
  slug: CmsPageSlug | string;
  /** Structured page copy — every storefront string lives here */
  content: Record<string, unknown>;
  blocks: {
    id: string;
    type: string;
    config: Record<string, unknown>;
  }[];
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
    canonical?: string;
    ogImage?: string;
  };
  publishedAt?: Date;
  status: "draft" | "published";
  translations: Partial<Record<Locale, Record<string, unknown>>>;
  sourceLocale: Locale;
  translationStatus: "idle" | "pending" | "completed" | "failed";
  translationError?: string;
  lastTranslatedAt?: Date;
}

const CmsBlockSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const CmsPageSchema = new Schema<ICmsPage>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: Schema.Types.Mixed, default: {} },
    blocks: { type: [CmsBlockSchema], default: [] },
    seo: {
      title: String,
      description: String,
      keywords: [String],
      canonical: String,
      ogImage: String,
    },
    publishedAt: Date,
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    translations: { type: Schema.Types.Mixed, default: {} },
    sourceLocale: { type: String, default: "en" },
    translationStatus: {
      type: String,
      enum: ["idle", "pending", "completed", "failed"],
      default: "idle",
    },
    translationError: String,
    lastTranslatedAt: Date,
  },
  { timestamps: true }
);

export const CmsPage: Model<ICmsPage> =
  mongoose.models.CmsPage ??
  mongoose.model<ICmsPage>("CmsPage", CmsPageSchema);
