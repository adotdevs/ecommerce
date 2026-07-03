import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { HomepageSection } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { homepageSectionSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/api/response";

export const GET = withAuth(async () => {
  await connectDB();
  const sections = await HomepageSection.find().sort({ order: 1 }).lean();
  return apiSuccess(sections);
}, PERMISSIONS.CMS_READ);

export const POST = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = homepageSectionSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const count = await HomepageSection.countDocuments();
    const section = await HomepageSection.create({
      ...parsed.data,
      order: parsed.data.order ?? count,
    });
    return apiSuccess(section, 201);
  } catch {
    return apiError("Failed to create section", 500);
  }
}, PERMISSIONS.CMS_WRITE);
