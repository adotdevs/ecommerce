import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { apiSuccess, apiError } from "@/lib/api/response";
import { resolveStockLimits } from "@/lib/inventory/stock";

const schema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().optional(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const { items } = parsed.data;
    if (!items.length) {
      return apiSuccess({ items: [] });
    }

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await Product.find({
      _id: { $in: productIds },
      status: "published",
    })
      .select("variants inventory status")
      .lean();

    const limits = resolveStockLimits(products, items);
    return apiSuccess({ items: limits });
  } catch (err) {
    console.error(err);
    return apiError("Failed to check stock", 500);
  }
}
