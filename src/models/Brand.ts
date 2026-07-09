import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IBrand extends Document {
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  /** Categories this brand belongs to */
  categoryIds: mongoose.Types.ObjectId[];
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
    categoryIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Category" }],
      default: [],
    },
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
  },
  { timestamps: true }
);

BrandSchema.index({ slug: 1 }, { unique: true });
BrandSchema.index({ categoryIds: 1 });

export const Brand: Model<IBrand> =
  mongoose.models.Brand ?? mongoose.model<IBrand>("Brand", BrandSchema);
