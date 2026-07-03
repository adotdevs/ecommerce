import { connectDB } from "@/lib/db/mongoose";
import { SiteSettings } from "@/models";
import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  await connectDB();
  const settings = await SiteSettings.findOne({ key: "global" }).lean();
  if (!settings) return apiSuccess(null);

  return apiSuccess({
    announcement: settings.announcement,
    offers: settings.offers,
    deliveryInfo: settings.deliveryInfo,
    supportPhone: settings.supportPhone,
    supportEmail: settings.supportEmail,
    logo: settings.logo,
    logoDark: settings.logoDark,
    currencies: settings.currencies,
    languages: settings.languages,
    countries: settings.countries,
    defaultCurrency: settings.defaultCurrency,
    defaultLanguage: settings.defaultLanguage,
    defaultCountry: settings.defaultCountry,
    navigation: settings.navigation,
    seo: settings.seo,
  });
}
