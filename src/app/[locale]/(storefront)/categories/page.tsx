import type { Metadata } from "next";
import type { Locale } from "@/config/locales";
import { getLocalizedCatalogPage } from "@/lib/cms/catalog-page-content";
import { getCategoriesDirectory } from "@/lib/catalog/categories-directory";
import { CategoriesDirectory } from "@/components/storefront/catalog/CategoriesDirectory";

interface PageProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string; brand?: string; sort?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const content = await getLocalizedCatalogPage("categories", locale);
  return {
    title: content.seoTitle || content.title,
    description: content.seoDescription || content.subtitle,
  };
}

export default async function CategoriesIndexPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const sp = await searchParams;
  const [content, directory] = await Promise.all([
    getLocalizedCatalogPage("categories", locale),
    getCategoriesDirectory({
      q: sp.q,
      brand: sp.brand,
      sort: sp.sort,
    }),
  ]);

  return (
    <CategoriesDirectory
      content={content}
      categories={directory.categories}
      brands={directory.brands}
      total={directory.total}
    />
  );
}
