import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { Product, ProductReview } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { defaultLocale, type Locale } from "@/config/locales";
import { getSiteLanguages } from "@/lib/i18n/locale-registry";
import {
  buildReviewTranslationOverlay,
  reviewTranslationCoverage,
} from "@/lib/i18n/review-translate";
import { getTranslationProviderInfo } from "@/lib/i18n/site-translate";
import {
  isAutoTranslationAvailable,
  type TranslationProvider,
} from "@/lib/i18n/translate";

export const maxDuration = 300;

const getSchema = z.object({
  locale: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  untranslatedOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

const patchSchema = z.object({
  locale: z.string().min(2),
  reviewId: z.string().min(1),
  title: z.string(),
  body: z.string(),
});

const postSchema = z.object({
  targetLocale: z.string().min(2).optional(),
  allLocales: z.boolean().optional(),
  reviewId: z.string().optional(),
  provider: z.enum(["openai", "mymemory", "google", "none"]).optional(),
});

export const GET = withAuth(async (request: NextRequest) => {
  await connectDB();

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = getSchema.safeParse(params);
  const locale = parsed.success ? parsed.data.locale ?? "ar" : "ar";
  const q = parsed.success ? parsed.data.q?.trim().toLowerCase() ?? "" : "";
  const page = parsed.success ? Math.max(1, parsed.data.page ?? 1) : 1;
  const limit = parsed.success ? Math.min(parsed.data.limit ?? 50, 100) : 50;
  const untranslatedOnly = parsed.success ? parsed.data.untranslatedOnly : false;
  const skip = (page - 1) * limit;

  const languages = await getSiteLanguages();
  const enabled = languages.filter((l) => l.enabled !== false);
  const targetLocales = enabled
    .map((l) => l.code)
    .filter((code) => code !== defaultLocale);

  const [reviews, totalPublished] = await Promise.all([
    ProductReview.find({ status: "published" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ProductReview.countDocuments({ status: "published" }),
  ]);

  const productIds = [...new Set(reviews.map((r) => String(r.productId)))];
  const products = await Product.find({ _id: { $in: productIds } })
    .select("name slug")
    .lean();
  const productMap = new Map(
    products.map((p) => [String(p._id), { name: p.name, slug: p.slug }])
  );

  let items = reviews.map((review) => {
    const product = productMap.get(String(review.productId));
    const tr = (review.translations as Record<string, { title?: string; body?: string }>)?.[
      locale
    ];
    const coverage = reviewTranslationCoverage(
      {
        title: review.title,
        body: review.body,
        translations: review.translations as Record<
          string,
          { title?: string; body?: string }
        >,
      },
      locale
    );

    return {
      id: String(review._id),
      productId: String(review.productId),
      productName: product?.name ?? "Unknown product",
      productSlug: product?.slug ?? "",
      userName: review.userName,
      rating: review.rating,
      sourceTitle: review.title,
      sourceBody: review.body,
      translatedTitle: tr?.title,
      translatedBody: tr?.body,
      translated: coverage.percent === 100,
      coverage: coverage.percent,
      createdAt: review.createdAt?.toISOString(),
    };
  });

  if (q) {
    items = items.filter(
      (item) =>
        item.productName.toLowerCase().includes(q) ||
        item.sourceTitle.toLowerCase().includes(q) ||
        item.sourceBody.toLowerCase().includes(q) ||
        (item.translatedTitle ?? "").toLowerCase().includes(q) ||
        (item.translatedBody ?? "").toLowerCase().includes(q)
    );
  }

  if (untranslatedOnly) {
    items = items.filter((item) => !item.translated);
  }

  const allReviews = await ProductReview.find({ status: "published" })
    .select("title body translations")
    .lean();

  const localeCoverage: Record<
    string,
    { translated: number; total: number; percent: number }
  > = {};

  for (const target of targetLocales) {
    let translated = 0;
    for (const review of allReviews) {
      const coverage = reviewTranslationCoverage(
        {
          title: review.title,
          body: review.body,
          translations: review.translations as Record<
            string,
            { title?: string; body?: string }
          >,
        },
        target
      );
      if (coverage.percent === 100) translated++;
    }
    localeCoverage[target] = {
      translated,
      total: allReviews.length,
      percent:
        allReviews.length > 0
          ? Math.round((translated / allReviews.length) * 100)
          : 0,
    };
  }

  return apiSuccess({
    locale,
    reviews: items,
    pagination: {
      page,
      limit,
      total: totalPublished,
      pages: Math.max(1, Math.ceil(totalPublished / limit)),
    },
    localeCoverage,
    totalReviews: allReviews.length,
    provider: getTranslationProviderInfo(),
  });
}, PERMISSIONS.CMS_READ);

export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const { locale, reviewId, title, body: reviewBody } = parsed.data;
    if (locale === defaultLocale) {
      return apiError("English is the source language.", 400);
    }

    const review = await ProductReview.findById(reviewId);
    if (!review) return apiError("Review not found", 404);

    const existing =
      (review.translations as Record<string, { title?: string; body?: string }>) ??
      {};
    existing[locale] = {
      title: title.trim(),
      body: reviewBody.trim(),
    };
    review.translations = existing;
    await review.save();

    return apiSuccess({ reviewId, locale });
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Could not save review translation",
      500
    );
  }
}, PERMISSIONS.CMS_WRITE);

export const POST = withAuth(async (request: NextRequest) => {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const { targetLocale, allLocales, reviewId, provider } = parsed.data;

    if (!isAutoTranslationAvailable(provider)) {
      return apiError("Translation provider not available", 400);
    }

    const languages = await getSiteLanguages();
    const locales = languages
      .filter((l) => l.enabled !== false && l.code !== defaultLocale)
      .map((l) => l.code);

    const targets = allLocales ? locales : targetLocale ? [targetLocale] : [];

    if (targets.length === 0) {
      return apiError("Pick a target language or use allLocales.", 400);
    }

    const reviews = reviewId
      ? await ProductReview.find({ _id: reviewId, status: "published" }).lean()
      : await ProductReview.find({ status: "published" }).lean();

    const results: { locale: string; translated: number }[] = [];

    for (const locale of targets) {
      let translated = 0;
      for (const review of reviews) {
        const overlay = await buildReviewTranslationOverlay(
          { title: review.title, body: review.body },
          locale as Locale,
          defaultLocale,
          provider as TranslationProvider | undefined
        );

        const existing =
          (review.translations as Record<string, { title?: string; body?: string }>) ??
          {};
        existing[locale] = overlay;

        await ProductReview.findByIdAndUpdate(review._id, {
          $set: { translations: existing },
        });
        translated++;
      }
      results.push({ locale, translated });
    }

    return apiSuccess({ results, reviewCount: reviews.length });
  } catch (err) {
    console.error(err);
    return apiError(
      err instanceof Error ? err.message : "Review translation failed",
      500
    );
  }
}, PERMISSIONS.CMS_WRITE);
