"use client";

import { useTranslations } from "next-intl";
import { User, MapPin } from "lucide-react";
import { useCustomerSession } from "@/hooks/use-customer-session";
import { CheckoutCard } from "@/components/storefront/checkout/CheckoutCard";
import { CheckoutField } from "@/components/storefront/checkout/CheckoutField";
import { CheckoutPhoneField } from "@/components/storefront/checkout/CheckoutPhoneField";
import { CheckoutAddressFields } from "@/components/storefront/checkout/CheckoutAddressFields";
import { SavedAddressPicker } from "@/components/storefront/checkout/SavedAddressPicker";
import { checkoutPatchFromSavedAddress } from "@/lib/checkout/prefill-from-profile";
import type { CustomerAddressResponse } from "@/lib/customer/profile";
import type { CheckoutFieldErrors, CheckoutFormState } from "@/lib/checkout/types";

const MANUAL_ADDRESS_FIELDS = new Set([
  "fullName",
  "phone",
  "phoneCountryCode",
  "street",
  "apartment",
  "city",
  "state",
  "postalCode",
]);

interface ShippingAddressFormProps {
  form: CheckoutFormState;
  errors: CheckoutFieldErrors;
  savedAddresses?: CustomerAddressResponse[];
  onChange: (patch: Partial<CheckoutFormState>) => void;
}

export function ShippingAddressForm({
  form,
  errors,
  savedAddresses = [],
  onChange,
}: ShippingAddressFormProps) {
  const t = useTranslations("checkout");
  const { isCustomer } = useCustomerSession();
  const canSaveAddress = isCustomer;
  const showSavedAddresses = isCustomer && savedAddresses.length >= 2;

  const handleChange = (patch: Partial<CheckoutFormState>) => {
    const clearsSelection =
      !("selectedSavedAddressId" in patch) &&
      Object.keys(patch).some((key) => MANUAL_ADDRESS_FIELDS.has(key));

    if (clearsSelection && form.selectedSavedAddressId) {
      onChange({ ...patch, selectedSavedAddressId: "" });
      return;
    }
    onChange(patch);
  };

  const selectSavedAddress = (address: CustomerAddressResponse) => {
    onChange(checkoutPatchFromSavedAddress(address));
  };

  const useNewAddress = () => {
    onChange({
      selectedSavedAddressId: "",
      street: "",
      apartment: "",
      city: "",
      state: "",
      postalCode: "",
    });
  };

  return (
    <CheckoutCard title={t("shippingAddressTitle")}>
      {showSavedAddresses && (
        <SavedAddressPicker
          addresses={savedAddresses}
          selectedId={form.selectedSavedAddressId}
          onSelect={selectSavedAddress}
          onUseNew={useNewAddress}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <CheckoutField
          id="fullName"
          label={t("fullName")}
          value={form.fullName ?? ""}
          onChange={(fullName) => handleChange({ fullName })}
          placeholder={t("placeholders.fullName")}
          required
          icon={User}
          valid={(form.fullName ?? "").trim().length >= 2}
          error={errors.fullName ? t(`errors.${errors.fullName}`) : undefined}
          className="md:col-span-2"
        />
        <CheckoutPhoneField
          id="phone"
          label={t("phone")}
          phoneCountryCode={form.phoneCountryCode || form.country}
          onPhoneCountryCodeChange={(phoneCountryCode) =>
            handleChange({ phoneCountryCode })
          }
          value={form.phone ?? ""}
          onChange={(phone) => handleChange({ phone })}
          required
          error={errors.phone ? t(`errors.${errors.phone}`) : undefined}
          className="md:col-span-2"
        />
        <CheckoutField
          id="street"
          label={t("street")}
          value={form.street ?? ""}
          onChange={(street) => handleChange({ street })}
          placeholder={t("placeholders.street")}
          required
          icon={MapPin}
          valid={(form.street ?? "").trim().length >= 3}
          error={errors.street ? t(`errors.${errors.street}`) : undefined}
          className="md:col-span-2"
        />
        <CheckoutField
          id="apartment"
          label={t("apartment")}
          value={form.apartment ?? ""}
          onChange={(apartment) => handleChange({ apartment })}
          placeholder={t("placeholders.apartment")}
          className="md:col-span-2"
        />

        <CheckoutAddressFields
          countryCode={form.country}
          values={{
            city: form.city ?? "",
            state: form.state ?? "",
            postalCode: form.postalCode ?? "",
          }}
          errors={{
            city: errors.city ? t(`errors.${errors.city}`) : undefined,
            state: errors.state ? t(`errors.${errors.state}`) : undefined,
            postalCode: errors.postalCode
              ? t(`errors.${errors.postalCode}`)
              : undefined,
          }}
          onChange={(patch) => handleChange(patch)}
        />
      </div>

      {canSaveAddress && (
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={form.saveAddress}
            onChange={(e) => onChange({ saveAddress: e.target.checked })}
            className="h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-muted-foreground">{t("saveAddress")}</span>
        </label>
      )}
    </CheckoutCard>
  );
}
