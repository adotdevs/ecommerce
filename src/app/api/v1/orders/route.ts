import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/models";
import { getAuthUser } from "@/lib/auth/session";
import { checkoutSchema } from "@/lib/validators";
import { generateOrderNumber } from "@/lib/utils";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const { items, email, shippingAddress, paymentMethod, notes } = body;
    if (!items?.length) return apiError("Cart is empty");

    const subtotal = items.reduce(
      (sum: number, i: { price: number; quantity: number }) =>
        sum + i.price * i.quantity,
      0
    );
    const shipping = subtotal >= 100 ? 0 : 9.99;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    const user = getAuthUser(request);

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      userId: user?.id,
      email: parsed.data.email ?? email,
      items,
      subtotal,
      shipping,
      tax,
      total,
      currency: "USD",
      status: "pending",
      timeline: [{ status: "pending", note: "Order placed", at: new Date() }],
      shippingAddress: parsed.data.shippingAddress ?? shippingAddress,
      paymentMethod: parsed.data.paymentMethod ?? paymentMethod,
      paymentStatus: "pending",
      notes: parsed.data.notes ?? notes,
    });

    return apiSuccess(order, 201);
  } catch (err) {
    console.error(err);
    return apiError("Failed to create order", 500);
  }
}

export async function GET(request: NextRequest) {
  await connectDB();
  const user = getAuthUser(request);
  if (!user) return apiError("Unauthorized", 401);

  const orders = await Order.find({ userId: user.id })
    .sort({ createdAt: -1 })
    .lean();

  return apiSuccess(orders);
}
