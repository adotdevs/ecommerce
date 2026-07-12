"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { CreditCard } from "lucide-react";
import { CheckoutCard } from "@/components/storefront/checkout/CheckoutCard";
import {
  CheckoutField,
  RadioOptionCard,
} from "@/components/storefront/checkout/CheckoutField";
import { PAYMENT_METHODS } from "@/lib/checkout/constants";
import {
  isValidCardNumber,
  isValidCvv,
  isValidExpiry,
} from "@/lib/checkout/utils";
import type {
  CheckoutFieldErrors,
  CheckoutFormState,
  CheckoutPaymentMethod,
} from "@/lib/checkout/types";

interface PaymentMethodSelectProps {
  form: CheckoutFormState;
  errors: CheckoutFieldErrors;
  onChange: (patch: Partial<CheckoutFormState>) => void;
}

function PaymentLogo({ src, alt }: { src?: string; alt: string }) {
  if (!src) return null;
  return (
    <div className="relative h-6 w-10 overflow-hidden rounded">
      <Image src={src} alt={alt} fill className="object-contain" sizes="40px" />
    </div>
  );
}

export function PaymentMethodSelect({
  form,
  errors,
  onChange,
}: PaymentMethodSelectProps) {
  const t = useTranslations("checkout");

  return (
    <CheckoutCard title={t("paymentTitle")} subtitle={t("paymentSubtitle")}>
      <div className="space-y-3">
        {PAYMENT_METHODS.map((method) => (
          <RadioOptionCard
            key={method.id}
            selected={form.paymentMethod === method.id}
            onSelect={() =>
              onChange({ paymentMethod: method.id as CheckoutPaymentMethod })
            }
            title={t(`paymentMethods.${method.labelKey}`)}
            logo={
              method.id === "card" ? (
                <div className="flex items-center gap-1">
                  <PaymentLogo src="/payments/visa.svg" alt="Visa" />
                  <PaymentLogo src="/payments/mastercard.svg" alt="Mastercard" />
                </div>
              ) : method.logo ? (
                <PaymentLogo src={method.logo} alt={method.labelKey} />
              ) : undefined
            }
          >
            {method.id === "card" && form.paymentMethod === "card" && (
              <div className="space-y-4 pt-3">
                <CheckoutField
                  id="cardNumber"
                  label={t("cardNumber")}
                  value={form.cardNumber}
                  onChange={(cardNumber) =>
                    onChange({ cardNumber: formatCardNumber(cardNumber) })
                  }
                  placeholder={t("placeholders.cardNumber")}
                  icon={CreditCard}
                  valid={isValidCardNumber(form.cardNumber)}
                  error={
                    errors.cardNumber
                      ? t(`errors.${errors.cardNumber}`)
                      : undefined
                  }
                />
                <CheckoutField
                  id="cardName"
                  label={t("cardName")}
                  value={form.cardName}
                  onChange={(cardName) => onChange({ cardName })}
                  placeholder={t("placeholders.cardName")}
                  error={
                    errors.cardName
                      ? t(`errors.${errors.cardName}`)
                      : undefined
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <CheckoutField
                    id="cardExpiry"
                    label={t("cardExpiry")}
                    value={form.cardExpiry}
                    onChange={(cardExpiry) =>
                      onChange({ cardExpiry: formatExpiry(cardExpiry) })
                    }
                    placeholder={t("placeholders.cardExpiry")}
                    valid={isValidExpiry(form.cardExpiry)}
                    error={
                      errors.cardExpiry
                        ? t(`errors.${errors.cardExpiry}`)
                        : undefined
                    }
                  />
                  <CheckoutField
                    id="cardCvv"
                    label={t("cardCvv")}
                    value={form.cardCvv}
                    onChange={(cardCvv) =>
                      onChange({ cardCvv: cardCvv.replace(/\D/g, "").slice(0, 4) })
                    }
                    placeholder={t("placeholders.cardCvv")}
                    type="password"
                    valid={isValidCvv(form.cardCvv)}
                    error={
                      errors.cardCvv
                        ? t(`errors.${errors.cardCvv}`)
                        : undefined
                    }
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={form.saveCard}
                    onChange={(e) => onChange({ saveCard: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t("saveCard")}
                  </span>
                </label>
              </div>
            )}
          </RadioOptionCard>
        ))}
      </div>
    </CheckoutCard>
  );
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}
