import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { Locale } from "@/config/locales";

export interface IHomepageSection extends Document {
  type: string;
  order: number;
  enabled: boolean;
  schedule?: { start?: Date; end?: Date };
  /** Master content (admin source language, default English) */
  config: Record<string, unknown>;
  /** Auto-generated localized overlays per locale */
  translations: Partial<Record<Locale, Record<string, unknown>>>;
  sourceLocale: Locale;
  translationStatus: "idle" | "pending" | "completed" | "failed";
  translationError?: string;
  lastTranslatedAt?: Date;
}

const HomepageSectionSchema = new Schema<IHomepageSection>(
  {
    type: { type: String, required: true },
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
    schedule: {
      start: Date,
      end: Date,
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

HomepageSectionSchema.index({ order: 1, enabled: 1 });

export const HomepageSection: Model<IHomepageSection> =
  mongoose.models.HomepageSection ??
  mongoose.model<IHomepageSection>("HomepageSection", HomepageSectionSchema);
