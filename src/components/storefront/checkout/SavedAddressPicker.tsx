"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatAddressLine, getAddressFieldConfig } from "@/lib/checkout/address-fields";
import { hasAddressDetails, type CustomerAddressResponse } from "@/lib/customer/profile";
import { cn } from "@/components/ds/utils";

interface SavedAddressPickerProps {
  addresses: CustomerAddressResponse[];
  selectedId: string;
  onSelect: (address: CustomerAddressResponse) => void;
  onUseNew: () => void;
}

function addressSummary(address: CustomerAddressResponse): string {
  const country = address.country ?? "";
  const line = formatAddressLine(
    country,
    address.city ?? "",
    address.state ?? "",
    address.postalCode ?? ""
  );
  const parts = [address.street, line].filter(Boolean);
  return parts.join(", ");
}

function AddressRow({
  selected,
  onClick,
  label,
  summary,
  badge,
  compact,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  summary?: string;
  badge?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 text-left transition-colors",
        compact ? "rounded-xl border px-3 py-2.5" : "rounded-[16px] border p-4",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card hover:border-primary/30 hover:bg-secondary/30"
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border-2",
          compact ? "h-3.5 w-3.5" : "mt-0.5 h-4 w-4",
          selected ? "border-primary" : "border-muted-foreground/40"
        )}
        aria-hidden
      >
        {selected && (
          <span className={cn("rounded-full bg-primary", compact ? "h-1.5 w-1.5" : "h-2 w-2")} />
        )}
      </span>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] text-brand-primary",
          compact ? "h-8 w-8" : "h-9 w-9 rounded-xl"
        )}
      >
        <MapPin className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn("font-semibold text-foreground", compact && "text-sm")}>
            {label}
          </span>
          {badge && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
              {badge}
            </span>
          )}
        </span>
        {summary && (
          <span
            className={cn(
              "mt-0.5 block truncate text-muted-foreground",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {summary}
          </span>
        )}
      </span>
    </button>
  );
}

export function SavedAddressPicker({
  addresses,
  selectedId,
  onSelect,
  onUseNew,
}: SavedAddressPickerProps) {
  const t = useTranslations("checkout");
  const ta = useTranslations("account");
  const [expanded, setExpanded] = useState(false);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address._id === selectedId),
    [addresses, selectedId]
  );

  useEffect(() => {
    if (!selectedId) setExpanded(true);
  }, [selectedId]);

  if (addresses.length === 0) return null;

  const handleSelect = (address: CustomerAddressResponse) => {
    onSelect(address);
    setExpanded(false);
  };

  const handleUseNew = () => {
    onUseNew();
    setExpanded(true);
  };

  const collapsedLabel = selectedAddress
    ? selectedAddress.label?.trim() || ta("savedAddress")
    : t("useNewAddress");

  const collapsedSummary = selectedAddress
    ? hasAddressDetails(selectedAddress)
      ? [
          [selectedAddress.firstName, selectedAddress.lastName].filter(Boolean).join(" "),
          addressSummary(selectedAddress),
        ]
          .filter(Boolean)
          .join(" · ")
      : ta("incompleteAddress")
    : t("enterAddressBelow");

  return (
    <div className="mb-5 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{t("savedAddresses")}</p>
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {t("changeAddress")}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!expanded ? (
        <div className="rounded-[16px] border border-border bg-card p-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] text-brand-primary">
              <MapPin className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{collapsedLabel}</p>
                {selectedAddress?.isDefault && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                    {ta("defaultAddress")}
                  </span>
                )}
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {collapsedSummary}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-expanded={false}
              aria-label={t("showAllAddresses", { count: addresses.length })}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/40 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 rounded-[16px] border border-border bg-secondary/20 p-2">
          {addresses.map((address) => {
            const selected = selectedId === address._id;
            const label = address.label?.trim() || ta("savedAddress");
            const summary = hasAddressDetails(address)
              ? [
                  [address.firstName, address.lastName].filter(Boolean).join(" "),
                  addressSummary(address),
                  getAddressFieldConfig(address.country ?? "").countryName,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : ta("incompleteAddress");

            return (
              <AddressRow
                key={address._id}
                selected={selected}
                onClick={() => handleSelect(address)}
                label={label}
                summary={summary}
                badge={address.isDefault ? ta("defaultAddress") : undefined}
                compact
              />
            );
          })}

          <AddressRow
            selected={!selectedId}
            onClick={handleUseNew}
            label={t("useNewAddress")}
            summary={t("enterAddressBelow")}
            compact
          />

          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <ChevronDown className="h-3.5 w-3.5 rotate-180" />
            {t("hideAddresses")}
          </button>
        </div>
      )}
    </div>
  );
}
