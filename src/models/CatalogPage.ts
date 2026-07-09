import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { Locale } from "@/config/locales";

export type CatalogPageSlug =
  | "all"
  | "new-arrivals"
  | "bestsellers"
  | "deals"
  | "search"
  | "categories";

export interface ICatalogPage extends Document {
  slug: CatalogPageSlug;
  /** Master content (admin source language) */
  config: Record<string, unknown>;
  translations: Partial<Record<Locale, Record<string, unknown>>>;
  sourceLocale: Locale;
  translationStatus: "idle" | "pending" | "completed" | "failed";
  translationError?: string;
  lastTranslatedAt?: Date;
}

const CatalogPageSchema = new Schema<ICatalogPage>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      enum: ["all", "new-arrivals", "bestsellers", "deals", "search", "categories"],
    },
    config: { type: Schema.Types.Mixed, default: {} },
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

CatalogPageSchema.index({ slug: 1 }, { unique: true });

export const CatalogPage: Model<ICatalogPage> =
  mongoose.models.CatalogPage ??
  mongoose.model<ICatalogPage>("CatalogPage", CatalogPageSchema);
