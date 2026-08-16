"use client";

import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { Alert } from "@heroui/react";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { getAddressFieldConfig } from "@/lib/checkout/address-fields";

export function DeliverToNotice({ countryCode }: { countryCode: string }) {
  const t = useTranslations("checkout");
  const config = getAddressFieldConfig(countryCode);

  return (
    <Alert className="mb-4" status="default">
      <Alert.Indicator>
        <CountryFlag countryCode={countryCode} size="md" />
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Title>{t("deliverToCountry", { country: config.countryName })}</Alert.Title>
        <Alert.Description>{t("deliverToHint")}</Alert.Description>
      </Alert.Content>
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </Alert>
  );
}
