import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IBrand extends Document {
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

const BrandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    logo: String,
    description: String,
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
  },
  { timestamps: true }
);

BrandSchema.index({ slug: 1 }, { unique: true });

export const Brand: Model<IBrand> =
  mongoose.models.Brand ?? mongoose.model<IBrand>("Brand", BrandSchema);
