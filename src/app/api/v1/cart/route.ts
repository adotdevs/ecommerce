import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Cart } from "@/models";
import { getAuthUser } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/api/response";

async function getOrCreateCart(userId?: string, sessionId?: string) {
  const query = userId ? { userId } : { sessionId };
  let cart = await Cart.findOne(query);
  if (!cart) {
    cart = await Cart.create({ ...query, items: [] });
  }
  return cart;
}

export async function GET(request: NextRequest) {
  await connectDB();
  const user = getAuthUser(request);
  const sessionId = request.headers.get("x-session-id") ?? undefined;

  const cart = await getOrCreateCart(user?.id, sessionId);
  return apiSuccess(cart);
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUser(request);
    const sessionId = request.headers.get("x-session-id") ?? undefined;
    const { item } = await request.json();

    const cart = await getOrCreateCart(user?.id, sessionId);
    const existingIdx = cart.items.findIndex(
      (i) => i.productId.toString() === item.productId && i.variantId === item.variantId
    );

    if (existingIdx >= 0) {
      cart.items[existingIdx].quantity += item.quantity ?? 1;
    } else {
      cart.items.push(item);
    }

    await cart.save();
    return apiSuccess(cart);
  } catch {
    return apiError("Failed to add to cart", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUser(request);
    const sessionId = request.headers.get("x-session-id") ?? undefined;
    const { productId, variantId, quantity } = await request.json();

    const cart = await getOrCreateCart(user?.id, sessionId);
    const idx = cart.items.findIndex(
      (i) => i.productId.toString() === productId && i.variantId === variantId
    );

    if (idx >= 0) {
      if (quantity <= 0) {
        cart.items.splice(idx, 1);
      } else {
        cart.items[idx].quantity = quantity;
      }
    }

    await cart.save();
    return apiSuccess(cart);
  } catch {
    return apiError("Failed to update cart", 500);
  }
}

export async function DELETE(request: NextRequest) {
  await connectDB();
  const user = getAuthUser(request);
  const sessionId = request.headers.get("x-session-id") ?? undefined;
  const cart = await getOrCreateCart(user?.id, sessionId);
  cart.items = [];
  await cart.save();
  return apiSuccess(cart);
}
