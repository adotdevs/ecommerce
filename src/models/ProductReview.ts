import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IProductReview extends Document {
  productId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  rating: number;
  title: string;
  body: string;
  images: { url: string; alt?: string }[];
  status: "published" | "hidden";
  source: "customer" | "admin";
  createdAt?: Date;
  updatedAt?: Date;
}

const ProductReviewSchema = new Schema<IProductReview>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 2000 },
    images: [
      {
        url: { type: String, required: true },
        alt: String,
      },
    ],
    status: {
      type: String,
      enum: ["published", "hidden"],
      default: "published",
    },
    source: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
  },
  { timestamps: true }
);

ProductReviewSchema.index({ productId: 1, createdAt: -1 });
ProductReviewSchema.index(
  { productId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { source: "customer" } }
);

if (mongoose.models.ProductReview) {
  delete mongoose.models.ProductReview;
}

export const ProductReview: Model<IProductReview> = mongoose.model<IProductReview>(
  "ProductReview",
  ProductReviewSchema
);
