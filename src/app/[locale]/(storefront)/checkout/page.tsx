"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStockLimits } from "@/hooks/use-cart-stock-limits";
import { useCartHydrated } from "@/hooks/use-cart-hydrated";
import { useCurrency, useCountry } from "@/stores/locale-store";
import { useFormattedPrice } from "@/hooks/use-formatted-price";
import { toastError } from "@/hooks/use-toast";
import { getCartItemKey } from "@/lib/cart/display";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const tCart = useTranslations("cart");
  const ta = useTranslations("auth");
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const sessionId = useCartStore((s) => s.sessionId);
  const clearCart = useCartStore((s) => s.clearCart);
  const hydrated = useCartHydrated();
  useCartStockLimits(hydrated);
  const { accessToken, user } = useAuthStore();
  const currency = useCurrency();
  const country = useCountry();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: user?.email ?? "",
    firstName: "",
    lastName: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: country,
    phone: "",
    paymentMethod: "bank_transfer",
  });

  const subtotalUsd = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );
  const shippingUsd = subtotalUsd >= 100 ? 0 : 9.99;
  const taxUsd = subtotalUsd * 0.08;
  const grandTotalUsd = subtotalUsd + shippingUsd + taxUsd;

  const subtotalFmt = useFormattedPrice(subtotalUsd);
  const shippingFmt = useFormattedPrice(shippingUsd);
  const taxFmt = useFormattedPrice(taxUsd);
  const totalFmt = useFormattedPrice(grandTotalUsd);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          email: form.email,
          currency,
          sessionId,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            name: i.name,
            slug: i.slug,
            image: i.image,
            price: i.price,
            quantity: i.quantity,
          })),
          shippingAddress: {
            firstName: form.firstName,
            lastName: form.lastName,
            street: form.street,
            city: form.city,
            state: form.state,
            postalCode: form.postalCode,
            country: form.country,
            phone: form.phone,
          },
          paymentMethod: form.paymentMethod,
        }),
      });

      const data = await res.json();
      if (data.success) {
        clearCart();
        router.push(`/order-confirmation?order=${data.data.orderNumber}`);
      } else {
        toastError(t("orderFailed"), data.error ?? t("orderFailedDesc"));
      }
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">{t("empty")}</h1>
        <Button className="mt-4 rounded-full" onClick={() => router.push("/products")}>
          {tc("shopNow")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold">{t("title")}</h1>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader><CardTitle>{t("contact")}</CardTitle></CardHeader>
            <CardContent>
              <Label htmlFor="email">{ta("email")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("shipping")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {(["firstName", "lastName", "street", "city", "state", "postalCode", "phone"] as const).map(
                (field) => (
                  <div key={field} className={field === "street" ? "sm:col-span-2" : ""}>
                    <Label htmlFor={field} className="capitalize">
                      {field.replace(/([A-Z])/g, " $1")}
                    </Label>
                    <Input
                      id={field}
                      required={field !== "phone"}
                      value={form[field]}
                      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    />
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="sticky top-24">
            <CardHeader><CardTitle>{t("orderSummary")}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {items.map((item) => (
                <CheckoutLine key={getCartItemKey(item)} item={item} />
              ))}
              <div className="border-t border-border pt-2 space-y-2">
                <div className="flex justify-between"><span>{tCart("subtotal")}</span><span>{subtotalFmt}</span></div>
                <div className="flex justify-between"><span>{tCart("shipping")}</span><span>{shippingUsd === 0 ? tc("free") : shippingFmt}</span></div>
                <div className="flex justify-between"><span>{tCart("tax")}</span><span>{taxFmt}</span></div>
                <div className="flex justify-between text-lg font-bold"><span>{tCart("total")}</span><span>{totalFmt}</span></div>
              </div>
              <Button type="submit" className="mt-4 w-full rounded-full max-md:h-12 max-md:min-h-[48px]" size="lg" disabled={loading}>
                {loading ? t("processing") : t("placeOrder")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

function CheckoutLine({
  item,
}: {
  item: { productId: string; name: string; price: number; quantity: number };
}) {
  const formatted = useFormattedPrice(item.price * item.quantity);
  return (
    <div className="flex justify-between gap-2">
      <span className="truncate">{item.name} × {item.quantity}</span>
      <span className="shrink-0">{formatted}</span>
    </div>
  );
}
