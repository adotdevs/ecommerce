"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";
import { Button } from "@/components/ds/button";
import { Badge } from "@/components/ds/badge";

interface Order {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
}

export default function AccountPage() {
  const t = useTranslations("account");
  const { accessToken, user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/v1/orders", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => setOrders(d.data ?? []));
  }, [accessToken]);

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <Button asChild className="rounded-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold">{t("title")}</h1>
      <p className="mb-8 text-muted-foreground">{user.email}</p>

      <section>
        <h2 className="mb-4 text-lg font-medium">{t("orders")}</h2>
        {orders.length === 0 ? (
          <p className="text-muted-foreground">{t("noOrders")}</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order._id}
                className="flex items-center justify-between rounded-xl border border-border/60 p-4"
              >
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">{order.status}</Badge>
                  <PriceDisplay amountUsd={order.total} className="font-semibold" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
