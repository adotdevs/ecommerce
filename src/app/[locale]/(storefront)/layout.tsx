import { Header } from "@/components/storefront/layout/Header";
import { Footer } from "@/components/storefront/layout/Footer";
import { MobileBottomBar } from "@/components/storefront/layout/MobileBottomBar";
import { NavigationProgress } from "@/components/storefront/layout/NavigationProgress";
import { ThemePreferencePrompt } from "@/components/storefront/layout/ThemePreferencePrompt";
import { getSiteSettings } from "@/lib/data/site-settings";
import { toPublicSiteSettings } from "@/lib/site/branding";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = toPublicSiteSettings(await getSiteSettings());

  return (
    <>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Header settings={settings} />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer settings={settings} />
      <MobileBottomBar />
      <ThemePreferencePrompt />
    </>
  );
}
