import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Wishlist, Product } from "@/models";
import { getAuthUser } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/api/response";

async function getOrCreateWishlist(userId?: string, sessionId?: string) {
  const query = userId ? { userId } : { sessionId };
  let list = await Wishlist.findOne(query);
  if (!list) {
    list = await Wishlist.create({ ...query, items: [] });
  }
  return list;
}

export async function GET(request: NextRequest) {
  await connectDB();
  const user = getAuthUser(request);
  const sessionId = request.headers.get("x-session-id") ?? undefined;
  const list = await getOrCreateWishlist(user?.id, sessionId);

  const products = await Product.find({
    _id: { $in: list.items.map((i) => i.productId) },
    status: "published",
  }).lean();

  return apiSuccess({ items: list.items, products });
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUser(request);
    const sessionId = request.headers.get("x-session-id") ?? undefined;
    const { productId } = await request.json();
    if (!productId) return apiError("productId required");

    const list = await getOrCreateWishlist(user?.id, sessionId);
    if (!list.items.some((i) => i.productId.toString() === productId)) {
      list.items.push({ productId, addedAt: new Date() });
      await list.save();
    }
    return apiSuccess(list);
  } catch {
    return apiError("Failed to add to wishlist", 500);
  }
}

export async function DELETE(request: NextRequest) {
  await connectDB();
  const user = getAuthUser(request);
  const sessionId = request.headers.get("x-session-id") ?? undefined;
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  const list = await getOrCreateWishlist(user?.id, sessionId);
  if (productId) {
    list.items = list.items.filter((i) => i.productId.toString() !== productId);
  } else {
    list.items = [];
  }
  await list.save();
  return apiSuccess(list);
}
