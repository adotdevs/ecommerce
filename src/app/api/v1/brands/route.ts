import { connectDB } from "@/lib/db/mongoose";
import { Brand } from "@/models";
import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  await connectDB();
  const brands = await Brand.find().sort({ name: 1 }).lean();
  return apiSuccess(brands);
}
