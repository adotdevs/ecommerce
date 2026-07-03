import { connectDB } from "@/lib/db/mongoose";
import { Category } from "@/models";
import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  await connectDB();
  const categories = await Category.find().sort({ sortOrder: 1 }).lean();
  return apiSuccess(categories);
}
