"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { ProductForm, productToFormData } from "@/components/admin/products/ProductForm";
import { Button } from "@/components/ds/button";
import { Badge } from "@/components/ds/badge";
import { Loader2, ExternalLink, Trash2, MessageSquare } from "lucide-react";
import { ProductReviewsManager } from "@/components/admin/products/ProductReviewsManager";
import { toast, toastError } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showReviews, setShowReviews] = useState(false);

  useEffect(() => {
    if (!accessToken || !productId) return;
    fetch(`/api/v1/admin/products/${productId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProduct(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [accessToken, productId]);

  const handleDelete = async () => {
    if (!accessToken) return;
    if (!confirm(`Delete "${product?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.success) {
        toast({ variant: "success", title: "Product deleted" });
        router.push("/admin/products");
      } else {
        toastError("Delete failed", data.error);
      }
    } catch {
      toastError("Delete failed", "Network error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg font-medium">Product not found</p>
        <Button asChild className="mt-4">
          <Link href="/admin/products">Back to products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-display-h2 text-foreground">Edit product</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-body text-muted-foreground">{String(product.name)}</p>
            <Badge
              variant={product.status === "published" ? "default" : "secondary"}
            >
              {String(product.status)}
            </Badge>
            {Boolean(product.featured) && <Badge variant="outline">Best Seller</Badge>}
            {Boolean(product.isNewArrival) && (
              <Badge variant="outline">New Arrival</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReviews((v) => !v)}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            {showReviews ? "Hide reviews" : "Reviews"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`/products/${product.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on store
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-destructive hover:text-destructive"
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </Button>
        </div>
      </div>

      {showReviews && accessToken && (
        <ProductReviewsManager
          productId={productId}
          productName={String(product.name)}
          accessToken={accessToken}
        />
      )}

      <ProductForm
        productId={productId}
        initialData={productToFormData(product)}
      />
    </div>
  );
}
