import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  await connectDB();
  const ids = request.nextUrl.searchParams.get("ids")?.split(",").filter(Boolean);
  if (!ids?.length) return apiError("ids query param required");

  const products = await Product.find({
    _id: { $in: ids },
    status: "published",
  }).lean();

  return apiSuccess(products);
}
