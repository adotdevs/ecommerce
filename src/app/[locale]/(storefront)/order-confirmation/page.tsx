"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SuccessOrder } from "@/components/storefront/checkout/SuccessOrder";
import type { PlacedOrderResult } from "@/lib/checkout/types";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") ?? "—";
  const email = searchParams.get("email") ?? "";
  const total = parseFloat(searchParams.get("total") ?? "0");

  const order: PlacedOrderResult = {
    orderNumber,
    email: email || "your email",
    total: Number.isFinite(total) ? total : 0,
    currency: "USD",
    paymentMethod: "card",
    createdAt: new Date().toISOString(),
  };

  return <SuccessOrder order={order} />;
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmationContent />
    </Suspense>
  );
}
