"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { toast, toastError } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";

interface Promo {
  _id: string;
  code: string;
  percentOff: number;
  active: boolean;
  minOrderUsd?: number;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  description?: string;
}

const emptyForm = {
  code: "",
  percentOff: "10",
  description: "",
  minOrderUsd: "",
  maxUses: "",
  expiresAt: "",
};

export default function AdminPromosPage() {
  const { accessToken } = useAuthStore();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/v1/admin/promos", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((res) => setPromos(res.data ?? []));
  };

  useEffect(() => {
    if (accessToken) load();
  }, [accessToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/promos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          code: form.code,
          percentOff: Number(form.percentOff),
          description: form.description || undefined,
          minOrderUsd: form.minOrderUsd ? Number(form.minOrderUsd) : undefined,
          maxUses: form.maxUses ? Number(form.maxUses) : undefined,
          expiresAt: form.expiresAt
            ? new Date(form.expiresAt).toISOString()
            : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ variant: "success", title: "Promo code created" });
        setForm(emptyForm);
        load();
      } else {
        toastError("Failed", data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (promo: Promo) => {
    await fetch(`/api/v1/admin/promos/${promo._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ active: !promo.active }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this promo code?")) return;
    await fetch(`/api/v1/admin/promos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Promo Codes</h1>
        <p className="mt-1 text-muted-foreground">
          Create percentage-off codes customers can apply at checkout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create promo code</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                placeholder="SUMMER20"
                required
                className="uppercase"
              />
            </div>
            <div>
              <Label htmlFor="percentOff">Percent off (%)</Label>
              <Input
                id="percentOff"
                type="number"
                min={1}
                max={100}
                value={form.percentOff}
                onChange={(e) => setForm({ ...form, percentOff: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Summer sale discount"
              />
            </div>
            <div>
              <Label htmlFor="minOrder">Min order (USD, optional)</Label>
              <Input
                id="minOrder"
                type="number"
                min={0}
                value={form.minOrderUsd}
                onChange={(e) => setForm({ ...form, minOrderUsd: e.target.value })}
                placeholder="50"
              />
            </div>
            <div>
              <Label htmlFor="maxUses">Max uses (optional)</Label>
              <Input
                id="maxUses"
                type="number"
                min={1}
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                placeholder="100"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="expiresAt">Expires at (optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create promo code
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active promo codes</CardTitle>
        </CardHeader>
        <CardContent>
          {promos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No promo codes yet.</p>
          ) : (
            <div className="space-y-3">
              {promos.map((promo) => (
                <div
                  key={promo._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
                >
                  <div>
                    <p className="font-semibold">{promo.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {promo.percentOff}% off
                      {promo.minOrderUsd != null && ` · min $${promo.minOrderUsd}`}
                      {promo.maxUses != null &&
                        ` · ${promo.usedCount}/${promo.maxUses} used`}
                    </p>
                    {promo.description && (
                      <p className="text-xs text-muted-foreground">{promo.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={promo.active ? "primary" : "outline"}
                      size="sm"
                      onClick={() => toggleActive(promo)}
                    >
                      {promo.active ? "Active" : "Inactive"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(promo._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
