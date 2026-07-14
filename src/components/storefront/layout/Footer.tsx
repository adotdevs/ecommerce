import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Truck, Shield, RefreshCw } from "lucide-react";
import type { SiteSettingsPublic } from "@/types";
import { PaymentMethodBadges } from "@/components/storefront/cart/PaymentMethodBadges";

interface FooterProps {
  settings: SiteSettingsPublic | null;
}

export async function Footer({ settings }: FooterProps) {
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const storeName = settings?.storeName ?? "";
  const storeTagline = settings?.storeTagline ?? "";

  return (
    <footer className="store-footer mt-auto">
      <div className="border-b border-border bg-primary/5">
        <div className="container-store flex flex-wrap items-center justify-center gap-6 py-5 text-center md:gap-10">
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="h-4 w-4 text-primary" />
            Free shipping on qualifying orders
          </span>
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            Secure checkout
          </span>
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 text-primary" />
            Easy returns
          </span>
        </div>
      </div>

      <div className="container-store py-14 md:py-16">
        <div className="store-footer__grid">
          <div>
            {storeName && (
              <h3 className="mb-3 text-lg font-bold tracking-tight text-foreground">
                {storeName}
              </h3>
            )}
            {storeTagline && (
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                {storeTagline}
              </p>
            )}
            <p className="mt-4 text-xs text-muted-foreground">{t("trustNote")}</p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">{t("shop")}</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/products" className="transition-colors hover:text-foreground">
                  {tn("allProducts")}
                </Link>
              </li>
              <li>
                <Link href="/categories" className="transition-colors hover:text-foreground">
                  {tn("categories")}
                </Link>
              </li>
              <li>
                <Link href="/new-arrivals" className="transition-colors hover:text-foreground">
                  {tn("newArrivals")}
                </Link>
              </li>
              <li>
                <Link href="/bestsellers" className="transition-colors hover:text-foreground">
                  {tn("bestSellers")}
                </Link>
              </li>
              <li>
                <Link href="/deals" className="transition-colors hover:text-foreground">
                  {tn("deals")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">{t("company")}</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/pages/about" className="transition-colors hover:text-foreground">
                  {t("about")}
                </Link>
              </li>
              <li>
                <Link href="/pages/contact" className="transition-colors hover:text-foreground">
                  {t("contact")}
                </Link>
              </li>
              <li>
                <Link href="/pages/privacy" className="transition-colors hover:text-foreground">
                  {t("privacy")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">{t("support")}</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {settings?.supportEmail && (
                <li>
                  <a href={`mailto:${settings.supportEmail}`} className="hover:text-foreground">
                    {settings.supportEmail}
                  </a>
                </li>
              )}
              {settings?.supportPhone && <li>{settings.supportPhone}</li>}
              {settings?.deliveryInfo && <li>{settings.deliveryInfo}</li>}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-6 border-t border-border pt-8">
          <div className="text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {t("payments")}
            </p>
            <PaymentMethodBadges />
          </div>
          {storeName && (
            <p className="text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} {storeName}. {t("rights")}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
