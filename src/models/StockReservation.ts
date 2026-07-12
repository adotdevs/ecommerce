import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IStockReservation extends Document {
  sessionId: string;
  productId: mongoose.Types.ObjectId;
  variantId: string;
  quantity: number;
}

const StockReservationSchema = new Schema<IStockReservation>(
  {
    sessionId: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

StockReservationSchema.index(
  { sessionId: 1, productId: 1, variantId: 1 },
  { unique: true }
);
StockReservationSchema.index({ productId: 1, variantId: 1 });
StockReservationSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 60 * 60 * 2 }
);

export const StockReservation: Model<IStockReservation> =
  mongoose.models.StockReservation ??
  mongoose.model<IStockReservation>("StockReservation", StockReservationSchema);
