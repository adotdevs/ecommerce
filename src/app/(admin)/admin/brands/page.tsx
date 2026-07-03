"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";

interface Brand {
  _id: string;
  name: string;
  slug: string;
}

export default function AdminBrandsPage() {
  const { accessToken } = useAuthStore();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState({ name: "" });

  const load = () => {
    fetch("/api/v1/admin/brands", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => setBrands(d.data ?? []));
  };

  useEffect(() => {
    if (accessToken) load();
  }, [accessToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/v1/admin/brands", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(form),
    });
    setForm({ name: "" });
    load();
  };

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold">Brands</h1>
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Add Brand</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ name: e.target.value })} required />
              </div>
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
        <div className="rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Slug</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b._id} className="border-b">
                  <td className="px-4 py-3">{b.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.slug}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
