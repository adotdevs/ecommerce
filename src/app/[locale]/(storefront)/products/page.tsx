import type { Metadata } from "next";
import type { Locale } from "@/config/locales";
import {
  buildCatalogMetadata,
  renderCatalogPage,
  type CatalogSearchParams,
} from "@/lib/catalog/render-page";

interface PageProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildCatalogMetadata("all", locale);
}

export default async function ProductsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const sp = await searchParams;
  const slug = sp.q ? "search" : "all";
  return renderCatalogPage({
    slug,
    locale,
    searchParams: sp,
    basePath: "/products",
  });
}
