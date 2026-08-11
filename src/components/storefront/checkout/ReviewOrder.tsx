"use client";

import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import Image from "next/image";
import { CheckoutCard } from "@/components/storefront/checkout/CheckoutCard";
import {
  CheckoutPrimaryButton,
  SecureNote,
} from "@/components/storefront/checkout/CheckoutPrimaryButton";
import { getAddressFieldConfig, formatAddressLine } from "@/lib/checkout/address-fields";
import { formatPhoneDisplay } from "@/lib/checkout/phone-fields";
import { calculateShippingUsd } from "@/lib/shipping/settings";
import { buildShippingOptions } from "@/lib/checkout/shipping";
import { useShippingSettings } from "@/components/providers/ShippingSettingsContext";
import {
  CARD_BRAND_LOGOS,
  cardDigits,
  detectCardBrand,
  isSupportedBrand,
} from "@/lib/checkout/card-validation";
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
  const shippingSettings = useShippingSettings();
  const totalFmt = useFormattedPrice(totalUsd);
  const shippingPrice = calculateShippingUsd(
    subtotalUsd,
    form.shippingMethod,
    buildShippingOptions(form.country, shippingSettings)
  );
  const shippingFmt = useFormattedPrice(shippingPrice);

  const config = getAddressFieldConfig(form.country);

  const addressLine = [
    form.street,
    form.apartment,
    formatAddressLine(form.country, form.city, form.state, form.postalCode),
    config.countryName,
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
        <p>{formatPhoneDisplay(form.phoneCountryCode, form.phone)}</p>
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
          {form.paymentMethod === "card" && (() => {
            const brand = detectCardBrand(cardDigits(form.cardNumber));
            const logo =
              isSupportedBrand(brand) ? CARD_BRAND_LOGOS[brand] : null;
            return logo ? (
              <div className="relative h-5 w-8">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  fill
                  className="object-contain"
                  sizes="32px"
                />
              </div>
            ) : null;
          })()}
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
