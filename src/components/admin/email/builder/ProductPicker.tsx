"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Search, Loader2, Package, Check } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ds/modal";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import type { ProductBlockContent } from "@/lib/email/document-schema";

interface ProductPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: (
    productId: string,
    snapshot: ProductBlockContent["productSnapshot"]
  ) => void;
  selectedProductId?: string;
}

interface ProductItem {
  _id: string;
  name: string;
  slug: string;
  price?: number;
  salePrice?: number;
  pricing?: {
    price?: number;
    compareAtPrice?: number;
    currency?: string;
  };
  variants?: Array<{
    price?: number;
    compareAtPrice?: number;
  }>;
  description?: string;
  media?: Array<{ url: string; isThumbnail?: boolean }>;
  images?: string[];
  stock?: number;
  status?: string;
}

function getProductPricing(p: ProductItem) {
  const regularPrice =
    typeof p.pricing?.price === "number"
      ? p.pricing.price
      : typeof p.price === "number"
        ? p.price
        : typeof p.variants?.[0]?.price === "number"
          ? p.variants[0].price
          : 0;

  const comparePrice =
    typeof p.pricing?.compareAtPrice === "number"
      ? p.pricing.compareAtPrice
      : typeof p.salePrice === "number"
        ? p.salePrice
        : typeof p.variants?.[0]?.compareAtPrice === "number"
          ? p.variants[0].compareAtPrice
          : undefined;

  let displayPrice = regularPrice;
  let originalPrice: number | undefined = undefined;

  if (comparePrice && comparePrice > regularPrice) {
    displayPrice = regularPrice;
    originalPrice = comparePrice;
  } else if (typeof p.salePrice === "number" && p.salePrice < regularPrice) {
    displayPrice = p.salePrice;
    originalPrice = regularPrice;
  }

  return {
    price: originalPrice ?? displayPrice,
    salePrice: originalPrice ? displayPrice : undefined,
    displayPrice,
    originalPrice,
  };
}

function normalizeCandidateSrc(src: string): string {
  let s = src.trim();
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/(brand|uploads)\//i.test(s)) {
    s = s.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, "");
  } else if (/^(brand|uploads)\//i.test(s)) {
    s = "/" + s;
  }
  return s;
}

export function extractProductImage(p: any): string {
  if (!p) return "";
  // 1. Direct image property
  if (typeof p.image === "string" && p.image.trim()) return normalizeCandidateSrc(p.image);
  if (p.image?.url && typeof p.image.url === "string") return normalizeCandidateSrc(p.image.url);

  // 2. Media array
  if (Array.isArray(p.media) && p.media.length > 0) {
    const thumb = p.media.find((m: any) => Boolean(m?.isThumbnail) && (m?.url || typeof m === "string"));
    if (thumb) {
      const u = typeof thumb === "string" ? thumb : thumb.url;
      if (u && typeof u === "string" && u.trim()) return normalizeCandidateSrc(u);
    }
    for (const m of p.media) {
      if (typeof m === "string" && m.trim()) return normalizeCandidateSrc(m);
      if (m?.url && typeof m.url === "string" && m.url.trim()) return normalizeCandidateSrc(m.url);
    }
  }

  // 3. Variant media
  if (Array.isArray(p.variants) && p.variants.length > 0) {
    for (const v of p.variants) {
      if (Array.isArray(v?.media) && v.media.length > 0) {
        for (const m of v.media) {
          if (typeof m === "string" && m.trim()) return normalizeCandidateSrc(m);
          if (m?.url && typeof m.url === "string" && m.url.trim()) return normalizeCandidateSrc(m.url);
        }
      }
    }
  }

  // 4. Images array
  if (Array.isArray(p.images) && p.images.length > 0) {
    for (const img of p.images) {
      if (typeof img === "string" && img.trim()) return normalizeCandidateSrc(img);
      if (img?.url && typeof img.url === "string" && img.url.trim()) return normalizeCandidateSrc(img.url);
    }
  }

  // 5. Thumbnail property
  if (typeof p.thumbnail === "string" && p.thumbnail.trim()) return normalizeCandidateSrc(p.thumbnail);

  return "";
}

export function ProductPicker({
  open,
  onOpenChange,
  onSelectProduct,
  selectedProductId,
}: ProductPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = query
        ? `/api/v1/admin/products?q=${encodeURIComponent(query)}&limit=20`
        : `/api/v1/admin/products?limit=20`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.data?.products) {
        setProducts(data.data.products);
      } else if (res.ok && data.products) {
        setProducts(data.products);
      } else {
        setProducts([]);
      }
    } catch {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchProducts(searchTerm);
    }
  }, [open, searchTerm, fetchProducts]);

  const handleSelect = (p: ProductItem) => {
    const imageUrl = extractProductImage(p);
    const pricing = getProductPricing(p);

    const snapshot: ProductBlockContent["productSnapshot"] = {
      name: p.name,
      slug: p.slug,
      price: pricing.price,
      salePrice: pricing.salePrice,
      currency: p.pricing?.currency || "Rs",
      image: imageUrl,
      description: p.description?.slice(0, 160) || "",
    };

    onSelectProduct(p._id, snapshot);
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Select Product from Catalog
          </ModalTitle>
        </ModalHeader>

        <div className="py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by product name, SKU or slug..."
              className="pl-9 text-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[450px] divide-y divide-gray-100 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-sm">Loading products...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-sm text-red-500">{error}</div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              No products found matching &ldquo;{searchTerm}&rdquo;
            </div>
          ) : (
            products.map((p) => {
              const isSelected = selectedProductId === p._id;
              const pricing = getProductPricing(p);
              const thumbUrl = extractProductImage(p);

              return (
                <div
                  key={p._id}
                  className={`flex items-center justify-between p-3 hover:bg-gray-50 transition cursor-pointer rounded-lg ${
                    isSelected ? "bg-indigo-50/70 border border-indigo-200" : ""
                  }`}
                  onClick={() => handleSelect(p)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-md border border-gray-200 flex-shrink-0 relative overflow-hidden">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-gray-400 m-auto" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {p.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span className="font-mono text-indigo-600 font-medium">
                          Rs {pricing.displayPrice != null ? Number(pricing.displayPrice).toLocaleString() : "0"}
                        </span>
                        {pricing.originalPrice != null && (
                          <span className="line-through text-gray-400">
                            Rs {Number(pricing.originalPrice).toLocaleString()}
                          </span>
                        )}
                        <span className="text-gray-300">•</span>
                        <span className="truncate">/{p.slug}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={isSelected ? "primary" : "secondary"}
                    className="flex-shrink-0 ml-3 gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(p);
                    }}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Selected
                      </>
                    ) : (
                      "Insert"
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
