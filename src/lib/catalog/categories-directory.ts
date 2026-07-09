import { connectDB } from "@/lib/db/mongoose";
import { Brand, Category, Product } from "@/models";

export interface CategoryDirectoryItem {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  description?: string;
  sortOrder: number;
  productCount: number;
  brands: Array<{
    _id: string;
    name: string;
    slug: string;
    logo?: string;
  }>;
}

export async function getCategoriesDirectory(opts?: {
  q?: string;
  brand?: string;
  sort?: string;
}): Promise<{
  categories: CategoryDirectoryItem[];
  brands: Array<{ _id: string; name: string; slug: string; logo?: string; categoryIds: string[] }>;
  total: number;
}> {
  await connectDB();

  const [categories, brands, counts] = await Promise.all([
    Category.find().sort({ sortOrder: 1, name: 1 }).lean(),
    Brand.find().sort({ name: 1 }).lean(),
    Product.aggregate<{ _id: unknown; count: number }>([
      { $match: { status: "published" } },
      { $unwind: "$categoryIds" },
      { $group: { _id: "$categoryIds", count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  const brandList = brands.map((b) => ({
    _id: String(b._id),
    name: b.name,
    slug: b.slug,
    logo: b.logo,
    categoryIds: (b.categoryIds ?? []).map((id) => String(id)),
  }));

  let items: CategoryDirectoryItem[] = categories.map((c) => {
    const id = String(c._id);
    const linked = brandList.filter((b) => b.categoryIds.includes(id));
    return {
      _id: id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      description: c.description,
      sortOrder: c.sortOrder ?? 0,
      productCount: countMap.get(id) ?? 0,
      brands: linked.map(({ _id, name, slug, logo }) => ({ _id, name, slug, logo })),
    };
  });

  const q = opts?.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.brands.some((b) => b.name.toLowerCase().includes(q))
    );
  }

  if (opts?.brand) {
    const brandName = opts.brand.toLowerCase();
    items = items.filter((c) =>
      c.brands.some((b) => b.name.toLowerCase() === brandName || b.slug === opts.brand)
    );
  }

  const sort = opts?.sort ?? "featured";
  if (sort === "name-asc") items.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "name-desc") items.sort((a, b) => b.name.localeCompare(a.name));
  else if (sort === "products") items.sort((a, b) => b.productCount - a.productCount);
  else items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return { categories: items, brands: brandList, total: items.length };
}
