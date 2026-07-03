import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { searchSuggestions } from "@/lib/search/products";
import { apiSuccess } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const suggestions = await searchSuggestions(q);
  return apiSuccess(suggestions);
}
