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

export const changeEmailSchema = z.object({
  action: z.literal("email"),
  newEmail: z.string().email(),
  currentPassword: z.string().min(1),
});

export const changePasswordSchema = z
  .object({
    action: z.literal("password"),
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changeAccountSchema = z.discriminatedUnion("action", [
  changeEmailSchema,
  changePasswordSchema,
]);

const productMediaSchema = z.object({
  url: z.string().min(1),
  alt: z.string().optional(),
  type: z.enum(["image", "video"]).default("image"),
  sortOrder: z.number().default(0),
});

const variantOptionValueSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  hex: z.string().optional(),
});

const variantOptionGroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.string(),
  values: z.array(variantOptionValueSchema),
});

const productVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  price: z.number().min(0),
  compareAtPrice: z.number().optional(),
  stock: z.number().min(0).default(0),
  attributes: z.record(z.string(), z.string()).default({}),
});

const keyValueSchema = z.object({
  section: z.string().optional(),
  key: z.string().min(1),
  value: z.string().min(1),
});

const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const productFieldsSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  brandId: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  media: z.array(productMediaSchema).optional(),
  variants: z.array(productVariantSchema).optional(),
  variantOptions: z.array(variantOptionGroupSchema).optional(),
  pricing: z.object({
    price: z.number().min(0),
    compareAtPrice: z.number().optional().nullable(),
    currency: z.string().default("USD"),
  }),
  inventory: z
    .object({
      stock: z.number().min(0).default(0),
      lowStockThreshold: z.number().default(5),
      trackInventory: z.boolean().default(true),
    })
    .optional(),
  weight: z.number().optional().nullable(),
  dimensions: z
    .object({
      length: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      unit: z.string().default("cm"),
    })
    .optional()
    .nullable(),
  specifications: z.array(keyValueSchema).optional(),
  faqs: z.array(faqSchema).optional(),
  warranty: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  featured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      canonical: z.string().optional(),
      ogImage: z.string().optional(),
    })
    .optional(),
});

export const productSchema = productFieldsSchema;

export const productUpdateSchema = productFieldsSchema.partial();

export const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  parentId: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  sortOrder: z.number().default(0),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
});

export const brandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  logo: z.string().optional(),
  description: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
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
