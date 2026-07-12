import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IPromoCode extends Document {
  code: string;
  percentOff: number;
  active: boolean;
  minOrderUsd?: number;
  maxUses?: number;
  usedCount: number;
  expiresAt?: Date;
  description?: string;
}

const PromoCodeSchema = new Schema<IPromoCode>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    percentOff: { type: Number, required: true, min: 1, max: 100 },
    active: { type: Boolean, default: true },
    minOrderUsd: { type: Number, min: 0 },
    maxUses: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0 },
    expiresAt: Date,
    description: String,
  },
  { timestamps: true }
);

PromoCodeSchema.index({ code: 1 }, { unique: true });

export const PromoCode: Model<IPromoCode> =
  mongoose.models.PromoCode ??
  mongoose.model<IPromoCode>("PromoCode", PromoCodeSchema);
