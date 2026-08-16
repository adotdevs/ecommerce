"use client";

import { useTranslations } from "next-intl";
import {
  CheckoutField,
  CheckoutSelect,
} from "@/components/storefront/checkout/CheckoutField";
import { cn } from "@/components/ds/utils";
import { getAddressFieldConfig } from "@/lib/checkout/address-fields";

export interface AddressFieldsValues {
  city: string;
  state: string;
  postalCode: string;
}

interface CheckoutAddressFieldsProps {
  countryCode: string;
  values: AddressFieldsValues;
  errors: {
    city?: string;
    state?: string;
    postalCode?: string;
  };
  onChange: (patch: Partial<AddressFieldsValues>) => void;
  idPrefix?: string;
}

export function CheckoutAddressFields({
  countryCode,
  values,
  errors,
  onChange,
  idPrefix = "",
}: CheckoutAddressFieldsProps) {
  const t = useTranslations("checkout");
  const config = getAddressFieldConfig(countryCode);
  const region = config.region;
  const hasRegion = region.type === "select" || region.type === "text";

  return (
    <div
      className={cn(
        "grid gap-4 md:col-span-2",
        hasRegion ? "md:grid-cols-3" : "md:grid-cols-2"
      )}
    >
      <CheckoutField
        id={`${idPrefix}city`}
        label={t("city")}
        value={values.city}
        onChange={(city) => onChange({ city })}
        placeholder={t("placeholders.city")}
        required
        error={errors.city}
      />

      {region.type === "select" && region.options && (
        <CheckoutSelect
          id={`${idPrefix}state`}
          label={region.label}
          value={values.state}
          onChange={(state) => onChange({ state })}
          options={[
            { value: "", label: region.label },
            ...region.options,
          ]}
          required={region.required}
          error={errors.state}
        />
      )}

      {region.type === "text" && (
        <CheckoutField
          id={`${idPrefix}state`}
          label={region.label}
          value={values.state}
          onChange={(state) => onChange({ state })}
          placeholder={region.placeholder}
          required={region.required}
          error={errors.state}
        />
      )}

      <CheckoutField
        id={`${idPrefix}postalCode`}
        label={config.postalCode.label}
        value={values.postalCode}
        onChange={(postalCode) => onChange({ postalCode })}
        placeholder={config.postalCode.placeholder}
        required={config.postalCode.required}
        error={errors.postalCode}
      />
    </div>
  );
}
