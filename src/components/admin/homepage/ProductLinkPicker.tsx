"use client";

import { useState } from "react";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Button } from "@/components/ds/button";
import { Loader2, Link2, X } from "lucide-react";

interface ProductLinkPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  accessToken: string;
  placeholder?: string;
  hint?: string;
}

interface LookupResult {
  name: string;
  slug: string;
  image?: string;
}

export function ProductLinkPicker({
  label,
  value,
  onChange,
  accessToken,
  placeholder = "/products/your-product-slug",
  hint,
}: ProductLinkPickerProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = async () => {
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/admin/catalog/lookup?type=product&q=${encodeURIComponent(value)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      if (data.success && data.data) {
        setPreview(data.data);
        onChange(`/products/${data.data.slug}`);
      } else {
        setPreview(null);
        setError(data.error ?? "Product not found");
      }
    } catch {
      setError("Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setPreview(null);
            setError(null);
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" size="icon" onClick={lookup} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="icon" onClick={() => { onChange(""); setPreview(null); }}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
      {preview && (
        <p className="text-[12px] text-brand-accent">
          Found: {preview.name} ({preview.slug})
        </p>
      )}
      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  );
}

interface LinkListPickerProps {
  label: string;
  links: string[];
  onChange: (links: string[]) => void;
  accessToken: string;
  type: "product" | "category";
  hint?: string;
}

export function LinkListPicker({
  label,
  links,
  onChange,
  accessToken,
  type,
  hint,
}: LinkListPickerProps) {
  const [draft, setDraft] = useState("");

  const addLink = async () => {
    if (!draft.trim()) return;
    const res = await fetch(
      `/api/v1/admin/catalog/lookup?type=${type}&q=${encodeURIComponent(draft)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    if (data.success && data.data) {
      const path =
        type === "product"
          ? `/products/${data.data.slug}`
          : `/categories/${data.data.slug}`;
      if (!links.includes(path)) onChange([...links, path]);
      setDraft("");
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            type === "product"
              ? "Paste product URL or slug"
              : "Paste category URL or slug"
          }
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
        />
        <Button type="button" variant="outline" onClick={addLink}>
          Add
        </Button>
      </div>
      {links.length > 0 && (
        <ul className="space-y-1">
          {links.map((link) => (
            <li
              key={link}
              className="flex items-center justify-between rounded border border-border px-3 py-1.5 text-[13px]"
            >
              <span className="truncate">{link}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onChange(links.filter((l) => l !== link))}
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
