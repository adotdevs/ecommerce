"use client";

import { useTranslations } from "next-intl";
import { CheckoutCard } from "@/components/storefront/checkout/CheckoutCard";
import {
  CheckoutField,
  RadioOptionCard,
} from "@/components/storefront/checkout/CheckoutField";
import { CheckoutAddressFields } from "@/components/storefront/checkout/CheckoutAddressFields";
import type { CheckoutFieldErrors, CheckoutFormState } from "@/lib/checkout/types";

interface BillingAddressProps {
  form: CheckoutFormState;
  errors: CheckoutFieldErrors;
  onChange: (patch: Partial<CheckoutFormState>) => void;
}

export function BillingAddress({
  form,
  errors,
  onChange,
}: BillingAddressProps) {
  const t = useTranslations("checkout");
  const countryCode = form.country;

  return (
    <CheckoutCard title={t("billingTitle")}>
      <div className="space-y-3">
        <RadioOptionCard
          selected={form.billingSameAsShipping}
          onSelect={() => onChange({ billingSameAsShipping: true })}
          title={t("billingSame")}
        />
        <RadioOptionCard
          selected={!form.billingSameAsShipping}
          onSelect={() => onChange({ billingSameAsShipping: false })}
          title={t("billingDifferent")}
        >
          {!form.billingSameAsShipping && (
            <div className="grid gap-4 pt-3 md:grid-cols-2">
              <CheckoutField
                id="billingFullName"
                label={t("fullName")}
                value={form.billingFullName}
                onChange={(billingFullName) => onChange({ billingFullName })}
                placeholder={t("placeholders.fullName")}
                error={
                  errors.billingFullName
                    ? t(`errors.${errors.billingFullName}`)
                    : undefined
                }
                className="md:col-span-2"
              />
              <CheckoutField
                id="billingStreet"
                label={t("street")}
                value={form.billingStreet}
                onChange={(billingStreet) => onChange({ billingStreet })}
                placeholder={t("placeholders.street")}
                error={
                  errors.billingStreet
                    ? t(`errors.${errors.billingStreet}`)
                    : undefined
                }
                className="md:col-span-2"
              />
              <CheckoutAddressFields
                countryCode={countryCode}
                idPrefix="billing"
                values={{
                  city: form.billingCity,
                  state: form.billingState,
                  postalCode: form.billingPostalCode,
                }}
                errors={{
                  city: errors.billingCity
                    ? t(`errors.${errors.billingCity}`)
                    : undefined,
                  state: errors.billingState
                    ? t(`errors.${errors.billingState}`)
                    : undefined,
                  postalCode: errors.billingPostalCode
                    ? t(`errors.${errors.billingPostalCode}`)
                    : undefined,
                }}
                onChange={(patch) =>
                  onChange({
                    ...(patch.city !== undefined ? { billingCity: patch.city } : {}),
                    ...(patch.state !== undefined ? { billingState: patch.state } : {}),
                    ...(patch.postalCode !== undefined
                      ? { billingPostalCode: patch.postalCode }
                      : {}),
                  })
                }
              />
            </div>
          )}
        </RadioOptionCard>
      </div>
    </CheckoutCard>
  );
}
