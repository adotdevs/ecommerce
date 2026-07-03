import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IOrderTimeline {
  status: string;
  note?: string;
  at: Date;
}

export interface IOrder extends Document {
  orderNumber: string;
  userId?: mongoose.Types.ObjectId;
  email: string;
  items: {
    productId: mongoose.Types.ObjectId;
    variantId?: string;
    name: string;
    slug: string;
    image?: string;
    price: number;
    quantity: number;
    sku?: string;
  }[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  status:
    | "pending"
    | "processing"
    | "confirmed"
    | "shipped"
    | "delivered"
    | "returned"
    | "refunded"
    | "cancelled";
  timeline: IOrderTimeline[];
  shippingAddress: {
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  notes?: string;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    email: { type: String, required: true },
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
    subtotal: Number,
    shipping: Number,
    tax: Number,
    total: Number,
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "confirmed",
        "shipped",
        "delivered",
        "returned",
        "refunded",
        "cancelled",
      ],
      default: "pending",
    },
    timeline: [{ status: String, note: String, at: Date }],
    shippingAddress: {
      firstName: String,
      lastName: String,
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      phone: String,
    },
    paymentMethod: { type: String, default: "bank_transfer" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    notes: String,
  },
  { timestamps: true }
);

OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ userId: 1, createdAt: -1 });

export const Order: Model<IOrder> =
  mongoose.models.Order ?? mongoose.model<IOrder>("Order", OrderSchema);
