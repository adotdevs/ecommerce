"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Textarea } from "@/components/ds/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { StarRating } from "@/components/storefront/products/StarRating";
import { maskReviewerName } from "@/lib/reviews/mask-reviewer";
import { toast, toastError } from "@/hooks/use-toast";
import { Loader2, MessageSquare, Sparkles, Trash2, X } from "lucide-react";

interface ReviewSummary {
  average: number;
  count: number;
}

interface AdminReview {
  _id: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  source?: string;
}

interface ProductReviewsManagerProps {
  productId: string;
  productName: string;
  accessToken: string;
  onClose?: () => void;
  compact?: boolean;
}

export function ProductReviewsManager({
  productId,
  productName,
  accessToken,
  onClose,
  compact,
}: ProductReviewsManagerProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [addingManual, setAddingManual] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({ average: 0, count: 0 });

  const [genForm, setGenForm] = useState({
    count: "12",
    targetAverage: "4.6",
    dateRangeDays: "90",
    notes: "",
  });

  const [manualForm, setManualForm] = useState({
    userName: "",
    rating: "5",
    title: "",
    body: "",
    createdAt: "",
  });

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}/reviews`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setReviews(data.data.reviews ?? []);
        setSummary(data.data.summary ?? { average: 0, count: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [productId, accessToken]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mode: "generate",
          count: parseInt(genForm.count) || 10,
          targetAverage: parseFloat(genForm.targetAverage) || 4.5,
          dateRangeDays: parseInt(genForm.dateRangeDays) || 90,
          notes: genForm.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toastError("Generate failed", data.error);
        return;
      }
      setSummary(data.data.summary);
      await loadReviews();
      toast({
        variant: "success",
        title: "Reviews added",
        description: `${data.data.created} reviews generated for ${productName}.`,
      });
    } catch {
      toastError("Generate failed", "Network error.");
    } finally {
      setGenerating(false);
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingManual(true);
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mode: "manual",
          userName: manualForm.userName.trim(),
          rating: parseInt(manualForm.rating) || 5,
          title: manualForm.title.trim(),
          body: manualForm.body.trim(),
          createdAt: manualForm.createdAt
            ? new Date(manualForm.createdAt).toISOString()
            : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toastError("Add failed", data.error);
        return;
      }
      setSummary(data.data.summary);
      setManualForm({
        userName: "",
        rating: "5",
        title: "",
        body: "",
        createdAt: "",
      });
      await loadReviews();
      toast({ variant: "success", title: "Review added" });
    } catch {
      toastError("Add failed", "Network error.");
    } finally {
      setAddingManual(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Delete this review?")) return;
    setDeletingId(reviewId);
    try {
      const res = await fetch(
        `/api/v1/admin/products/${productId}/reviews/${reviewId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await res.json();
      if (!data.success) {
        toastError("Delete failed", data.error);
        return;
      }
      setSummary(data.data.summary);
      setReviews((list) => list.filter((r) => r._id !== reviewId));
    } catch {
      toastError("Delete failed", "Network error.");
    } finally {
      setDeletingId(null);
    }
  };

  const content = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{productName}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold">
              {summary.count > 0 ? summary.average.toFixed(1) : "—"}
            </span>
            <StarRating rating={summary.average} size="sm" />
            <span className="text-sm text-muted-foreground">
              ({summary.count} reviews)
            </span>
          </div>
        </div>
        {onClose && (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Generate reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[13px] text-muted-foreground">
            Creates realistic shopper reviews with varied dates and usernames. No
            customer sign-in required. Storefront shows masked names like{" "}
            <span className="font-mono">ah****32</span>.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Number of reviews</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={genForm.count}
                onChange={(e) =>
                  setGenForm({ ...genForm, count: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target average rating</Label>
              <Input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={genForm.targetAverage}
                onChange={(e) =>
                  setGenForm({ ...genForm, targetAverage: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date spread (days back)</Label>
              <Input
                type="number"
                min={1}
                max={730}
                value={genForm.dateRangeDays}
                onChange={(e) =>
                  setGenForm({ ...genForm, dateRangeDays: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Extra notes (optional)</Label>
              <Textarea
                value={genForm.notes}
                onChange={(e) =>
                  setGenForm({ ...genForm, notes: e.target.value })
                }
                rows={2}
                placeholder="e.g. mention fast shipping, sizing, battery life…"
              />
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate reviews
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add single review</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddManual} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Reviewer username</Label>
                <Input
                  value={manualForm.userName}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, userName: e.target.value })
                  }
                  placeholder="ahmar92"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rating</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={manualForm.rating}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, rating: e.target.value })
                  }
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} stars
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Review date (optional)</Label>
                <Input
                  type="date"
                  value={manualForm.createdAt}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, createdAt: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={manualForm.title}
                onChange={(e) =>
                  setManualForm({ ...manualForm, title: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Review text</Label>
              <Textarea
                value={manualForm.body}
                onChange={(e) =>
                  setManualForm({ ...manualForm, body: e.target.value })
                }
                rows={3}
                required
              />
            </div>
            <Button type="submit" variant="outline" disabled={addingManual}>
              {addingManual ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Add review
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="h-4 w-4" />
          Existing reviews
        </h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {reviews.map((r) => (
              <div
                key={r._id}
                className="flex gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.userName}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      → {maskReviewerName(r.userName)}
                    </span>
                    <StarRating rating={r.rating} size="sm" />
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 font-medium">{r.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-muted-foreground">
                    {r.body}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-destructive"
                  disabled={deletingId === r._id}
                  onClick={() => handleDelete(r._id)}
                >
                  {deletingId === r._id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (compact) {
    return content;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>Product reviews</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
