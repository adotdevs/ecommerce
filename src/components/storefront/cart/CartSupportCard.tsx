"use client";

import { Headphones } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Card } from "@heroui/react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/components/ds/utils";
import { useSiteBranding } from "@/components/providers/SiteBrandingProvider";

export function CartSupportCard({ className }: { className?: string }) {
  const t = useTranslations("cart");
  const router = useRouter();
  const { settings, storeName } = useSiteBranding();
  const supportEmail = settings?.supportEmail?.trim();
  const supportPhone = settings?.supportPhone?.trim();

  return (
    <Card className={cn("flex-row items-center justify-between gap-3 bg-secondary/50 p-4", className)}>
      <div className="min-w-0">
        <p className="text-small font-semibold text-foreground">
          {t("needHelp")}
          {storeName ? ` — ${storeName}` : ""}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{t("supportDesc")}</p>
        {(supportEmail || supportPhone) && (
          <p className="mt-1 text-[12px] text-muted-foreground">
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} className="hover:text-foreground">
                {supportEmail}
              </a>
            ) : null}
            {supportEmail && supportPhone ? " · " : null}
            {supportPhone ? (
              <a href={`tel:${supportPhone.replace(/\s/g, "")}`} className="hover:text-foreground">
                {supportPhone}
              </a>
            ) : null}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-2 h-8 rounded-full"
          onPress={() => router.push("/pages/contact")}
        >
          {t("contactSupport")}
        </Button>
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Headphones className="h-5 w-5" strokeWidth={1.75} />
      </div>
    </Card>
  );
}
