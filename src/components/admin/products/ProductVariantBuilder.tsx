"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { Plus, Trash2, RefreshCw, Wand2, Upload, Loader2, X, Star, ChevronUp, ChevronDown } from "lucide-react";
import {
  type VariantOptionGroup,
  type VariantOptionType,
  VARIANT_OPTION_PRESETS,
  newOptionGroup,
  optionKey,
  generateVariantsFromOptions,
  applySmartVariantPrices,
} from "@/lib/catalog/variant-options";
import type { ProductMediaItem } from "./ProductMediaGallery";

export interface AdminVariantRow {
  id: string;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  attributes: Record<string, string>;
  media: ProductMediaItem[];
}

interface ProductVariantBuilderProps {
  baseSku: string;
  basePrice: string;
  baseCompareAt: string;
  baseStock: string;
  optionGroups: VariantOptionGroup[];
  variants: AdminVariantRow[];
  onOptionGroupsChange: (groups: VariantOptionGroup[]) => void;
  onVariantsChange: (variants: AdminVariantRow[]) => void;
  onBasePriceChange?: (price: string) => void;
  accessToken?: string;
  productName?: string;
}

export function ProductVariantBuilder({
  baseSku,
  basePrice,
  baseCompareAt,
  baseStock,
  optionGroups,
  variants,
  onOptionGroupsChange,
  onVariantsChange,
  onBasePriceChange,
  accessToken = "",
  productName = "",
}: ProductVariantBuilderProps) {
  const [presetType, setPresetType] = useState<VariantOptionType>("color");
  const [smartBasePrice, setSmartBasePrice] = useState(basePrice);

  useEffect(() => {
    if (variants.length) {
      const prices = variants
        .map((v) => parseFloat(v.price))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (prices.length) {
        setSmartBasePrice(String(Math.min(...prices)));
        return;
      }
    }
    if (basePrice) setSmartBasePrice(basePrice);
  }, [variants, basePrice]);

  const addOptionGroup = () => {
    onOptionGroupsChange([...optionGroups, newOptionGroup(presetType)]);
  };

  const updateGroup = (index: number, patch: Partial<VariantOptionGroup>) => {
    const next = optionGroups.map((g, i) =>
      i === index ? { ...g, ...patch } : g
    );
    onOptionGroupsChange(next);
  };

  const removeGroup = (index: number) => {
    onOptionGroupsChange(optionGroups.filter((_, i) => i !== index));
  };

  const addValueToGroup = (groupIndex: number) => {
    const g = optionGroups[groupIndex];
    updateGroup(groupIndex, {
      values: [...g.values, { value: "", label: "" }],
    });
  };

  const updateValue = (
    groupIndex: number,
    valueIndex: number,
    patch: Partial<{ value: string; label: string; hex?: string }>
  ) => {
    const g = optionGroups[groupIndex];
    const values = g.values.map((v, i) =>
      i === valueIndex ? { ...v, ...patch } : v
    );
    updateGroup(groupIndex, { values });
  };

  const removeValue = (groupIndex: number, valueIndex: number) => {
    const g = optionGroups[groupIndex];
    updateGroup(groupIndex, {
      values: g.values.filter((_, i) => i !== valueIndex),
    });
  };

  const generateVariants = () => {
    const price = parseFloat(basePrice) || 0;
    const compareAt = baseCompareAt.trim() ? parseFloat(baseCompareAt) : undefined;
    const stock = parseInt(baseStock) || 0;

    const existing = variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: parseFloat(v.price) || price,
      compareAtPrice: v.compareAtPrice.trim()
        ? parseFloat(v.compareAtPrice)
        : compareAt,
      stock: parseInt(v.stock) || 0,
      attributes: v.attributes,
      media: v.media,
    }));

    const generated = generateVariantsFromOptions(
      optionGroups,
      { sku: baseSku || "SKU", price, compareAtPrice: compareAt, stock },
      existing
    );

    onVariantsChange(
      generated.map((v) => {
        const prev = variants.find((row) => row.id === v.id);
        return {
          id: v.id,
          name: v.name,
          sku: v.sku,
          price: String(v.price),
          compareAtPrice: v.compareAtPrice != null ? String(v.compareAtPrice) : "",
          stock: String(v.stock),
          attributes: v.attributes,
          media: v.media?.length
            ? v.media.map((m, i) => ({
                url: m.url,
                alt: m.alt ?? "",
                type: (m.type ?? "image") as "image" | "video",
                sortOrder: m.sortOrder ?? i,
              }))
            : prev?.media ?? [],
        };
      })
    );
  };

  const updateVariant = (index: number, patch: Partial<AdminVariantRow>) => {
    onVariantsChange(
      variants.map((v, i) => (i === index ? { ...v, ...patch } : v))
    );
  };

  const applySmartPrices = (basePriceStr: string) => {
    const base = parseFloat(basePriceStr);
    if (Number.isNaN(base) || base < 0) return;
    const compareAt = baseCompareAt.trim() ? parseFloat(baseCompareAt) : undefined;

    const numeric = variants.map((v) => ({
      ...v,
      price: parseFloat(v.price) || 0,
      compareAtPrice: v.compareAtPrice.trim()
        ? parseFloat(v.compareAtPrice)
        : undefined,
      attributes: v.attributes,
    }));

    const updated =
      variants.length === 1
        ? numeric.map((v) => ({
            ...v,
            price: base,
            compareAtPrice:
              compareAt != null && compareAt > 0 ? compareAt : v.compareAtPrice,
          }))
        : applySmartVariantPrices(numeric, base, compareAt, optionGroups);

    onVariantsChange(
      updated.map((v, i) => ({
        id: variants[i].id,
        name: variants[i].name,
        sku: variants[i].sku,
        price: String(v.price),
        compareAtPrice:
          v.compareAtPrice != null ? String(v.compareAtPrice) : "",
        stock: variants[i].stock,
        attributes: variants[i].attributes,
        media: variants[i].media ?? [],
      }))
    );
    onBasePriceChange?.(basePriceStr);
  };

  const handleBasePriceChange = (value: string) => {
    setSmartBasePrice(value);
    if (variants.length === 1) {
      applySmartPrices(value);
    }
  };

  const handlePriceChange = (index: number, price: string) => {
    const parsed = parseFloat(price);
    const othersUnset = variants.every(
      (v, i) => i === index || !parseFloat(v.price)
    );

    if (parsed > 0 && othersUnset && variants.length > 1) {
      applySmartPrices(price);
      return;
    }

    updateVariant(index, { price });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Product options</CardTitle>
          <p className="text-[12px] text-muted-foreground">
            Add options like Color, Shoe Size, Pack size, or Material. Variants are generated from all combinations.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Add option type</Label>
              <select
                className="flex h-10 min-w-[200px] rounded-lg border border-border bg-background px-3 text-sm"
                value={presetType}
                onChange={(e) => setPresetType(e.target.value as VariantOptionType)}
              >
                {Object.entries(VARIANT_OPTION_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" variant="outline" onClick={addOptionGroup}>
              <Plus className="mr-2 h-4 w-4" />
              Add option
            </Button>
            {optionGroups.length > 0 && (
              <Button type="button" onClick={generateVariants}>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate variants
              </Button>
            )}
          </div>

          {optionGroups.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-small text-muted-foreground">
              No options yet. Add Color for apparel, Shoe Size for footwear, Capacity for electronics, etc.
            </p>
          ) : (
            <div className="space-y-4">
              {optionGroups.map((group, gi) => (
                <div
                  key={group.id}
                  className="rounded-lg border border-border bg-secondary/20 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={group.name}
                        onChange={(e) => updateGroup(gi, { name: e.target.value })}
                        className="max-w-[180px] font-medium"
                        placeholder="Option name"
                      />
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                        {VARIANT_OPTION_PRESETS[group.type]?.label ?? group.type}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeGroup(gi)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {group.values.map((val, vi) => (
                      <div key={vi} className="flex flex-wrap items-center gap-2">
                        {group.type === "color" && (
                          <input
                            type="color"
                            value={val.hex ?? "#111111"}
                            onChange={(e) =>
                              updateValue(gi, vi, { hex: e.target.value })
                            }
                            className="h-9 w-9 cursor-pointer rounded border border-border"
                          />
                        )}
                        <Input
                          value={val.label}
                          onChange={(e) => {
                            const label = e.target.value;
                            updateValue(gi, vi, {
                              label,
                              value:
                                val.value || optionKey(label) || label.toLowerCase(),
                            });
                          }}
                          placeholder="Display label"
                          className="max-w-[140px]"
                        />
                        <Input
                          value={val.value}
                          onChange={(e) => updateValue(gi, vi, { value: e.target.value })}
                          placeholder="Value key"
                          className="max-w-[120px] text-[12px]"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeValue(gi, vi)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addValueToGroup(gi)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add value
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {variants.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Variants ({variants.length})</CardTitle>
              <p className="text-[12px] text-muted-foreground">
                Enter one base price — others auto-fill with smart adjustments. Add
                images per variant so the product gallery switches when shoppers
                pick that option. Leave images empty to keep using product photos.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Base price</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={smartBasePrice}
                  onChange={(e) => handleBasePriceChange(e.target.value)}
                  onBlur={() => {
                    if (variants.length > 1) applySmartPrices(smartBasePrice);
                  }}
                  className="h-8 w-28"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applySmartPrices(smartBasePrice);
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applySmartPrices(smartBasePrice || variants[0]?.price || "0")}
              >
                <Wand2 className="mr-1 h-3.5 w-3.5" />
                Smart prices
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={generateVariants}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Regenerate
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-small">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-3">Variant</th>
                    <th className="pb-2 pr-3">Images</th>
                    <th className="pb-2 pr-3">SKU</th>
                    <th className="pb-2 pr-3">Price</th>
                    <th className="pb-2 pr-3">Compare</th>
                    <th className="pb-2">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => (
                    <tr key={v.id} className="border-b border-border/60 align-top">
                      <td className="py-2 pr-3 font-medium">{v.name}</td>
                      <td className="py-2 pr-3">
                        <VariantMediaCell
                          media={v.media ?? []}
                          accessToken={accessToken}
                          productName={productName}
                          onChange={(media) => updateVariant(i, { media })}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          value={v.sku}
                          onChange={(e) => updateVariant(i, { sku: e.target.value })}
                          className="h-8 min-w-[120px]"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={v.price}
                          onChange={(e) => handlePriceChange(i, e.target.value)}
                          className="h-8 w-24"
                          title={
                            i === 0
                              ? "Set first price to auto-fill others with smart adjustments"
                              : undefined
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={v.compareAtPrice}
                          onChange={(e) =>
                            updateVariant(i, { compareAtPrice: e.target.value })
                          }
                          className="h-8 w-24"
                        />
                      </td>
                      <td className="py-2">
                        <Input
                          type="number"
                          min="0"
                          value={v.stock}
                          onChange={(e) => updateVariant(i, { stock: e.target.value })}
                          className="h-8 w-20"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VariantMediaCell({
  media,
  accessToken,
  productName,
  onChange,
}: {
  media: ProductMediaItem[];
  accessToken: string;
  productName: string;
  onChange: (media: ProductMediaItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pathRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);

  const isHttpUrl = (value: string) => {
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const isLocalPublicPath = (value: string) => {
    const path = value.trim();
    return path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
  };

  const isUsableImageSrc = (value: string) => {
    const path = value.trim();
    return Boolean(path) && (isHttpUrl(path) || isLocalPublicPath(path));
  };

  const reindex = (items: ProductMediaItem[]) =>
    items.map((m, i) => ({ ...m, sortOrder: i }));

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length || !accessToken) return;
    setUploading(true);
    setPathError(null);
    const next = [...media];
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "products");
        const res = await fetch("/api/v1/admin/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.data?.url) {
          next.push({
            url: data.data.url as string,
            alt: productName ? `${productName} variant` : "",
            type: "image",
            sortOrder: next.length,
          });
        }
      }
      onChange(reindex(next));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const addPathOrUrl = () => {
    const raw = pathRef.current?.value?.trim() ?? "";
    if (!raw) return;
    if (!isUsableImageSrc(raw)) {
      setPathError("Use https://… or a local path like /brand/photo.png");
      return;
    }
    if (media.some((m) => m.url === raw)) {
      setPathError("That image is already on this variant");
      return;
    }
    setPathError(null);
    onChange(
      reindex([
        ...media,
        {
          url: raw,
          alt: productName ? `${productName} variant` : "",
          type: "image",
          sortOrder: media.length,
        },
      ])
    );
    if (pathRef.current) pathRef.current.value = "";
  };

  const removeAt = (index: number) => {
    onChange(reindex(media.filter((_, i) => i !== index)));
  };

  const makePrimary = (index: number) => {
    if (index === 0) return;
    const next = [...media];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange(reindex(next));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(reindex(next));
  };

  return (
    <div className="min-w-[220px] max-w-[280px] space-y-2 py-1">
      {media.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No variant images — storefront uses product photos.
        </p>
      ) : (
        <div className="space-y-1.5">
          {media.map((item, index) => (
            <div
              key={`${item.url}-${index}`}
              className="flex items-center gap-2 rounded-md border border-border bg-card p-1.5"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-secondary">
                {index === 0 && (
                  <span className="absolute left-0.5 top-0.5 z-10 flex items-center gap-0.5 rounded bg-primary px-1 py-px text-[9px] font-semibold text-white">
                    <Star className="h-2 w-2" /> Primary
                  </span>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] text-muted-foreground" title={item.url}>
                  {item.url}
                </p>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {index !== 0 && (
                    <button
                      type="button"
                      className="text-[10px] font-medium text-primary hover:underline"
                      onClick={() => makePrimary(index)}
                    >
                      Set primary
                    </button>
                  )}
                  {index === 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      Shown first in gallery
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                  title="Move up"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === media.length - 1}
                  onClick={() => moveItem(index, 1)}
                  title="Move down"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeAt(index)}
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={uploading || !accessToken}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-border px-2 text-[11px] text-muted-foreground hover:bg-secondary disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          className="hidden"
          onChange={(e) => void uploadFiles(e.target.files)}
        />
      </div>

      <div className="space-y-1">
        <div className="flex gap-1">
          <Input
            ref={pathRef}
            className="h-8 text-[11px]"
            placeholder="/brand/photo.png or https://…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPathOrUrl();
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={addPathOrUrl}>
            Add
          </Button>
        </div>
        {pathError ? (
          <p className="text-[10px] text-destructive">{pathError}</p>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Paste URL or local public path — first image is primary.
          </p>
        )}
      </div>
    </div>
  );
}
