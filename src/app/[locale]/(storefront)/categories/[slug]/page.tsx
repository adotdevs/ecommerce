import type { Metadata } from "next";
import { Suspense } from "react";
import type { Locale } from "@/config/locales";
import { connectDB } from "@/lib/db/mongoose";
import { Brand, Category } from "@/models";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CategoryProductsView } from "@/components/storefront/catalog/CategoryProductsView";
import { ProductSkeletonGrid } from "@/components/storefront/catalog/ProductSkeletonCard";
import { queryCatalogProducts } from "@/lib/catalog/query";
import type { CatalogSearchParams } from "@/lib/catalog/render-page";

interface PageProps {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connectDB();
  const { slug } = await params;
  const category = await Category.findOne({ slug }).lean();
  if (!category) return { title: "Category" };
  return {
    title: category.seo?.title || category.name,
    description: category.seo?.description || category.description,
  };
}

export default async function CategoryDetailPage({ params, searchParams }: PageProps) {
  await connectDB();
  const { slug, locale } = await params;
  const sp = await searchParams;
  const category = await Category.findOne({ slug }).lean();
  if (!category) notFound();

  const t = await getTranslations({ locale, namespace: "catalog" });
  // Infinite scroll always starts from the first page.
  const page = 1;
  const availability =
    sp.availability === "in-stock" || sp.availability === "out-of-stock"
      ? sp.availability
      : undefined;

  const [brands, result] = await Promise.all([
    Brand.find({ categoryIds: category._id })
      .sort({ name: 1 })
      .select("name slug logo")
      .lean(),
    queryCatalogProducts({
      page,
      limit: 12,
      category: category.name,
      q: sp.q,
      sort: sp.sort,
      brand: sp.brand,
      minPrice: sp.minPrice ? Number(sp.minPrice) : undefined,
      maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
      onSale: sp.onSale === "1",
      featured: sp.featured === "1",
      minRating: sp.minRating ? Number(sp.minRating) : undefined,
      availability,
      locale,
    }),
  ]);

  return (
    <Suspense
      fallback={
        <div className="catalog-page">
          <div className="catalog-page__inner">
            <ProductSkeletonGrid count={8} />
          </div>
        </div>
      }
    >
      <CategoryProductsView
        category={{
          name: category.name,
          slug,
          description: category.description ?? undefined,
          image: category.image ?? undefined,
        }}
        brands={brands.map((b) => ({
          name: b.name,
          slug: b.slug,
          logo: b.logo ?? undefined,
        }))}
        products={result.products}
        total={result.total}
        facets={{
          ...result.facets,
          brands: brands.map((b) => ({ name: b.name, slug: b.slug })),
        }}
        page={result.page}
        pages={result.pages}
        labels={{
          home: t("breadcrumbHome"),
          categories: t("breadcrumbCategories"),
          brandsInCategory: t("brandsInCategory"),
          collection: t("collection"),
          allCategoriesCta: t("allCategoriesCta"),
        }}
      />
    </Suspense>
  );
}
