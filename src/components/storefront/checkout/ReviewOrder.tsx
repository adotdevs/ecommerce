"use client";

import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import Image from "next/image";
import { CheckoutCard } from "@/components/storefront/checkout/CheckoutCard";
import {
  CheckoutPrimaryButton,
  SecureNote,
} from "@/components/storefront/checkout/CheckoutPrimaryButton";
import { COUNTRY_OPTIONS } from "@/lib/checkout/constants";
import { calculateShippingUsd } from "@/lib/checkout/shipping";
import {
  getPaymentLabelKey,
  maskCardNumber,
} from "@/lib/checkout/utils";
import { useFormattedPrice } from "@/hooks/use-formatted-price";
import type { CheckoutFormState } from "@/lib/checkout/types";

interface ReviewOrderProps {
  form: CheckoutFormState;
  subtotalUsd: number;
  totalUsd: number;
  loading: boolean;
  onEditShipping: () => void;
  onEditPayment: () => void;
  onPlaceOrder: () => void;
}

function ReviewSection({
  title,
  onEdit,
  editLabel,
  children,
}: {
  title: string;
  onEdit: () => void;
  editLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border py-4 last:border-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Pencil className="h-3 w-3" />
          {editLabel}
        </button>
      </div>
      <div className="space-y-0.5 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

export function ReviewOrder({
  form,
  subtotalUsd,
  totalUsd,
  loading,
  onEditShipping,
  onEditPayment,
  onPlaceOrder,
}: ReviewOrderProps) {
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const totalFmt = useFormattedPrice(totalUsd);
  const shippingPrice = calculateShippingUsd(subtotalUsd, form.shippingMethod);
  const shippingFmt = useFormattedPrice(shippingPrice);

  const countryLabel =
    COUNTRY_OPTIONS.find((c) => c.value === form.country)?.label ?? form.country;

  const addressLine = [
    form.street,
    form.apartment,
    `${form.city}, ${form.state} ${form.postalCode}`,
    countryLabel,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <CheckoutCard title={t("reviewTitle")} subtitle={t("reviewSubtitle")}>
      <ReviewSection
        title={t("reviewShippingInfo")}
        onEdit={onEditShipping}
        editLabel={t("edit")}
      >
        <p className="font-medium text-foreground">{form.fullName}</p>
        <p className="whitespace-pre-line">{addressLine}</p>
        <p>{form.phone}</p>
        <p>{form.email}</p>
      </ReviewSection>

      <ReviewSection
        title={t("reviewShippingMethod")}
        onEdit={onEditShipping}
        editLabel={t("edit")}
      >
        <p className="font-medium text-foreground">
          {t(`shippingMethods.${form.shippingMethod}`)}
        </p>
        <p>
          {shippingPrice === 0 ? tc("free") : shippingFmt}
        </p>
      </ReviewSection>

      <ReviewSection
        title={t("reviewPaymentMethod")}
        onEdit={onEditPayment}
        editLabel={t("edit")}
      >
        <div className="flex items-center gap-2">
          {form.paymentMethod === "card" && (
            <div className="relative h-5 w-8">
              <Image
                src="/payments/visa.svg"
                alt="Card"
                fill
                className="object-contain"
                sizes="32px"
              />
            </div>
          )}
          <p className="font-medium text-foreground">
            {t(`paymentMethods.${getPaymentLabelKey(form.paymentMethod)}`)}
          </p>
        </div>
        {form.paymentMethod === "card" && (
          <>
            <p>{maskCardNumber(form.cardNumber)}</p>
            <p>{t("expires")} {form.cardExpiry}</p>
          </>
        )}
      </ReviewSection>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-4 dark:bg-amber-950/30">
        <span className="text-base font-semibold text-foreground">
          {t("totalAmount")}
        </span>
        <span className="text-xl font-bold text-foreground">{totalFmt}</span>
      </div>

      <div className="mt-6">
        <SecureNote>{t("termsAgree")}</SecureNote>
        <div className="mt-4">
          <CheckoutPrimaryButton
            onClick={onPlaceOrder}
            loading={loading}
            icon="lock"
          >
            {loading ? t("processing") : t("placeOrderSecure")}
          </CheckoutPrimaryButton>
        </div>
      </div>
    </CheckoutCard>
  );
}
