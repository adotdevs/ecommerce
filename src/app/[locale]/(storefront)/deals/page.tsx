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
  return buildCatalogMetadata("deals", locale);
}

export default async function DealsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const sp = await searchParams;
  return renderCatalogPage({
    slug: "deals",
    locale,
    searchParams: { ...sp, sort: sp.sort ?? "deals", onSale: sp.onSale ?? "1" },
    basePath: "/deals",
  });
}
