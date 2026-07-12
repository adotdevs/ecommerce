import mongoose from "mongoose";
import { Product, StockReservation } from "@/models";
import {
  resolveAvailableStock,
  isCartLineValid,
  type StockLineInput,
} from "@/lib/inventory/stock";

export interface ReservationLineInput extends StockLineInput {
  quantity: number;
}

export interface ReservationLineResult {
  productId: string;
  variantId?: string;
  allowedQuantity: number;
  maxQuantity: number;
  available: number;
  valid: boolean;
}

function reservationKey(productId: string, variantId?: string) {
  return `${productId}:${variantId ?? ""}`;
}

function normalizeVariantId(variantId?: string) {
  return variantId ?? "";
}

export async function getOtherReservedQuantity(
  productId: string,
  variantId: string | undefined,
  sessionId: string
): Promise<number> {
  const rows = await StockReservation.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
        variantId: normalizeVariantId(variantId),
        sessionId: { $ne: sessionId },
      },
    },
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ]);

  return Math.max(0, rows[0]?.total ?? 0);
}

export async function reserveCartLines(
  sessionId: string,
  lines: ReservationLineInput[]
): Promise<ReservationLineResult[]> {
  if (!sessionId || !lines.length) return [];

  const productIds = [...new Set(lines.map((l) => l.productId))];
  const products = await Product.find({
    _id: { $in: productIds },
    status: "published",
  }).select("variants inventory status");

  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const results: ReservationLineResult[] = [];

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      for (const line of lines) {
        const product = productMap.get(line.productId);
        const valid = isCartLineValid(product, line.variantId);
        const trackInventory = product?.inventory?.trackInventory !== false;

        if (!product || !valid) {
          await StockReservation.deleteOne(
            {
              sessionId,
              productId: line.productId,
              variantId: normalizeVariantId(line.variantId),
            },
            { session }
          );
          results.push({
            productId: line.productId,
            variantId: line.variantId,
            allowedQuantity: 0,
            maxQuantity: 0,
            available: 0,
            valid: false,
          });
          continue;
        }

        if (!trackInventory) {
          const qty = Math.max(0, line.quantity);
          if (qty <= 0) {
            await StockReservation.deleteOne(
              {
                sessionId,
                productId: line.productId,
                variantId: normalizeVariantId(line.variantId),
              },
              { session }
            );
          } else {
            await StockReservation.findOneAndUpdate(
              {
                sessionId,
                productId: line.productId,
                variantId: normalizeVariantId(line.variantId),
              },
              { quantity: qty },
              { upsert: true, session }
            );
          }
          results.push({
            productId: line.productId,
            variantId: line.variantId,
            allowedQuantity: qty,
            maxQuantity: qty,
            available: qty,
            valid: true,
          });
          continue;
        }

        const available = resolveAvailableStock(product, line.variantId);
        const otherHeld = await getOtherReservedQuantity(
          line.productId,
          line.variantId,
          sessionId
        );
        const maxQuantity = Math.max(0, available - otherHeld);
        const allowedQuantity = Math.min(Math.max(0, line.quantity), maxQuantity);

        if (allowedQuantity <= 0) {
          await StockReservation.deleteOne(
            {
              sessionId,
              productId: line.productId,
              variantId: normalizeVariantId(line.variantId),
            },
            { session }
          );
        } else {
          await StockReservation.findOneAndUpdate(
            {
              sessionId,
              productId: line.productId,
              variantId: normalizeVariantId(line.variantId),
            },
            { quantity: allowedQuantity },
            { upsert: true, session }
          );
        }

        results.push({
          productId: line.productId,
          variantId: line.variantId,
          allowedQuantity,
          maxQuantity,
          available,
          valid: true,
        });
      }
    });
  } finally {
    await session.endSession();
  }

  return results;
}

export async function releaseSessionReservations(sessionId: string): Promise<void> {
  if (!sessionId) return;
  await StockReservation.deleteMany({ sessionId });
}

export function reservationResultsToStockLimits(
  results: ReservationLineResult[]
) {
  return results.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    available: line.available,
    maxQuantity: line.maxQuantity,
    valid: line.valid,
    hasVariants: false,
    inStock: line.maxQuantity > 0,
    canQuickAdd: false,
  }));
}

export { reservationKey };
