import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { apiSuccess, apiError } from "@/lib/api/response";
import { queryCatalogProducts } from "@/lib/catalog/query";
import type { CatalogPageSlug } from "@/models/CatalogPage";
import type { Locale } from "@/config/locales";
import { locales, defaultLocale } from "@/config/locales";

const PRESETS = new Set<CatalogPageSlug>([
  "all",
  "search",
  "new-arrivals",
  "bestsellers",
  "deals",
  "categories",
]);

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") ?? "1", 10) || 1;
    const limit = parseInt(searchParams.get("limit") ?? "12", 10) || 12;
    const presetRaw = searchParams.get("preset") ?? "all";
    const preset = PRESETS.has(presetRaw as CatalogPageSlug)
      ? (presetRaw as CatalogPageSlug)
      : "all";
    const localeParam = searchParams.get("locale") ?? defaultLocale;
    const locale = (
      (locales as readonly string[]).includes(localeParam)
        ? localeParam
        : defaultLocale
    ) as Locale;

    const availabilityRaw = searchParams.get("availability");
    const availability =
      availabilityRaw === "in-stock" || availabilityRaw === "out-of-stock"
        ? availabilityRaw
        : undefined;

    const result = await queryCatalogProducts({
      preset,
      page,
      limit,
      q: searchParams.get("q") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      brand: searchParams.get("brand") ?? undefined,
      minPrice: searchParams.get("minPrice")
        ? Number(searchParams.get("minPrice"))
        : undefined,
      maxPrice: searchParams.get("maxPrice")
        ? Number(searchParams.get("maxPrice"))
        : undefined,
      onSale: searchParams.get("onSale") === "1",
      featured: searchParams.get("featured") === "1",
      minRating: searchParams.get("minRating")
        ? Number(searchParams.get("minRating"))
        : undefined,
      availability,
      locale,
    });

    return apiSuccess({
      products: result.products,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      },
    });
  } catch (error) {
    console.error("[catalog/products]", error);
    return apiError("Failed to load catalog products", 500);
  }
}
