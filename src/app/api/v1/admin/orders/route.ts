import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Order } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";

export const GET = withAuth(async (request: NextRequest) => {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const status = searchParams.get("status");
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  return apiSuccess({ orders, pagination: { page, limit, total } });
}, PERMISSIONS.ORDERS_READ);
