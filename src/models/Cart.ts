import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  variantId?: string;
  name: string;
  slug: string;
  image?: string;
  price: number;
  quantity: number;
  sku?: string;
}

export interface ICart extends Document {
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;
  items: ICartItem[];
  coupons: string[];
}

const CartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: String,
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        variantId: String,
        name: String,
        slug: String,
        image: String,
        price: Number,
        quantity: Number,
        sku: String,
      },
    ],
    coupons: [String],
  },
  { timestamps: true }
);

CartSchema.index({ userId: 1 });
CartSchema.index({ sessionId: 1 });
CartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const Cart: Model<ICart> =
  mongoose.models.Cart ?? mongoose.model<ICart>("Cart", CartSchema);
