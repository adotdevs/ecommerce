import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { CompareList, Product } from "@/models";
import { getAuthUser } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/api/response";

const MAX = 4;

async function getOrCreateCompare(userId?: string, sessionId?: string) {
  const query = userId ? { userId } : { sessionId };
  let list = await CompareList.findOne(query);
  if (!list) {
    list = await CompareList.create({ ...query, productIds: [] });
  }
  return list;
}

export async function GET(request: NextRequest) {
  await connectDB();
  const user = getAuthUser(request);
  const sessionId = request.headers.get("x-session-id") ?? undefined;
  const list = await getOrCreateCompare(user?.id, sessionId);

  const products = await Product.find({
    _id: { $in: list.productIds },
    status: "published",
  }).lean();

  return apiSuccess({ productIds: list.productIds, products });
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUser(request);
    const sessionId = request.headers.get("x-session-id") ?? undefined;
    const { productId } = await request.json();
    if (!productId) return apiError("productId required");

    const list = await getOrCreateCompare(user?.id, sessionId);
    const ids = list.productIds.map((id) => id.toString());
    if (ids.includes(productId)) return apiSuccess(list);
    if (ids.length >= MAX) return apiError(`Maximum ${MAX} products`, 400);

    list.productIds.push(productId);
    await list.save();
    return apiSuccess(list);
  } catch {
    return apiError("Failed to add to compare", 500);
  }
}

export async function DELETE(request: NextRequest) {
  await connectDB();
  const user = getAuthUser(request);
  const sessionId = request.headers.get("x-session-id") ?? undefined;
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  const list = await getOrCreateCompare(user?.id, sessionId);
  if (productId) {
    list.productIds = list.productIds.filter(
      (id) => id.toString() !== productId
    );
  } else {
    list.productIds = [];
  }
  await list.save();
  return apiSuccess(list);
}
