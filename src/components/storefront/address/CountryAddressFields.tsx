"use client";

import { useTranslations } from "next-intl";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { CheckoutSelect } from "@/components/storefront/checkout/CheckoutField";
import { CheckoutAddressFields } from "@/components/storefront/checkout/CheckoutAddressFields";
import { normalizeAddressForCountry } from "@/lib/checkout/address-fields";
import { getSortedCountries } from "@/config/locales";

export interface CountryAddressValues {
  country: string;
  city: string;
  state: string;
  postalCode: string;
}

interface CountryAddressFieldsProps {
  values: CountryAddressValues;
  errors?: {
    country?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  onChange: (patch: Partial<CountryAddressValues>) => void;
  idPrefix?: string;
  countryLabel?: string;
}

const countryOptions = getSortedCountries().map((country) => ({
  value: country.code,
  label: country.name,
}));

export function CountryAddressFields({
  values,
  errors = {},
  onChange,
  idPrefix = "",
  countryLabel = "Country",
}: CountryAddressFieldsProps) {
  const t = useTranslations("common");
  const handleCountryChange = (country: string) => {
    const normalized = normalizeAddressForCountry(
      country,
      values.state,
      values.postalCode
    );
    onChange({
      country,
      state: normalized.state,
      postalCode: normalized.postalCode,
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <CheckoutSelect
        id={`${idPrefix}country`}
        label={countryLabel}
        value={values.country}
        onChange={handleCountryChange}
        options={[
          { value: "", label: t("selectCountry") },
          ...countryOptions,
        ]}
        required
        error={errors.country}
        className="md:col-span-2"
      />

      <CheckoutAddressFields
        countryCode={values.country || "US"}
        values={{
          city: values.city,
          state: values.state,
          postalCode: values.postalCode,
        }}
        errors={{
          city: errors.city,
          state: errors.state,
          postalCode: errors.postalCode,
        }}
        onChange={(patch) => onChange(patch)}
        idPrefix={idPrefix}
      />

      {values.country && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground md:col-span-2">
          <CountryFlag countryCode={values.country} size="sm" />
          <span>
            {countryOptions.find((c) => c.value === values.country)?.label ??
              values.country}
          </span>
        </div>
      )}
    </div>
  );
}
