import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Order, Product, PromoCode } from "@/models";
import { getAuthUser } from "@/lib/auth/session";
import { checkoutSchema } from "@/lib/validators";
import { generateOrderNumber } from "@/lib/utils";
import { apiSuccess, apiError } from "@/lib/api/response";
import {
  resolveAvailableStock,
  cartLineRequiresVariant,
} from "@/lib/inventory/stock";
import {
  deductProductStockAtomic,
  restoreProductStockAtomic,
} from "@/lib/inventory/stock.server";
import { releaseSessionReservations } from "@/lib/inventory/reservations";
import { calculateShippingUsd } from "@/lib/checkout/shipping";
import { ESTIMATED_TAX_RATE } from "@/lib/cart/display";
import {
  calculatePromoDiscountUsd,
  normalizePromoCode,
  validatePromoForOrder,
} from "@/lib/promo/validate";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const { items, email, shippingAddress, paymentMethod, notes, sessionId, shippingMethod, promoCode } =
      body;
    if (!items?.length) return apiError("Cart is empty");

    const productIds = Array.from(
      new Set(
        (items as { productId: string }[]).map((item) => item.productId)
      )
    );
    const products = await Product.find({
      _id: { $in: productIds },
      status: "published",
    });

    const productMap = new Map(products.map((p) => [String(p._id), p]));

    for (const item of items as {
      productId: string;
      variantId?: string;
      name: string;
      quantity: number;
    }[]) {
      const product = productMap.get(String(item.productId));
      if (!product) {
        return apiError(`Product unavailable: ${item.name}`, 409);
      }
      if (cartLineRequiresVariant(product, item.variantId)) {
        return apiError(
          `Please select product options for ${item.name}`,
          409
        );
      }
      if (product.inventory?.trackInventory === false) continue;
      const available = resolveAvailableStock(product, item.variantId);
      if (available < item.quantity) {
        return apiError(`Insufficient stock for ${item.name}`, 409);
      }
    }

    const subtotal = items.reduce(
      (sum: number, i: { price: number; quantity: number }) =>
        sum + i.price * i.quantity,
      0
    );
    const method =
      parsed.data.shippingMethod ??
      shippingMethod ??
      "standard";
    const shipping = calculateShippingUsd(subtotal, method);

    let discount = 0;
    let appliedPromoCode: string | undefined;
    const rawPromo = parsed.data.promoCode ?? promoCode;
    if (rawPromo) {
      const code = normalizePromoCode(String(rawPromo));
      const promo = await PromoCode.findOne({ code }).lean();
      const promoResult = validatePromoForOrder(promo, subtotal);
      if (!promoResult.valid) return apiError(promoResult.error, 400);
      discount = calculatePromoDiscountUsd(subtotal, promoResult.percentOff);
      appliedPromoCode = promoResult.code;
    }

    const taxable = Math.max(0, subtotal - discount);
    const tax = taxable * ESTIMATED_TAX_RATE;
    const total = subtotal + shipping + tax - discount;

    const user = getAuthUser(request);

    const deducted: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      name: string;
    }> = [];

    for (const item of items as {
      productId: string;
      variantId?: string;
      name: string;
      quantity: number;
    }[]) {
      try {
        await deductProductStockAtomic(
          String(item.productId),
          item.variantId,
          item.quantity
        );
        deducted.push(item);
      } catch (err) {
        for (const line of deducted) {
          await restoreProductStockAtomic(
            String(line.productId),
            line.variantId,
            line.quantity
          );
        }
        if (err instanceof Error && err.message.includes("stock")) {
          return apiError(`Insufficient stock for ${item.name}`, 409);
        }
        return apiError(`Product unavailable: ${item.name}`, 409);
      }
    }

    if (sessionId) {
      await releaseSessionReservations(sessionId);
    }

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
      promoCode: appliedPromoCode,
      discount,
      notes: parsed.data.notes ?? notes,
    });

    if (appliedPromoCode) {
      await PromoCode.updateOne(
        { code: appliedPromoCode },
        { $inc: { usedCount: 1 } }
      );
    }

    return apiSuccess(order, 201);
  } catch (err) {
    console.error(err);
    if (err instanceof Error && err.message.includes("stock")) {
      return apiError(err.message, 409);
    }
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
