"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, AlertTriangle } from "lucide-react";
import { CheckoutCard } from "@/components/storefront/checkout/CheckoutCard";
import {
  CheckoutField,
  RadioOptionCard,
} from "@/components/storefront/checkout/CheckoutField";
import { RemoteImage } from "@/components/storefront/RemoteImage";
import { PAYMENT_METHODS } from "@/lib/checkout/constants";
import {
  CARD_BRAND_LOGOS,
  SUPPORTED_CARD_LOGOS,
  cardDigits,
  cvvLength,
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  getLiveCardFieldErrors,
  isExpiryValid,
  isSupportedBrand,
  isValidCardName,
  isValidCvv,
} from "@/lib/checkout/card-validation";
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

const CARD_PAYMENT_LOGOS = SUPPORTED_CARD_LOGOS;

function PaymentLogo({ src, alt }: { src?: string; alt: string }) {
  if (!src) return null;
  return (
    <div className="relative h-6 w-10 overflow-hidden rounded">
      <RemoteImage src={src} alt={alt} fill className="object-cover" sizes="40px" />
    </div>
  );
}

function CardBrandLogo({ brand }: { brand: ReturnType<typeof detectCardBrand> }) {
  if (!isSupportedBrand(brand)) return null;
  const logo = CARD_BRAND_LOGOS[brand];
  return (
    <div className="relative h-5 w-8 overflow-hidden rounded">
      <RemoteImage src={logo.src} alt={logo.alt} fill className="object-contain" sizes="32px" />
    </div>
  );
}

function fieldError(
  submitted: string | undefined,
  live: string | undefined,
  t: ReturnType<typeof useTranslations>
) {
  const key = submitted ?? live;
  return key ? t(`errors.${key}`) : undefined;
}

export function PaymentMethodSelect({
  form,
  errors,
  onChange,
}: PaymentMethodSelectProps) {
  const t = useTranslations("checkout");

  const cardBrand = useMemo(
    () => detectCardBrand(cardDigits(form.cardNumber)),
    [form.cardNumber]
  );

  const liveCardErrors = useMemo(
    () => getLiveCardFieldErrors(form),
    [form.cardNumber, form.cardName, form.cardExpiry, form.cardCvv]
  );

  const cardNameValid = isValidCardName(form.cardName);
  const cardExpiryValid = isExpiryValid(form.cardExpiry);
  const cardCvvValid = isValidCvv(form.cardCvv, cardBrand);

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
                <div className="flex flex-wrap items-center justify-end gap-1">
                  {CARD_PAYMENT_LOGOS.map((logo) => (
                    <PaymentLogo key={logo.brand} src={logo.src} alt={logo.alt} />
                  ))}
                </div>
              ) : method.logo ? (
                <PaymentLogo src={method.logo} alt={method.labelKey} />
              ) : undefined
            }
          >
            {method.id === "paypal" && form.paymentMethod === "paypal" && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  {t("paypalUnavailable")}
                </p>
              </div>
            )}
            {method.id === "card" && form.paymentMethod === "card" && (
              <div className="space-y-4 pt-3">
                <CheckoutField
                  id="cardNumber"
                  label={t("cardNumber")}
                  value={form.cardNumber}
                  onChange={(cardNumber) => {
                    const digits = cardDigits(cardNumber);
                    const brand = detectCardBrand(digits);
                    onChange({ cardNumber: formatCardNumber(digits, brand) });
                  }}
                  placeholder={t("placeholders.cardNumber")}
                  icon={CreditCard}
                  endAdornment={
                    isSupportedBrand(cardBrand) ? (
                      <CardBrandLogo brand={cardBrand} />
                    ) : undefined
                  }
                  error={errors.cardNumber ? t(`errors.${errors.cardNumber}`) : undefined}
                />
                <CheckoutField
                  id="cardName"
                  label={t("cardName")}
                  value={form.cardName}
                  onChange={(cardName) =>
                    onChange({ cardName: cardName.replace(/[^\p{L}\s'.-]/gu, "") })
                  }
                  placeholder={t("placeholders.cardName")}
                  valid={cardNameValid}
                  error={fieldError(
                    errors.cardName,
                    liveCardErrors.cardName,
                    t
                  )}
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
                    valid={cardExpiryValid}
                    error={fieldError(
                      errors.cardExpiry,
                      liveCardErrors.cardExpiry,
                      t
                    )}
                  />
                  <CheckoutField
                    id="cardCvv"
                    label={t("cardCvv")}
                    value={form.cardCvv}
                    onChange={(cardCvv) =>
                      onChange({
                        cardCvv: cardCvv
                          .replace(/\D/g, "")
                          .slice(0, cvvLength(cardBrand)),
                      })
                    }
                    placeholder={
                      cardBrand === "amex"
                        ? t("placeholders.cardCvvAmex")
                        : t("placeholders.cardCvv")
                    }
                    type="text"
                    valid={cardCvvValid}
                    error={fieldError(errors.cardCvv, liveCardErrors.cardCvv, t)}
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
      {errors.paymentMethod && (
        <p className="mt-3 text-sm text-destructive">
          {t(`errors.${errors.paymentMethod}`)}
        </p>
      )}
    </CheckoutCard>
  );
}
