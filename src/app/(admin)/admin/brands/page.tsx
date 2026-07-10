"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Textarea } from "@/components/ds/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { AiAssistButton, postAiSuggest } from "@/components/admin/AiAssistButton";
import { toast, toastError } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface Brand {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  categoryIds?: string[];
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

const emptyForm = {
  name: "",
  description: "",
  seoTitle: "",
  seoDescription: "",
  categoryIds: [] as string[],
};

export default function AdminBrandsPage() {
  const { accessToken } = useAuthStore();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCats, setEditCats] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const load = () => {
    Promise.all([
      fetch("/api/v1/admin/brands", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json()),
      fetch("/api/v1/admin/categories", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json()),
    ]).then(([brandsRes, catsRes]) => {
      setBrands(
        (brandsRes.data ?? []).map((b: Brand & { categoryIds?: { toString(): string }[] }) => ({
          ...b,
          categoryIds: (b.categoryIds ?? []).map((id) => String(id)),
        }))
      );
      setCategories(catsRes.data ?? []);
    });
  };

  useEffect(() => {
    if (accessToken) load();
  }, [accessToken]);

  const toggleFormCat = (id: string) => {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((c) => c !== id)
        : [...f.categoryIds, id],
    }));
  };

  const fillBrandFromAi = async () => {
    if (!accessToken || !form.name.trim()) return;
    setAiLoading(true);
    try {
      const catNames = form.categoryIds
        .map((id) => categories.find((c) => c._id === id)?.name)
        .filter(Boolean) as string[];
      const res = await postAiSuggest<{
        description: string;
        seoTitle: string;
        seoDescription: string;
      }>(accessToken, "/api/v1/admin/ai/suggest-brand", {
        name: form.name.trim(),
        categories: catNames,
      });
      if (res.success && res.data) {
        setForm((f) => ({
          ...f,
          description: res.data!.description || f.description,
          seoTitle: res.data!.seoTitle || f.seoTitle,
          seoDescription: res.data!.seoDescription || f.seoDescription,
        }));
        toast({ variant: "success", title: "AI filled brand copy" });
      } else {
        toastError("AI failed", res.error ?? "Could not generate content.");
      }
    } catch {
      toastError("AI failed", "Network error.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/brands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          categoryIds: form.categoryIds,
          seo: {
            title: form.seoTitle || undefined,
            description: form.seoDescription || undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ variant: "success", title: "Brand created" });
        setForm(emptyForm);
        load();
      } else {
        toastError("Create failed", data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const saveCategories = async (brandId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/brands/${brandId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ categoryIds: editCats }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ variant: "success", title: "Brand categories updated" });
        setEditingId(null);
        load();
      } else {
        toastError("Update failed", data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const catName = (id: string) =>
    categories.find((c) => c._id === id)?.name ?? id;

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">Brands</h1>
      <p className="mb-8 text-body text-muted-foreground">
        Brands must be linked to one or more categories. They appear under those collections on the storefront.
      </p>
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add Brand</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Description</Label>
                  <AiAssistButton
                    label="AI write"
                    loading={aiLoading}
                    disabled={!form.name.trim()}
                    onClick={fillBrandFromAi}
                  />
                </div>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Brand story — click AI write after name + categories"
                />
              </div>
              <div className="space-y-1.5">
                <Label>SEO title</Label>
                <Input
                  value={form.seoTitle}
                  onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>SEO description</Label>
                <Textarea
                  value={form.seoDescription}
                  onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Categories</Label>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {categories.map((c) => (
                    <label
                      key={c._id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-small hover:bg-secondary"
                    >
                      <input
                        type="checkbox"
                        checked={form.categoryIds.includes(c._id)}
                        onChange={() => toggleFormCat(c._id)}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={saving || form.categoryIds.length === 0}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
              {form.categoryIds.length === 0 && (
                <p className="text-[12px] text-muted-foreground">
                  Select at least one category.
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Categories</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b._id} className="border-b align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{b.name}</p>
                    <p className="text-[11px] text-muted-foreground">{b.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === b._id ? (
                      <div className="max-h-36 space-y-1 overflow-y-auto">
                        {categories.map((c) => (
                          <label
                            key={c._id}
                            className="flex cursor-pointer items-center gap-2 text-[12px]"
                          >
                            <input
                              type="checkbox"
                              checked={editCats.includes(c._id)}
                              onChange={() =>
                                setEditCats((ids) =>
                                  ids.includes(c._id)
                                    ? ids.filter((x) => x !== c._id)
                                    : [...ids, c._id]
                                )
                              }
                            />
                            {c.name}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(b.categoryIds ?? []).length === 0 ? (
                          <span className="text-[12px] text-destructive">Unlinked</span>
                        ) : (
                          (b.categoryIds ?? []).map((id) => (
                            <span
                              key={id}
                              className="rounded-md bg-secondary px-2 py-0.5 text-[11px]"
                            >
                              {catName(id)}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === b._id ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveCategories(b._id)}
                          disabled={saving || editCats.length === 0}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(b._id);
                          setEditCats(b.categoryIds ?? []);
                        }}
                      >
                        Link categories
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
