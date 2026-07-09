import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/db/mongoose";
import { Product, Category, CmsPage } from "@/models";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    await connectDB();
    const [products, categories, pages] = await Promise.all([
      Product.find({ status: "published" }).select("slug updatedAt").lean(),
      Category.find().select("slug updatedAt").lean(),
      CmsPage.find({ status: "published" }).select("slug updatedAt").lean(),
    ]);

    return [
      { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
      { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
      { url: `${baseUrl}/categories`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
      { url: `${baseUrl}/new-arrivals`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
      { url: `${baseUrl}/bestsellers`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
      { url: `${baseUrl}/deals`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
      ...products.map((p) => ({
        url: `${baseUrl}/products/${p.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...categories.map((c) => ({
        url: `${baseUrl}/categories/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...pages.map((p) => ({
        url: `${baseUrl}/pages/${p.slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    ];
  } catch {
    return [{ url: baseUrl, lastModified: new Date() }];
  }
}
