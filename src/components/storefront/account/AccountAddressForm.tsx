"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { AccountSectionCard } from "@/components/storefront/account/AccountSectionCard";
import {
  CountryAddressFields,
  type CountryAddressValues,
} from "@/components/storefront/address/CountryAddressFields";
import {
  formatAddressLine,
  getAddressFieldConfig,
  isValidPostalForCountry,
  isValidRegionForCountry,
} from "@/lib/checkout/address-fields";
import { hasAddressDetails } from "@/lib/customer/profile";

export interface AddressFormState {
  label: string;
  firstName: string;
  lastName: string;
  street: string;
  country: string;
  city: string;
  state: string;
  postalCode: string;
}

interface AccountAddressFormProps {
  defaultCountry: string;
  profileFirstName?: string;
  profileLastName?: string;
  saving: boolean;
  onSubmit: (address: AddressFormState) => Promise<void>;
}

function emptyAddressForm(
  country: string,
  firstName = "",
  lastName = ""
): AddressFormState {
  return {
    label: "Home",
    firstName,
    lastName,
    street: "",
    country,
    city: "",
    state: "",
    postalCode: "",
  };
}

export function AccountAddressForm({
  defaultCountry,
  profileFirstName = "",
  profileLastName = "",
  saving,
  onSubmit,
}: AccountAddressFormProps) {
  const t = useTranslations("account");
  const tc = useTranslations("checkout");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<AddressFormState>(() =>
    emptyAddressForm(defaultCountry, profileFirstName, profileLastName)
  );

  const updateForm = (patch: Partial<AddressFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors({});
  };

  const updateAddressFields = (patch: Partial<CountryAddressValues>) => {
    updateForm(patch);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.label.trim()) next.label = tc("errors.required");
    if (!form.firstName.trim()) next.firstName = tc("errors.required");
    if (!form.lastName.trim()) next.lastName = tc("errors.required");
    if (!form.street.trim()) next.street = tc("errors.required");
    if (!form.country) next.country = tc("errors.required");
    if (!form.city.trim()) next.city = tc("errors.required");
    if (!isValidRegionForCountry(form.country, form.state)) {
      next.state = tc("errors.invalidState");
    }
    if (!isValidPostalForCountry(form.country, form.postalCode)) {
      next.postalCode = tc("errors.invalidPostal");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
    setForm(emptyAddressForm(defaultCountry, profileFirstName, profileLastName));
    setOpen(false);
    setErrors({});
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-full border-dashed"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t("addAddress")}
      </Button>
    );
  }

  return (
    <AccountSectionCard title={t("addAddress")} subtitle={t("addAddressSubtitle")}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address-label">{t("addressLabel")}</Label>
            <Input
              id="address-label"
              value={form.label}
              onChange={(e) => updateForm({ label: e.target.value })}
              placeholder={t("addressLabelPlaceholder")}
              className="h-11 rounded-xl"
            />
            {errors.label && (
              <p className="text-xs text-destructive">{errors.label}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address-firstName">{t("firstName")}</Label>
            <Input
              id="address-firstName"
              value={form.firstName}
              onChange={(e) => updateForm({ firstName: e.target.value })}
              className="h-11 rounded-xl"
            />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address-lastName">{t("lastName")}</Label>
            <Input
              id="address-lastName"
              value={form.lastName}
              onChange={(e) => updateForm({ lastName: e.target.value })}
              className="h-11 rounded-xl"
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address-street">{t("street")}</Label>
            <Input
              id="address-street"
              value={form.street}
              onChange={(e) => updateForm({ street: e.target.value })}
              placeholder={tc("placeholders.street")}
              className="h-11 rounded-xl"
            />
            {errors.street && (
              <p className="text-xs text-destructive">{errors.street}</p>
            )}
          </div>
        </div>

        <CountryAddressFields
          countryLabel={t("country")}
          values={{
            country: form.country,
            city: form.city,
            state: form.state,
            postalCode: form.postalCode,
          }}
          errors={errors}
          onChange={updateAddressFields}
          idPrefix="account-"
        />

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" className="rounded-full" disabled={saving}>
            {saving ? tCommon("loading") : t("saveAddress")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setOpen(false);
              setErrors({});
            }}
          >
            {tCommon("cancel")}
          </Button>
        </div>
      </form>
    </AccountSectionCard>
  );
}

export function AccountAddressCard({
  address,
  onMakeDefault,
  onRemove,
}: {
  address: {
    _id: string;
    label: string;
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault?: boolean;
  };
  onMakeDefault: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("account");
  const country = address.country ?? "";
  const config = getAddressFieldConfig(country);
  const line = formatAddressLine(
    country,
    address.city ?? "",
    address.state ?? "",
    address.postalCode ?? ""
  );
  const name = [address.firstName, address.lastName].filter(Boolean).join(" ");
  const incomplete = !hasAddressDetails(address);

  return (
    <div className="rounded-[18px] border border-border bg-card p-5 shadow-[var(--shadow-subtle)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] text-brand-primary">
          <MapPin className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">
              {address.label?.trim() || t("savedAddress")}
            </p>
            {address.isDefault && (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                {t("defaultAddress")}
              </span>
            )}
          </div>
          {incomplete ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("incompleteAddress")}</p>
          ) : (
            <>
              {name && (
                <p className="mt-1 text-sm text-muted-foreground">{name}</p>
              )}
              {address.street && (
                <p className="text-sm text-muted-foreground">{address.street}</p>
              )}
              {line && <p className="text-sm text-muted-foreground">{line}</p>}
              {country && (
                <p className="text-sm text-muted-foreground">{config.countryName}</p>
              )}
            </>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
        {!address.isDefault && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => onMakeDefault(address._id)}
          >
            {t("makeDefault")}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => onRemove(address._id)}
        >
          {t("remove")}
        </Button>
      </div>
    </div>
  );
}
