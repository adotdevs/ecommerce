"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Textarea } from "@/components/ds/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { ImageUpload } from "@/components/admin/homepage/ImageUpload";
import { AiAssistButton, postAiSuggest } from "@/components/admin/AiAssistButton";
import { Loader2, Pencil, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast, toastError, toastSaveSuccess } from "@/hooks/use-toast";

interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  image?: string;
  sortOrder: number;
  productCount?: number;
  seo?: {
    title?: string;
    description?: string;
  };
}

const emptyForm = {
  name: "",
  slug: "",
  parentId: "",
  description: "",
  image: "",
  sortOrder: 0,
  seoTitle: "",
  seoDescription: "",
};

export default function AdminCategoriesPage() {
  const { accessToken } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = () => {
    if (!accessToken) return;
    setLoading(true);
    fetch("/api/v1/admin/categories", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => setCategories(d.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (accessToken) load();
  }, [accessToken]);

  const startEdit = (c: Category) => {
    setEditingId(c._id);
    setForm({
      name: c.name,
      slug: c.slug,
      parentId: c.parentId ? String(c.parentId) : "",
      description: c.description ?? "",
      image: c.image ?? "",
      sortOrder: c.sortOrder ?? 0,
      seoTitle: c.seo?.title ?? "",
      seoDescription: c.seo?.description ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const fillFromAi = async (name: string, parentId?: string) => {
    if (!accessToken || !name.trim()) return;
    setAiLoading(true);
    try {
      const parentName = parentId
        ? categories.find((c) => c._id === parentId)?.name
        : undefined;
      const res = await postAiSuggest<{
        description: string;
        seoTitle: string;
        seoDescription: string;
      }>(accessToken, "/api/v1/admin/ai/suggest-category", {
        name: name.trim(),
        parentName,
      });
      if (res.success && res.data) {
        setForm((f) => ({
          ...f,
          description: res.data!.description || f.description,
          seoTitle: res.data!.seoTitle || f.seoTitle,
          seoDescription: res.data!.seoDescription || f.seoDescription,
        }));
        toast({ variant: "success", title: "AI filled category copy" });
      } else {
        toastError("AI failed", res.error ?? "Could not generate content.");
      }
    } catch {
      toastError("AI failed", "Network error.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (editingId || !form.name.trim() || form.description.trim()) return;
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
    aiDebounceRef.current = setTimeout(() => {
      void fillFromAi(form.name, form.parentId || undefined);
    }, 1200);
    return () => {
      if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
    };
  }, [form.name, form.parentId, editingId]);

  const payload = () => ({
    name: form.name,
    slug: form.slug || undefined,
    parentId: form.parentId || undefined,
    description: form.description || undefined,
    image: form.image || undefined,
    sortOrder: Number(form.sortOrder) || 0,
    seo: {
      title: form.seoTitle || undefined,
      description: form.seoDescription || undefined,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    try {
      const url = editingId
        ? `/api/v1/admin/categories/${editingId}`
        : "/api/v1/admin/categories";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload()),
      });
      const data = await res.json();
      if (data.success) {
        toastSaveSuccess({
          sectionName: editingId ? "Category updated" : "Category created",
          englishOnly: true,
        });
        cancelEdit();
        load();
      } else {
        toastError("Save failed", data.error ?? "Could not save category.");
      }
    } catch {
      toastError("Save failed", "Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!accessToken) return;
    if (!confirm(`Delete category “${name}”? Brands linked to it will keep other links.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/admin/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.success) {
        toast({ variant: "success", title: "Category deleted" });
        if (editingId === id) cancelEdit();
        load();
      } else {
        toastError("Delete failed", data.error);
      }
    } catch {
      toastError("Delete failed", "Network error");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-h2 text-foreground">Categories</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Manage collections shown on{" "}
          <a href="/categories" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            /categories
          </a>
          . Link brands under Brands. Edit directory page copy in Catalog Pages.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {editingId ? (
                <>
                  <Pencil className="h-4 w-4" /> Edit category
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Add category
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug (optional)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto-from-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Parent category (optional)</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                >
                  <option value="">None (top-level)</option>
                  {categories
                    .filter((c) => c._id !== editingId)
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Description</Label>
                  <AiAssistButton
                    label="AI write"
                    loading={aiLoading}
                    disabled={!form.name.trim()}
                    onClick={() => fillFromAi(form.name, form.parentId || undefined)}
                  />
                </div>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Shown on category page and directory cards"
                />
              </div>
              {accessToken && (
                <ImageUpload
                  label="Category image"
                  value={form.image}
                  onChange={(url) => setForm({ ...form, image: url })}
                  accessToken={accessToken}
                  folder="categories"
                  aspectHint="16:10 recommended"
                />
              )}
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
                  }
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
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editingId ? "Update" : "Create"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="hidden px-4 py-3 text-left sm:table-cell">Slug</th>
                  <th className="hidden px-4 py-3 text-left md:table-cell">Order</th>
                  <th className="hidden px-4 py-3 text-left lg:table-cell">Products</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No categories yet. Create your first collection.
                    </td>
                  </tr>
                ) : (
                  categories.map((c) => (
                    <tr key={c._id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {c.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.image}
                              alt=""
                              className="h-10 w-14 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-14 items-center justify-center rounded-md bg-secondary text-small font-semibold text-muted-foreground">
                              {c.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{c.name}</p>
                            {c.description && (
                              <p className="line-clamp-1 text-[12px] text-muted-foreground">
                                {c.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {c.slug}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {c.sortOrder}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        {c.productCount ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" asChild>
                            <a
                              href={`/categories/${c.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              title="View"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => startEdit(c)}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(c._id, c.name)}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
