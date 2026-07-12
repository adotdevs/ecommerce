"use client";

import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { CheckoutCard } from "@/components/storefront/checkout/CheckoutCard";
import { CheckoutField } from "@/components/storefront/checkout/CheckoutField";
import { isValidEmail } from "@/lib/checkout/utils";
import type { CheckoutFieldErrors, CheckoutFormState } from "@/lib/checkout/types";

interface ContactInformationProps {
  form: CheckoutFormState;
  errors: CheckoutFieldErrors;
  onChange: (patch: Partial<CheckoutFormState>) => void;
}

export function ContactInformation({
  form,
  errors,
  onChange,
}: ContactInformationProps) {
  const t = useTranslations("checkout");

  return (
    <CheckoutCard title={t("contactTitle")} subtitle={t("contactSubtitle")}>
      <CheckoutField
        id="email"
        label={t("email")}
        type="email"
        value={form.email}
        onChange={(email) => onChange({ email })}
        placeholder="you@example.com"
        required
        icon={Mail}
        valid={isValidEmail(form.email)}
        error={errors.email ? t(`errors.${errors.email}`) : undefined}
      />
      <label className="mt-4 flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={form.emailOffers}
          onChange={(e) => onChange({ emailOffers: e.target.checked })}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <span className="text-sm text-muted-foreground">{t("emailOffers")}</span>
      </label>
    </CheckoutCard>
  );
}
