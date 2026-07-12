"use client";

import { useTranslations } from "next-intl";
import { User, Phone, MapPin } from "lucide-react";
import { CheckoutCard } from "@/components/storefront/checkout/CheckoutCard";
import {
  CheckoutField,
  CheckoutSelect,
} from "@/components/storefront/checkout/CheckoutField";
import { COUNTRY_OPTIONS } from "@/lib/checkout/constants";
import { isValidPhone } from "@/lib/checkout/utils";
import type { CheckoutFieldErrors, CheckoutFormState } from "@/lib/checkout/types";

interface ShippingAddressFormProps {
  form: CheckoutFormState;
  errors: CheckoutFieldErrors;
  onChange: (patch: Partial<CheckoutFormState>) => void;
}

export function ShippingAddressForm({
  form,
  errors,
  onChange,
}: ShippingAddressFormProps) {
  const t = useTranslations("checkout");

  return (
    <CheckoutCard title={t("shippingAddressTitle")}>
      <div className="grid gap-4 md:grid-cols-2">
        <CheckoutField
          id="fullName"
          label={t("fullName")}
          value={form.fullName}
          onChange={(fullName) => onChange({ fullName })}
          placeholder={t("placeholders.fullName")}
          required
          icon={User}
          valid={form.fullName.trim().length >= 2}
          error={errors.fullName ? t(`errors.${errors.fullName}`) : undefined}
          className="md:col-span-2"
        />
        <CheckoutField
          id="phone"
          label={t("phone")}
          type="tel"
          value={form.phone}
          onChange={(phone) => onChange({ phone })}
          placeholder={t("placeholders.phone")}
          required
          icon={Phone}
          valid={isValidPhone(form.phone)}
          error={errors.phone ? t(`errors.${errors.phone}`) : undefined}
        />
        <CheckoutSelect
          id="country"
          label={t("country")}
          value={form.country}
          onChange={(country) => onChange({ country })}
          options={COUNTRY_OPTIONS.map((c) => ({
            value: c.value,
            label: c.label,
          }))}
          required
          error={errors.country ? t(`errors.${errors.country}`) : undefined}
        />
        <CheckoutField
          id="street"
          label={t("street")}
          value={form.street}
          onChange={(street) => onChange({ street })}
          placeholder={t("placeholders.street")}
          required
          icon={MapPin}
          valid={form.street.trim().length >= 3}
          error={errors.street ? t(`errors.${errors.street}`) : undefined}
          className="md:col-span-2"
        />
        <CheckoutField
          id="apartment"
          label={t("apartment")}
          value={form.apartment}
          onChange={(apartment) => onChange({ apartment })}
          placeholder={t("placeholders.apartment")}
          className="md:col-span-2"
        />
        <CheckoutField
          id="city"
          label={t("city")}
          value={form.city}
          onChange={(city) => onChange({ city })}
          placeholder={t("placeholders.city")}
          required
          error={errors.city ? t(`errors.${errors.city}`) : undefined}
        />
        <CheckoutField
          id="state"
          label={t("state")}
          value={form.state}
          onChange={(state) => onChange({ state })}
          placeholder={t("placeholders.state")}
          required
          error={errors.state ? t(`errors.${errors.state}`) : undefined}
        />
        <CheckoutField
          id="postalCode"
          label={t("postalCode")}
          value={form.postalCode}
          onChange={(postalCode) => onChange({ postalCode })}
          placeholder={t("placeholders.postalCode")}
          required
          error={
            errors.postalCode ? t(`errors.${errors.postalCode}`) : undefined
          }
          className="md:col-span-2"
        />
      </div>
      <label className="mt-4 flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={form.saveAddress}
          onChange={(e) => onChange({ saveAddress: e.target.checked })}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <span className="text-sm text-muted-foreground">{t("saveAddress")}</span>
      </label>
    </CheckoutCard>
  );
}
