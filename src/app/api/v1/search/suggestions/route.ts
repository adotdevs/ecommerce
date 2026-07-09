import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { searchSuggestions } from "@/lib/search/products";

export async function GET(request: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(12, Math.max(1, parseInt(searchParams.get("limit") ?? "8", 10) || 8));

  const result = await searchSuggestions(q, { limit });

  return NextResponse.json(
    { success: true, data: result },
    {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
      },
    }
  );
}
