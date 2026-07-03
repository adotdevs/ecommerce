"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useCompareStore } from "@/stores/compare-store";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";
import { Button } from "@/components/ds/button";

interface CompareProduct {
  _id: string;
  name: string;
  slug: string;
  brandName?: string;
  pricing: { price: number };
  media?: { url: string }[];
  specifications?: { key: string; value: string }[];
  inventory?: { stock: number };
}

export default function ComparePage() {
  const t = useTranslations("compare");
  const tc = useTranslations("common");
  const { productIds, removeProduct, clear } = useCompareStore();
  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productIds.length === 0) {
      setProducts([]);
      return;
    }
    setLoading(true);
    fetch(`/api/v1/products/batch?ids=${productIds.join(",")}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.data ?? []))
      .finally(() => setLoading(false));
  }, [productIds]);

  if (productIds.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">{t("empty")}</h1>
        <p className="mt-2 text-muted-foreground">{t("emptyDesc")}</p>
        <Button className="mt-8 rounded-full" asChild>
          <Link href="/products">{tc("shopNow")}</Link>
        </Button>
      </div>
    );
  }

  const specKeys = [
    ...new Set(products.flatMap((p) => p.specifications?.map((s) => s.key) ?? [])),
  ];

  return (
    <div className="mx-auto max-w-7xl overflow-x-auto px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button variant="outline" size="sm" onClick={clear}>
          {t("clear")}
        </Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">{tc("loading")}</p>
      ) : (
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b p-3 text-left font-medium text-muted-foreground" />
              {products.map((p) => (
                <th key={p._id} className="border-b p-3 text-left align-top">
                  <div className="relative mb-2 h-32 w-full overflow-hidden rounded-xl bg-muted">
                    {p.media?.[0] && (
                      <Image src={p.media[0].url} alt={p.name} fill className="object-cover" />
                    )}
                  </div>
                  <Link href={`/products/${p.slug}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-auto p-0 text-xs text-destructive"
                    onClick={() => removeProduct(p._id)}
                  >
                    {t("remove")}
                  </Button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-b p-3 font-medium">Brand</td>
              {products.map((p) => (
                <td key={p._id} className="border-b p-3">{p.brandName ?? "—"}</td>
              ))}
            </tr>
            <tr>
              <td className="border-b p-3 font-medium">Price</td>
              {products.map((p) => (
                <td key={p._id} className="border-b p-3">
                  <PriceDisplay amountUsd={p.pricing.price} />
                </td>
              ))}
            </tr>
            <tr>
              <td className="border-b p-3 font-medium">Stock</td>
              {products.map((p) => (
                <td key={p._id} className="border-b p-3">
                  {p.inventory?.stock ?? 0}
                </td>
              ))}
            </tr>
            {specKeys.map((key) => (
              <tr key={key}>
                <td className="border-b p-3 font-medium">{key}</td>
                {products.map((p) => (
                  <td key={p._id} className="border-b p-3">
                    {p.specifications?.find((s) => s.key === key)?.value ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
