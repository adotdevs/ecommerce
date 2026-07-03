import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  sku: z.string().min(1),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  brandId: z.string().optional(),
  brandName: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  categoryNames: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  pricing: z.object({
    price: z.number().min(0),
    compareAtPrice: z.number().optional(),
    currency: z.string().default("USD"),
  }),
  inventory: z
    .object({
      stock: z.number().min(0).default(0),
      lowStockThreshold: z.number().default(5),
      trackInventory: z.boolean().default(true),
    })
    .optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  featured: z.boolean().default(false),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  parentId: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  sortOrder: z.number().default(0),
});

export const brandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  logo: z.string().optional(),
  description: z.string().optional(),
});

export const homepageSectionSchema = z.object({
  type: z.string(),
  order: z.number().default(0),
  enabled: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const cmsPageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  blocks: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        config: z.record(z.string(), z.unknown()),
      })
    )
    .default([]),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const checkoutSchema = z.object({
  email: z.string().email(),
  shippingAddress: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1),
    phone: z.string().optional(),
  }),
  paymentMethod: z.enum(["stripe", "paypal", "bank_transfer"]).default("bank_transfer"),
  notes: z.string().optional(),
});
