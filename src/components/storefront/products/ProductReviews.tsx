"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Star,
  Loader2,
  ImagePlus,
  X,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Textarea } from "@/components/ds/textarea";
import { Label } from "@/components/ds/label";
import { StarRating } from "@/components/storefront/products/StarRating";
import { reviewerInitial } from "@/lib/reviews/mask-reviewer";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/components/ds/utils";

export interface ReviewImage {
  url: string;
  alt?: string;
}

export interface ReviewItem {
  _id: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  images: ReviewImage[];
  createdAt: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

interface ProductReviewsProps {
  productSlug: string;
  initialSummary?: ReviewSummary;
}

function normalizeSummary(raw: {
  average?: number;
  count?: number;
  distribution?: Record<string | number, number>;
}): ReviewSummary {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const [k, v] of Object.entries(raw.distribution ?? {})) {
    const star = Number(k);
    if (star >= 1 && star <= 5) dist[star] = Number(v);
  }
  return {
    average: Number(raw.average ?? 0),
    count: Number(raw.count ?? 0),
    distribution: dist,
  };
}

function StarInput({
  value,
  onChange,
  size = "lg",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "md" | "lg";
}) {
  const [hover, setHover] = useState(0);
  const icon = size === "lg" ? "h-7 w-7" : "h-5 w-5";

  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const star = i + 1;
        const filled = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="rounded-sm transition-transform hover:scale-110"
            aria-label={`${star} stars`}
          >
            <Star
              className={cn(
                icon,
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-none text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function formatReviewDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function ReviewCard({ review }: { review: ReviewItem }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const displayName = review.userName;

  return (
    <article className="border-b border-border py-6 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {reviewerInitial(displayName)}
            </div>
            <div>
              <p className="font-mono text-small font-medium text-foreground">
                {displayName}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {formatReviewDate(review.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <StarRating rating={review.rating} size="sm" />
      </div>

      <h4 className="mt-4 text-body font-semibold text-foreground">{review.title}</h4>
      <p className="mt-2 text-small leading-relaxed text-muted-foreground">{review.body}</p>

      {review.images.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {review.images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setLightbox(img.url)}
              className="relative h-20 w-20 overflow-hidden rounded-[var(--radius-sm)] border border-border transition hover:ring-2 hover:ring-primary/30"
            >
              <Image
                src={img.url}
                alt={img.alt ?? `Review photo ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Review"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </article>
  );
}

export function ProductReviews({ productSlug, initialSummary }: ProductReviewsProps) {
  const t = useTranslations("reviews");
  const accessToken = useAuthStore((s) => s.accessToken);

  const [summary, setSummary] = useState<ReviewSummary>(
    initialSummary ?? {
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }
  );
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userReview, setUserReview] = useState<ReviewItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<ReviewImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchReviews = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const headers: HeadersInit = {};
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const res = await fetch(
        `/api/v1/products/${productSlug}/reviews?page=${p}&limit=8`,
        { headers }
      );
      const data = await res.json();
      if (data.success) {
        setSummary(normalizeSummary(data.data.summary));
        setReviews(data.data.reviews);
        setUserReview(data.data.userReview);
        setTotalPages(data.data.pagination.pages);
        setPage(p);
      }
    } finally {
      setLoading(false);
    }
  }, [productSlug, accessToken]);

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews]);

  useEffect(() => {
    if (userReview) {
      setRating(userReview.rating);
      setTitle(userReview.title);
      setBody(userReview.body);
      setImages(userReview.images);
    }
  }, [userReview]);

  const uploadImage = async (file: File) => {
    if (!accessToken || images.length >= 5) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/upload/review", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        setImages((prev) => [...prev, { url: data.data.url }]);
      } else {
        setError(data.error ?? t("uploadFailed"));
      }
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/v1/products/${productSlug}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ rating, title, body, images }),
      });
      const data = await res.json();
      if (data.success) {
        setSummary(normalizeSummary(data.data.summary));
        setUserReview(data.data.review);
        setSuccess(true);
        setShowForm(false);
        await fetchReviews(1);
      } else {
        setError(data.error ?? t("submitFailed"));
      }
    } catch {
      setError(t("submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid gap-8 rounded-[var(--radius-lg)] border border-border bg-card p-6 md:grid-cols-2 md:p-8">
        <div className="flex flex-col items-center justify-center text-center md:items-start md:text-left">
          <span className="text-5xl font-bold tracking-tight text-foreground">
            {summary.count > 0 ? summary.average.toFixed(1) : "—"}
          </span>
          <StarRating
            rating={summary.average}
            size="md"
            className="mt-2"
          />
          <p className="mt-2 text-small text-muted-foreground">
            {summary.count > 0
              ? t("basedOn", { count: summary.count })
              : t("noReviewsYet")}
          </p>
        </div>

        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = summary.distribution[stars] ?? 0;
            const pct = summary.count > 0 ? (count / summary.count) * 100 : 0;
            return (
              <div key={stars} className="flex items-center gap-3 text-small">
                <span className="w-8 text-muted-foreground">{stars}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Write review CTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-foreground">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-body font-semibold">
            {userReview ? t("editYourReview") : t("writeReview")}
          </h3>
        </div>
        {!accessToken ? (
          <Button variant="outline" asChild>
            <Link href="/login">{t("signInToReview")}</Link>
          </Button>
        ) : (
          <Button variant={showForm ? "secondary" : "primary"} onClick={() => setShowForm((v) => !v)}>
            {showForm ? t("cancel") : userReview ? t("editReview") : t("writeReview")}
          </Button>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-small text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t("thankYou")}
        </div>
      )}

      {showForm && accessToken && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-[var(--radius-lg)] border border-border bg-secondary/30 p-6 md:p-8"
        >
          <div>
            <Label className="mb-2 block">{t("yourRating")}</Label>
            <StarInput value={rating} onChange={setRating} size="lg" />
          </div>

          <div>
            <Label htmlFor="review-title">{t("reviewTitle")}</Label>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              className="mt-1.5"
              maxLength={120}
              required
            />
          </div>

          <div>
            <Label htmlFor="review-body">{t("yourReview")}</Label>
            <Textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("bodyPlaceholder")}
              className="mt-1.5 min-h-[120px]"
              maxLength={2000}
              required
            />
          </div>

          <div>
            <Label>{t("addPhotos")}</Label>
            <p className="mt-1 text-[12px] text-muted-foreground">{t("photosHint")}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div
                  key={img.url}
                  className="relative h-20 w-20 overflow-hidden rounded-[var(--radius-sm)] border border-border"
                >
                  <Image src={img.url} alt="" fill className="object-cover" sizes="80px" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-dashed border-border text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-[10px]">{t("addPhoto")}</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
                e.target.value = "";
              }}
            />
          </div>

          {error && <p className="text-small text-destructive">{error}</p>}

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submitReview")
            )}
          </Button>
        </form>
      )}

      {/* Review list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-border py-12 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-body text-muted-foreground">{t("beFirst")}</p>
        </div>
      ) : (
        <div>
          {reviews.map((review) => (
            <ReviewCard key={review._id} review={review} />
          ))}

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => fetchReviews(page - 1)}
              >
                {t("previous")}
              </Button>
              <span className="flex items-center px-3 text-small text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => fetchReviews(page + 1)}
              >
                {t("next")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
