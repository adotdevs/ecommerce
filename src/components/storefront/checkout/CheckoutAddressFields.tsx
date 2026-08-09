"use client";

import {
  CheckoutField,
  CheckoutSelect,
} from "@/components/storefront/checkout/CheckoutField";
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
  const config = getAddressFieldConfig(countryCode);
  const region = config.region;

  return (
    <>
      <CheckoutField
        id={`${idPrefix}city`}
        label="City"
        value={values.city}
        onChange={(city) => onChange({ city })}
        placeholder="City"
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
            { value: "", label: `Select ${region.label.toLowerCase()}` },
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
        className={region.type === "none" ? "md:col-span-2" : undefined}
      />
    </>
  );
}
