import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api/response";
import { buildProductTranslationOverlay } from "@/lib/i18n/product-translate";
import { getSiteLanguages } from "@/lib/i18n/locale-registry";
import { defaultLocale, type Locale } from "@/config/locales";
import { isAutoTranslationAvailable, type TranslationProvider } from "@/lib/i18n/translate";
import { z } from "zod";

const schema = z.object({
  provider: z.enum(["openai", "mymemory", "google", "none"]).optional(),
  locales: z.array(z.string()).optional(),
});

export const POST = withAuth(async (request: NextRequest, { params }) => {
  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    const provider = parsed.success ? parsed.data.provider : undefined;

    if (!isAutoTranslationAvailable(provider)) {
      return apiError("Translation provider not available", 400);
    }

    const product = await Product.findById(params?.id).lean();
    if (!product) return apiNotFound();

    const languages = await getSiteLanguages();
    const targetLocales = (parsed.success && parsed.data.locales?.length
      ? parsed.data.locales
      : languages
          .filter((l) => l.enabled !== false && l.code !== defaultLocale)
          .map((l) => l.code)) as Locale[];

    const existing =
      (product.translations as Record<string, Record<string, unknown>>) ?? {};

    for (const locale of targetLocales) {
      const overlay = await buildProductTranslationOverlay(
        {
          name: product.name,
          description: product.description,
          shortDescription: product.shortDescription,
          highlights: product.highlights as string[] | undefined,
          warranty: product.warranty,
          seo: product.seo,
          specifications: product.specifications,
          faqs: product.faqs,
          variantOptions: product.variantOptions as never,
          variants: product.variants,
        },
        locale,
        defaultLocale,
        provider
      );
      existing[locale] = overlay as Record<string, unknown>;
    }

    await Product.findByIdAndUpdate(params?.id, {
      $set: { translations: existing },
    });

    return apiSuccess({
      translated: targetLocales.length,
      locales: targetLocales,
    });
  } catch (err) {
    console.error(err);
    return apiError(
      err instanceof Error ? err.message : "Product translation failed",
      500
    );
  }
}, PERMISSIONS.PRODUCTS_WRITE);
