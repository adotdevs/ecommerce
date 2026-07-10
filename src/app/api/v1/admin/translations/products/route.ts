import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { buildProductTranslationOverlay } from "@/lib/i18n/product-translate";
import { defaultLocale, type Locale } from "@/config/locales";
import {
  isAutoTranslationAvailable,
  type TranslationProvider,
} from "@/lib/i18n/translate";
import { z } from "zod";

export const maxDuration = 300;

const getSchema = z.object({
  locale: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().optional(),
});

const postSchema = z.object({
  targetLocale: z.string().min(1),
  provider: z.enum(["openai", "mymemory", "google", "none"]).optional(),
  productId: z.string().optional(),
});

export const GET = withAuth(async (request: NextRequest) => {
  await connectDB();
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = getSchema.safeParse(params);
  const locale = parsed.success ? parsed.data.locale ?? "ar" : "ar";
  const q = parsed.success ? parsed.data.q?.trim().toLowerCase() : "";
  const limit = parsed.success ? Math.min(parsed.data.limit ?? 50, 100) : 50;

  const products = await Product.find({ status: { $in: ["published", "draft", "archived"] } })
    .select(
      "name slug status shortDescription description highlights warranty specifications faqs seo translations"
    )
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  const filtered = products
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.slug.includes(q))
    .slice(0, limit);

  const items = filtered.map((p) => {
    const tr = (p.translations as Record<string, Record<string, unknown>>)?.[
      locale
    ];
    const fields = [
      { key: "name", label: "Name", source: p.name, translated: tr?.name as string | undefined },
      {
        key: "shortDescription",
        label: "Short description",
        source: p.shortDescription ?? "",
        translated: tr?.shortDescription as string | undefined,
      },
      {
        key: "description",
        label: "Description",
        source: p.description ?? "",
        translated: tr?.description as string | undefined,
      },
      {
        key: "warranty",
        label: "Warranty",
        source: p.warranty ?? "",
        translated: tr?.warranty as string | undefined,
      },
    ];

    const highlightCount = (p.highlights as string[] | undefined)?.length ?? 0;
    const specCount = p.specifications?.length ?? 0;
    const faqCount = p.faqs?.length ?? 0;

    const translatedFields = fields.filter((f) => f.translated?.trim()).length;
    const totalFields =
      fields.filter((f) => f.source?.trim()).length +
      highlightCount +
      specCount +
      faqCount;

    return {
      id: String(p._id),
      name: p.name,
      slug: p.slug,
      status: p.status,
      fields,
      highlights: (p.highlights as string[] | undefined) ?? [],
      translatedHighlights: (tr?.highlights as string[] | undefined) ?? [],
      specCount,
      faqCount,
      translated: Boolean(tr?.name),
      coverage:
        totalFields > 0
          ? Math.round(
              ((translatedFields +
                ((tr?.highlights as string[] | undefined)?.length ?? 0) +
                ((tr?.specifications as unknown[] | undefined)?.length ?? 0) +
                ((tr?.faqs as unknown[] | undefined)?.length ?? 0)) /
                totalFields) *
                100
            )
          : 0,
    };
  });

  return apiSuccess({ locale, products: items, total: items.length });
}, PERMISSIONS.CMS_READ);

export const POST = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const { targetLocale, provider, productId } = parsed.data;

    if (!isAutoTranslationAvailable(provider)) {
      return apiError("Translation provider not available", 400);
    }

    const products = productId
      ? await Product.findById(productId).lean().then((p) => (p ? [p] : []))
      : await Product.find({
          status: { $in: ["published", "draft"] as const },
        }).lean();
    let translated = 0;

    for (const product of products) {
      const existing =
        (product.translations as Record<string, Record<string, unknown>>) ?? {};

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
        targetLocale as Locale,
        defaultLocale,
        provider
      );

      existing[targetLocale] = overlay as Record<string, unknown>;
      await Product.findByIdAndUpdate(product._id, {
        $set: { translations: existing },
      });
      translated++;
    }

    return apiSuccess({ translated, locale: targetLocale });
  } catch (err) {
    console.error(err);
    return apiError(
      err instanceof Error ? err.message : "Product translation failed",
      500
    );
  }
}, PERMISSIONS.CMS_WRITE);
