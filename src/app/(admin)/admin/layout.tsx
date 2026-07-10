import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminSessionKeeper } from "@/components/admin/AdminSessionKeeper";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSessionKeeper />
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
