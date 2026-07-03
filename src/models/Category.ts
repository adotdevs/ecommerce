import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ICategory extends Document {
  name: string;
  slug: string;
  parentId?: mongoose.Types.ObjectId;
  image?: string;
  description?: string;
  sortOrder: number;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Category" },
    image: String,
    description: String,
    sortOrder: { type: Number, default: 0 },
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
  },
  { timestamps: true }
);

CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ parentId: 1, sortOrder: 1 });

export const Category: Model<ICategory> =
  mongoose.models.Category ??
  mongoose.model<ICategory>("Category", CategorySchema);
