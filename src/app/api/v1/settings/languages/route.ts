import { connectDB } from "@/lib/db/mongoose";
import { getSiteLanguages, getEnabledLocaleCodes } from "@/lib/i18n/locale-registry";
import { apiSuccess } from "@/lib/api/response";
import { defaultLocale } from "@/config/locales";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();
  const languages = await getSiteLanguages();
  const enabled = await getEnabledLocaleCodes();

  return apiSuccess({
    defaultLocale,
    languages,
    enabled,
  });
}
