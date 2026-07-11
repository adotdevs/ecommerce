import { connectDB } from "@/lib/db/mongoose";
import { SiteSettings } from "@/models";
import { apiSuccess } from "@/lib/api/response";
import { toPublicSiteSettings } from "@/lib/site/branding";

export async function GET() {
  await connectDB();
  const settings = await SiteSettings.findOne({ key: "global" }).lean();
  return apiSuccess(toPublicSiteSettings(settings));
}
