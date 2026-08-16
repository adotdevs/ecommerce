import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, MapPin, Package, ShieldCheck } from "lucide-react";
import type { SiteSettingsPublic } from "@/types";

interface AuthBrandPanelProps {
  settings: SiteSettingsPublic | null;
}

export async function AuthBrandPanel({ settings }: AuthBrandPanelProps) {
  const t = await getTranslations("auth");
  const storeName = settings?.storeName?.trim() ?? "";
  const storeTagline = settings?.storeTagline?.trim() ?? "";

  const perks = [
    { icon: Package, label: t("perkOrders") },
    { icon: MapPin, label: t("perkAddresses") },
    { icon: ShieldCheck, label: t("perkSecure") },
  ];

  return (
    <aside className="relative hidden overflow-hidden bg-[linear-gradient(145deg,color-mix(in_srgb,var(--brand-primary)_14%,var(--background)),var(--background))] lg:flex lg:flex-col lg:justify-between lg:border-r lg:border-border/60 lg:p-10 xl:p-12">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_18%,transparent)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)] blur-3xl" />

      <div className="relative">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToStore", { storeName })}
        </Link>

        <div className="mt-10">
          <Link href="/" className="inline-flex items-center">
            {settings?.logo ? (
              <Image
                src={settings.logo}
                alt={storeName}
                width={160}
                height={44}
                className="h-9 w-auto md:h-10"
                priority
              />
            ) : (
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {storeName}
              </span>
            )}
          </Link>
          <p className="mt-4 max-w-sm text-lg font-semibold leading-snug text-foreground">
            {storeTagline}
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t("brandIntro", { storeName })}
          </p>
        </div>
      </div>

      <ul className="relative mt-10 space-y-3">
        {perks.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/70 px-4 py-3 text-sm text-foreground shadow-[var(--shadow-subtle)] backdrop-blur-sm"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] text-brand-primary">
              <Icon className="h-4 w-4" strokeWidth={2.25} />
            </span>
            {label}
          </li>
        ))}
      </ul>
    </aside>
  );
}
