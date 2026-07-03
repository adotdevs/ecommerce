"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { Skeleton } from "@/components/ds/skeleton";
import { Package, ShoppingCart, FolderTree, Tag, TrendingUp, DollarSign } from "lucide-react";

export default function AdminDashboardPage() {
  const { accessToken } = useAuthStore();
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    categories: 0,
    brands: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [products, categories, brands, orders] = await Promise.all([
        fetch("/api/v1/admin/products?limit=1", { headers }).then((r) => r.json()),
        fetch("/api/v1/admin/categories", { headers }).then((r) => r.json()),
        fetch("/api/v1/admin/brands", { headers }).then((r) => r.json()),
        fetch("/api/v1/admin/orders", { headers }).then((r) => r.json()),
      ]);

      const orderList = orders.data ?? [];
      const revenue = orderList.reduce(
        (sum: number, o: { total?: number }) => sum + (o.total ?? 0),
        0
      );

      setStats({
        products: products.data?.pagination?.total ?? 0,
        orders: orderList.length,
        categories: categories.data?.length ?? 0,
        brands: brands.data?.length ?? 0,
        revenue,
      });
      setLoading(false);
    }
    if (accessToken) load();
  }, [accessToken]);

  const cards = [
    { label: "Total Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, trend: "+12%" },
    { label: "Orders", value: stats.orders, icon: ShoppingCart, trend: "+8%" },
    { label: "Products", value: stats.products, icon: Package, trend: null },
    { label: "Categories", value: stats.categories, icon: FolderTree, trend: null },
    { label: "Brands", value: stats.brands, icon: Tag, trend: null },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-h2 text-foreground">Dashboard</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Overview of your store performance
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-small font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-display-h3 text-foreground">{card.value}</div>
                    {card.trend && (
                      <p className="mt-1 flex items-center gap-1 text-small text-brand-accent">
                        <TrendingUp className="h-3 w-3" />
                        {card.trend} vs last month
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-small text-muted-foreground">
              Order and product activity will appear here.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <a href="/admin/products/new" className="text-small font-medium text-primary hover:underline">
              + Add Product
            </a>
            <a href="/admin/orders" className="text-small font-medium text-primary hover:underline">
              View Orders
            </a>
            <a href="/admin/settings" className="text-small font-medium text-primary hover:underline">
              Store Settings
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
