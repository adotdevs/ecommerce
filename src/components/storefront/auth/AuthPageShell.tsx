import { Link } from "@/i18n/navigation";
import { AuthBrandPanel } from "@/components/storefront/auth/AuthBrandPanel";
import { BrandLogo } from "@/components/storefront/layout/BrandLogo";
import type { SiteSettingsPublic } from "@/types";

interface AuthPageShellProps {
  settings: SiteSettingsPublic | null;
  children: React.ReactNode;
}

export function AuthPageShell({ settings, children }: AuthPageShellProps) {
  const storeName = settings?.storeName?.trim();

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] xl:grid-cols-[minmax(0,1fr)_560px]">
        <AuthBrandPanel settings={settings} />

        <div className="flex flex-col">
          <div className="border-b border-border/60 px-4 py-4 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-3">
              <BrandLogo
                logo={settings?.logo}
                logoDark={settings?.logoDark}
                storeName={storeName}
                className="h-7 w-auto"
                fallbackClassName="text-lg text-foreground"
                priority
              />
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 md:py-12">
            <div className="w-full max-w-md">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
