import { getSiteSettings } from "@/lib/data/site-settings";
import { resolveBranding, toPublicSiteSettings } from "@/lib/site/branding";
import { AuthPageShell } from "@/components/storefront/auth/AuthPageShell";
import { AuthBrandingProvider } from "@/components/storefront/auth/AuthBrandingProvider";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = await getSiteSettings();
  const settings = toPublicSiteSettings(raw);
  const branding = resolveBranding(raw);

  return (
    <AuthPageShell settings={settings}>
      <AuthBrandingProvider
        value={{
          storeName: branding.storeName,
          storeTagline: branding.storeTagline,
        }}
      >
        {children}
      </AuthBrandingProvider>
    </AuthPageShell>
  );
}
