"use client";

import { useTranslations } from "next-intl";
import { CheckoutCard } from "@/components/storefront/checkout/CheckoutCard";
import {
  CheckoutField,
  CheckoutSelect,
  RadioOptionCard,
} from "@/components/storefront/checkout/CheckoutField";
import { COUNTRY_OPTIONS } from "@/lib/checkout/constants";
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
              <CheckoutField
                id="billingCity"
                label={t("city")}
                value={form.billingCity}
                onChange={(billingCity) => onChange({ billingCity })}
                placeholder={t("placeholders.city")}
                error={
                  errors.billingCity
                    ? t(`errors.${errors.billingCity}`)
                    : undefined
                }
              />
              <CheckoutField
                id="billingState"
                label={t("state")}
                value={form.billingState}
                onChange={(billingState) => onChange({ billingState })}
                placeholder={t("placeholders.state")}
                error={
                  errors.billingState
                    ? t(`errors.${errors.billingState}`)
                    : undefined
                }
              />
              <CheckoutField
                id="billingPostalCode"
                label={t("postalCode")}
                value={form.billingPostalCode}
                onChange={(billingPostalCode) => onChange({ billingPostalCode })}
                placeholder={t("placeholders.postalCode")}
                error={
                  errors.billingPostalCode
                    ? t(`errors.${errors.billingPostalCode}`)
                    : undefined
                }
              />
              <CheckoutSelect
                id="billingCountry"
                label={t("country")}
                value={form.billingCountry}
                onChange={(billingCountry) => onChange({ billingCountry })}
                options={COUNTRY_OPTIONS.map((c) => ({
                  value: c.value,
                  label: c.label,
                }))}
                error={
                  errors.billingCountry
                    ? t(`errors.${errors.billingCountry}`)
                    : undefined
                }
              />
            </div>
          )}
        </RadioOptionCard>
      </div>
    </CheckoutCard>
  );
}
