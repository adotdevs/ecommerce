"use client";

import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { getAddressFieldConfig } from "@/lib/checkout/address-fields";

export function DeliverToNotice({ countryCode }: { countryCode: string }) {
  const t = useTranslations("checkout");
  const config = getAddressFieldConfig(countryCode);

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3">
      <CountryFlag countryCode={countryCode} size="md" className="mt-0.5" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium text-foreground">
          {t("deliverToCountry", { country: config.countryName })}
        </p>
        <p className="mt-0.5 text-muted-foreground">{t("deliverToHint")}</p>
      </div>
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </div>
  );
}
