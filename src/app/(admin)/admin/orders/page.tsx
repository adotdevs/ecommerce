"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Badge } from "@/components/ds/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ds/table";
import { Input } from "@/components/ds/input";
import { Skeleton } from "@/components/ds/skeleton";
import { PriceDisplay } from "@/components/storefront/products/PriceDisplay";

interface Order {
  _id: string;
  orderNumber: string;
  email: string;
  total: number;
  status: string;
  createdAt: string;
}

const STATUSES = [
  "pending",
  "processing",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

export default function AdminOrdersPage() {
  const { accessToken } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    const q = filter ? `?status=${filter}` : "";
    fetch(`/api/v1/admin/orders${q}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.data?.orders ?? []);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (accessToken) load();
  }, [accessToken, filter]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/v1/admin/orders/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const filtered = orders.filter(
    (o) =>
      !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-h2 text-foreground">Orders</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Manage and track customer orders
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search orders..."
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="h-10 rounded-[var(--radius-sm)] border border-border bg-background px-3 text-small text-foreground"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-body text-muted-foreground">No orders found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((order) => (
              <TableRow key={order._id}>
                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                <TableCell className="text-muted-foreground">{order.email}</TableCell>
                <TableCell>
                  <PriceDisplay amountUsd={order.total} />
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{order.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <select
                    className="rounded-[var(--radius-sm)] border border-border bg-background px-2 py-1 text-small"
                    value={order.status}
                    onChange={(e) => updateStatus(order._id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
