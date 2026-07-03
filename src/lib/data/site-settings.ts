import { connectDB } from "@/lib/db/mongoose";
import { SiteSettings } from "@/models";

export async function getSiteSettings() {
  try {
    await connectDB();
    const settings = await SiteSettings.findOne({ key: "global" }).lean();
    return settings;
  } catch {
    return null;
  }
}
