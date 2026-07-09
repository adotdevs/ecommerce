import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { SiteSettingsPublic } from "@/types";

interface FooterProps {
  settings: SiteSettingsPublic | null;
}

export async function Footer({ settings }: FooterProps) {
  const t = await getTranslations("footer");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");

  return (
    <footer className="mt-auto border-t border-border bg-secondary">
      <div className="container-store py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-body font-semibold text-foreground">{tc("brand")}</h3>
            <p className="text-small text-muted-foreground leading-relaxed">
              Premium shopping experience with curated products worldwide.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-small font-semibold text-foreground">{t("shop")}</h4>
            <ul className="space-y-3 text-small text-muted-foreground">
              <li><Link href="/products" className="transition-colors hover:text-foreground">{tn("allProducts")}</Link></li>
              <li><Link href="/categories" className="transition-colors hover:text-foreground">{tn("categories")}</Link></li>
              <li><Link href="/new-arrivals" className="transition-colors hover:text-foreground">{tn("newArrivals")}</Link></li>
              <li><Link href="/bestsellers" className="transition-colors hover:text-foreground">{tn("bestSellers")}</Link></li>
              <li><Link href="/deals" className="transition-colors hover:text-foreground">{tn("deals")}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-small font-semibold text-foreground">{t("company")}</h4>
            <ul className="space-y-3 text-small text-muted-foreground">
              <li><Link href="/pages/about" className="transition-colors hover:text-foreground">{t("about")}</Link></li>
              <li><Link href="/pages/contact" className="transition-colors hover:text-foreground">{t("contact")}</Link></li>
              <li><Link href="/pages/privacy" className="transition-colors hover:text-foreground">{t("privacy")}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-small font-semibold text-foreground">{t("support")}</h4>
            <ul className="space-y-3 text-small text-muted-foreground">
              {settings?.supportEmail && <li>{settings.supportEmail}</li>}
              {settings?.supportPhone && <li>{settings.supportPhone}</li>}
              {settings?.deliveryInfo && <li>{settings.deliveryInfo}</li>}
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-border pt-8 text-center text-small text-muted-foreground">
          © {new Date().getFullYear()} {tc("brand")}. {t("rights")}
        </div>
      </div>
    </footer>
  );
}
