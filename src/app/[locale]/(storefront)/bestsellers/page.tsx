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
  return buildCatalogMetadata("bestsellers", locale);
}

export default async function BestsellersPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const sp = await searchParams;
  return renderCatalogPage({
    slug: "bestsellers",
    locale,
    searchParams: { ...sp, sort: sp.sort ?? "bestsellers" },
    basePath: "/bestsellers",
  });
}
