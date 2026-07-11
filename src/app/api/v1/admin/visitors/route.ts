import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { VisitorLog } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess } from "@/lib/api/response";

export const GET = withAuth(async (request: NextRequest) => {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10) || 25)
  );
  const q = searchParams.get("q")?.trim();
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (q) {
    filter.$or = [
      { ip: { $regex: q, $options: "i" } },
      { "geo.city": { $regex: q, $options: "i" } },
      { "geo.country": { $regex: q, $options: "i" } },
      { "geo.countryCode": { $regex: q, $options: "i" } },
      { landingPath: { $regex: q, $options: "i" } },
      { browser: { $regex: q, $options: "i" } },
      { referrer: { $regex: q, $options: "i" } },
    ];
  }

  const [visitors, total] = await Promise.all([
    VisitorLog.find(filter).sort({ visitedAt: -1 }).skip(skip).limit(limit).lean(),
    VisitorLog.countDocuments(filter),
  ]);

  return apiSuccess({
    visitors,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}, PERMISSIONS.ANALYTICS_READ);
