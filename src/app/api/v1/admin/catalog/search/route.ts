import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { searchCatalogSuggestions } from "@/lib/cms/catalog-search";

export const GET = withAuth(async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get("q");
  const typeParam = request.nextUrl.searchParams.get("type") ?? "product";
  const type = typeParam === "category" ? "category" : "product";

  if (!q?.trim()) return apiError("Query required", 400);

  await connectDB();
  const suggestions = await searchCatalogSuggestions(type, q);
  return apiSuccess(suggestions);
}, PERMISSIONS.CMS_READ);
