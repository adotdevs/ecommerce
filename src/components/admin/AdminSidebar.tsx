"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  FileText,
  Settings,
  Home,
  ShoppingCart,
  LogOut,
  ChevronRight,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import { cn } from "@/components/ds/utils";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/merchandising", label: "Merchandising", icon: Sparkles },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/brands", label: "Brands", icon: Tag },
  { href: "/admin/homepage", label: "Homepage", icon: Home },
  { href: "/admin/catalog-pages", label: "Catalog Pages", icon: LayoutGrid },
  { href: "/admin/cms", label: "CMS Pages", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    await fetch("/api/v1/auth/refresh", { method: "DELETE" });
    clearAuth();
    window.location.href = "/login";
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-6">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-primary-foreground text-small font-bold">
            YS
          </div>
          <div>
            <p className="text-body font-semibold text-foreground">YourStore</p>
            <p className="text-[11px] text-muted-foreground">Admin</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-small font-medium transition-colors duration-200",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {active && <ChevronRight className="ml-auto h-3 w-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="mb-3 truncate text-small text-muted-foreground">{user?.email}</p>
        <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
        <Button variant="outline" className="mt-2 w-full" asChild>
          <Link href="/">View Store</Link>
        </Button>
      </div>
    </aside>
  );
}
