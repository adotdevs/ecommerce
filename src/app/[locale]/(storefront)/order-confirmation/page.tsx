"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ds/button";
import { Suspense } from "react";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="mb-6 text-6xl">✓</div>
      <h1 className="text-3xl font-bold">Order Confirmed!</h1>
      {orderNumber && (
        <p className="mt-2 text-muted-foreground">
          Order number: <strong>{orderNumber}</strong>
        </p>
      )}
      <p className="mt-4 text-muted-foreground">
        Thank you for your purchase. You will receive a confirmation email shortly.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Button asChild>
          <Link href="/products">Continue Shopping</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/account">View Orders</Link>
        </Button>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationContent />
    </Suspense>
  );
}
