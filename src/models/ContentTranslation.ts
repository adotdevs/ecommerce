import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { Locale } from "@/config/locales";

/**
 * Stores admin-managed translatable strings with Google Translate snapshots.
 * Used for site-wide copy beyond static JSON message files.
 */
export interface IContentTranslation extends Document {
  namespace: string;
  key: string;
  sourceLocale: Locale;
  sourceText: string;
  translations: Partial<Record<Locale, string>>;
  autoTranslated: boolean;
  lastTranslatedAt?: Date;
}

const ContentTranslationSchema = new Schema<IContentTranslation>(
  {
    namespace: { type: String, required: true, index: true },
    key: { type: String, required: true, index: true },
    sourceLocale: { type: String, default: "en" },
    sourceText: { type: String, required: true },
    translations: { type: Schema.Types.Mixed, default: {} },
    autoTranslated: { type: Boolean, default: true },
    lastTranslatedAt: Date,
  },
  { timestamps: true }
);

ContentTranslationSchema.index({ namespace: 1, key: 1 }, { unique: true });

export const ContentTranslation: Model<IContentTranslation> =
  mongoose.models.ContentTranslation ??
  mongoose.model<IContentTranslation>("ContentTranslation", ContentTranslationSchema);
