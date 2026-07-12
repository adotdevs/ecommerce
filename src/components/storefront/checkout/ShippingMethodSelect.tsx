"use client";

import { useTranslations } from "next-intl";
import { CheckoutCard } from "@/components/storefront/checkout/CheckoutCard";
import { RadioOptionCard } from "@/components/storefront/checkout/CheckoutField";
import {
  CheckoutPrimaryButton,
  SecureNote,
} from "@/components/storefront/checkout/CheckoutPrimaryButton";
import { SHIPPING_METHODS } from "@/lib/checkout/constants";
import { calculateShippingUsd } from "@/lib/checkout/shipping";
import { useFormattedPrice } from "@/hooks/use-formatted-price";
import type { CheckoutFormState, ShippingMethodId } from "@/lib/checkout/types";

interface ShippingMethodSelectProps {
  form: CheckoutFormState;
  subtotalUsd: number;
  onChange: (patch: Partial<CheckoutFormState>) => void;
  onContinue: () => void;
}

function ShippingMethodOption({
  method,
  selected,
  subtotalUsd,
  onSelect,
}: {
  method: (typeof SHIPPING_METHODS)[number];
  selected: boolean;
  subtotalUsd: number;
  onSelect: () => void;
}) {
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const price = calculateShippingUsd(subtotalUsd, method.id);
  const formatted = useFormattedPrice(price);

  return (
    <RadioOptionCard
      selected={selected}
      onSelect={onSelect}
      title={t(`shippingMethods.${method.labelKey}`)}
      subtitle={t(`shippingMethods.${method.etaKey}`)}
      priceLabel={price === 0 ? tc("free") : formatted}
      priceFree={price === 0}
    />
  );
}

export function ShippingMethodSelect({
  form,
  subtotalUsd,
  onChange,
  onContinue,
}: ShippingMethodSelectProps) {
  const t = useTranslations("checkout");

  return (
    <CheckoutCard
      title={t("shippingMethodTitle")}
      subtitle={t("shippingMethodSubtitle")}
    >
      <div className="space-y-3">
        {SHIPPING_METHODS.map((method) => (
          <ShippingMethodOption
            key={method.id}
            method={method}
            selected={form.shippingMethod === method.id}
            subtotalUsd={subtotalUsd}
            onSelect={() => onChange({ shippingMethod: method.id })}
          />
        ))}
      </div>

      <div className="mt-6">
        <CheckoutPrimaryButton onClick={onContinue}>
          {t("continueToPayment")}
        </CheckoutPrimaryButton>
        <SecureNote>{t("secureInfo")}</SecureNote>
      </div>
    </CheckoutCard>
  );
}
