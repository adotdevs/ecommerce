import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Order, Product } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";
import { shouldRestockOnStatusChange } from "@/lib/inventory/stock";
import { restoreProductStock } from "@/lib/inventory/stock.server";

export const GET = withAuth(async (_request, { params }) => {
  await connectDB();
  const order = await Order.findById(params?.id).lean();
  if (!order) return apiNotFound();
  return apiSuccess(order);
}, PERMISSIONS.ORDERS_READ);

export const PATCH = withAuth(async (request: NextRequest, { params }) => {
  try {
    await connectDB();
    const body = await request.json();
    const { status, note } = body;

    const order = await Order.findById(params?.id);
    if (!order) return apiNotFound();

    const previousStatus = order.status;

    if (status) {
      order.status = status;
      order.timeline.push({
        status,
        note: note ?? `Status updated to ${status}`,
        at: new Date(),
      });
    }

    await order.save();

    if (
      status &&
      shouldRestockOnStatusChange(previousStatus, status)
    ) {
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (!product) continue;
        await restoreProductStock(
          product,
          item.variantId,
          item.quantity
        );
      }
    }

    return apiSuccess(order);
  } catch (err) {
    console.error(err);
    return apiError("Failed to update order", 500);
  }
}, PERMISSIONS.ORDERS_WRITE);
