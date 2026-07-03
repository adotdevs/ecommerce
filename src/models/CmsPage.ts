import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ICmsPage extends Document {
  title: string;
  slug: string;
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
}

const CmsPageSchema = new Schema<ICmsPage>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    blocks: [
      {
        id: String,
        type: String,
        config: Schema.Types.Mixed,
      },
    ],
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
  },
  { timestamps: true }
);

CmsPageSchema.index({ slug: 1 }, { unique: true });

export const CmsPage: Model<ICmsPage> =
  mongoose.models.CmsPage ??
  mongoose.model<ICmsPage>("CmsPage", CmsPageSchema);
