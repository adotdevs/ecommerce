import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IProduct extends Document {
  name: string;
  slug: string;
  sku: string;
  barcode?: string;
  brandId?: mongoose.Types.ObjectId;
  brandName?: string;
  categoryIds: mongoose.Types.ObjectId[];
  categoryNames: string[];
  tags: string[];
  description?: string;
  shortDescription?: string;
  highlights?: string[];
  media: {
    url: string;
    alt?: string;
    type: "image" | "video";
    sortOrder: number;
  }[];
  variants: {
    id: string;
    name: string;
    sku: string;
    price: number;
    compareAtPrice?: number;
    stock: number;
    attributes: Record<string, string>;
  }[];
  variantOptions: {
    id: string;
    name: string;
    type: string;
    values: { value: string; label: string; hex?: string }[];
  }[];
  pricing: {
    price: number;
    compareAtPrice?: number;
    currency: string;
  };
  inventory: {
    stock: number;
    lowStockThreshold: number;
    trackInventory: boolean;
  };
  weight?: number;
  dimensions?: { length: number; width: number; height: number; unit: string };
  specifications: { section?: string; key: string; value: string }[];
  faqs: { question: string; answer: string }[];
  warranty?: string;
  translations?: Record<
    string,
    {
      name?: string;
      description?: string;
      shortDescription?: string;
      seo?: {
        title?: string;
        description?: string;
        keywords?: string[];
      };
    }
  >;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
    canonical?: string;
    ogImage?: string;
  };
  status: "draft" | "published" | "archived";
  featured: boolean;
  isNewArrival: boolean;
  onSale: boolean;
  flashSale: boolean;
  rating: {
    average: number;
    count: number;
  };
}

const VariantOptionValueSchema = new Schema(
  {
    value: String,
    label: String,
    hex: String,
  },
  { _id: false }
);

const VariantOptionGroupSchema = new Schema(
  {
    id: String,
    name: String,
    type: { type: String },
    values: { type: [VariantOptionValueSchema], default: [] },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    sku: { type: String, required: true, unique: true },
    barcode: String,
    brandId: { type: Schema.Types.ObjectId, ref: "Brand" },
    brandName: String,
    categoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    categoryNames: [String],
    tags: [String],
    description: String,
    shortDescription: String,
    highlights: [String],
    media: [
      {
        url: String,
        alt: String,
        type: { type: String, enum: ["image", "video"], default: "image" },
        sortOrder: { type: Number, default: 0 },
      },
    ],
    variants: [
      {
        id: String,
        name: String,
        sku: String,
        price: Number,
        compareAtPrice: Number,
        stock: Number,
        attributes: Schema.Types.Mixed,
      },
    ],
    variantOptions: { type: [VariantOptionGroupSchema], default: [] },
    pricing: {
      price: { type: Number, required: true },
      compareAtPrice: Number,
      currency: { type: String, default: "USD" },
    },
    inventory: {
      stock: { type: Number, default: 0 },
      lowStockThreshold: { type: Number, default: 5 },
      trackInventory: { type: Boolean, default: true },
    },
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: { type: String, default: "cm" },
    },
    specifications: [{ section: String, key: String, value: String }],
    faqs: [{ question: String, answer: String }],
    warranty: String,
    translations: Schema.Types.Mixed,
    seo: {
      title: String,
      description: String,
      keywords: [String],
      canonical: String,
      ogImage: String,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    featured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    onSale: { type: Boolean, default: false },
    flashSale: { type: Boolean, default: false },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ sku: 1 }, { unique: true });
ProductSchema.index({ status: 1, featured: 1 });
ProductSchema.index({ status: 1, flashSale: 1 });
ProductSchema.index({ status: 1, onSale: 1 });
ProductSchema.index({ name: "text", description: "text", shortDescription: "text", brandName: "text", categoryNames: "text", tags: "text", sku: "text", "seo.title": "text" });

if (mongoose.models.Product) {
  delete mongoose.models.Product;
}

export const Product: Model<IProduct> = mongoose.model<IProduct>(
  "Product",
  ProductSchema
);
