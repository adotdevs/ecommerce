import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminSessionKeeper } from "@/components/admin/AdminSessionKeeper";
import { getSiteSettings } from "@/lib/data/site-settings";
import { resolveBranding } from "@/lib/site/branding";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = resolveBranding(await getSiteSettings());

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSessionKeeper />
      <AdminSidebar
        storeName={branding.storeName}
        adminBrandShort={branding.adminBrandShort}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
