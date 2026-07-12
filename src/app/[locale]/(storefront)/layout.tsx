import { Header } from "@/components/storefront/layout/Header";
import { Footer } from "@/components/storefront/layout/Footer";
import { MobileBottomBar } from "@/components/storefront/layout/MobileBottomBar";
import { StorefrontMain } from "@/components/storefront/layout/StorefrontMain";
import { NavigationProgress } from "@/components/storefront/layout/NavigationProgress";
import { ThemePreferencePrompt } from "@/components/storefront/layout/ThemePreferencePrompt";
import { PersistedStoreSync } from "@/components/providers/PersistedStoreSync";
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
      <PersistedStoreSync />
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Header settings={settings} />
      <StorefrontMain>{children}</StorefrontMain>
      <Footer settings={settings} />
      <MobileBottomBar />
      <ThemePreferencePrompt />
    </>
  );
}
