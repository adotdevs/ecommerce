import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ICompareList extends Document {
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;
  productIds: mongoose.Types.ObjectId[];
}

const CompareListSchema = new Schema<ICompareList>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: String,
    productIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

CompareListSchema.index({ userId: 1 });
CompareListSchema.index({ sessionId: 1 });

export const CompareList: Model<ICompareList> =
  mongoose.models.CompareList ??
  mongoose.model<ICompareList>("CompareList", CompareListSchema);
