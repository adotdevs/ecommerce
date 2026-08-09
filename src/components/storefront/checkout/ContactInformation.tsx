"use client";

import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useCustomerSession } from "@/hooks/use-customer-session";
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
  const { customerEmail, isCustomer, isGuest, resolved } = useCustomerSession();

  return (
    <CheckoutCard title={t("contactTitle")} subtitle={t("contactSubtitle")}>
      <CheckoutField
        id="email"
        label={t("email")}
        type="email"
        value={form.email ?? ""}
        onChange={(email) => onChange({ email })}
        placeholder={t("placeholders.email")}
        required
        icon={Mail}
        valid={isValidEmail(form.email ?? "")}
        error={errors.email ? t(`errors.${errors.email}`) : undefined}
      />

      {isCustomer && customerEmail ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("signedInAs", { email: customerEmail })}{" "}
          <Link href="/account" className="font-medium text-primary hover:underline">
            {t("manageAccount")}
          </Link>
        </p>
      ) : (
        resolved &&
        isGuest && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("alreadyHaveAccount")}{" "}
            <Link
              href="/login?redirect=/checkout"
              className="font-medium text-primary hover:underline"
            >
              {t("signIn")}
            </Link>
          </p>
        )
      )}

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
