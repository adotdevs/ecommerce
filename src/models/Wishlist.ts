import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IWishlistItem {
  productId: mongoose.Types.ObjectId;
  addedAt: Date;
}

export interface IWishlist extends Document {
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;
  name: string;
  isPublic: boolean;
  items: IWishlistItem[];
}

const WishlistSchema = new Schema<IWishlist>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: String,
    name: { type: String, default: "My Wishlist" },
    isPublic: { type: Boolean, default: false },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

WishlistSchema.index({ userId: 1 });
WishlistSchema.index({ sessionId: 1 });

export const Wishlist: Model<IWishlist> =
  mongoose.models.Wishlist ??
  mongoose.model<IWishlist>("Wishlist", WishlistSchema);
