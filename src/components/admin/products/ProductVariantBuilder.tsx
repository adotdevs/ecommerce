"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { Plus, Trash2, Wand2, Upload, Loader2, X, Star, ChevronUp, ChevronDown } from "lucide-react";
import {
  type VariantOptionGroup,
  type VariantOptionType,
  VARIANT_OPTION_PRESETS,
  newOptionGroup,
  optionKey,
  uniqueOptionValue,
  generateVariantsFromOptions,
  applySmartVariantPrices,
} from "@/lib/catalog/variant-options";
import type { ProductMediaItem } from "./ProductMediaGallery";
import { cn } from "@/components/ds/utils";

export interface AdminVariantRow {
  id: string;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  attributes: Record<string, string>;
  media: ProductMediaItem[];
  /** Listing price + default storefront selection */
  isMain?: boolean;
}

interface ProductVariantBuilderProps {
  baseSku: string;
  basePrice: string;
  baseCompareAt: string;
  baseStock: string;
  optionGroups: VariantOptionGroup[];
  variants: AdminVariantRow[];
  productMedia?: ProductMediaItem[];
  onOptionGroupsChange: (groups: VariantOptionGroup[]) => void;
  onVariantsChange: (variants: AdminVariantRow[]) => void;
  /** When Main changes, push that variant’s images to product.media for storefront defaults */
  onMainMediaSync?: (media: ProductMediaItem[]) => void;
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
  productMedia = [],
  onOptionGroupsChange,
  onVariantsChange,
  onMainMediaSync,
  onBasePriceChange,
  accessToken = "",
  productName = "",
}: ProductVariantBuilderProps) {
  const [presetType, setPresetType] = useState<VariantOptionType>("color");
  const [smartBasePrice, setSmartBasePrice] = useState(basePrice);

  useEffect(() => {
    if (variants.length && !variants.some((v) => v.isMain)) {
      onVariantsChange(
        variants.map((v, i) => ({ ...v, isMain: i === 0 }))
      );
    }
    // Only when variant list lacks a Main — avoid depending on callback identity
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [variants]);

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
    commitGroups([...optionGroups, newOptionGroup(presetType)]);
  };

  const updateGroup = (index: number, patch: Partial<VariantOptionGroup>) => {
    commitGroups(
      optionGroups.map((g, i) => (i === index ? { ...g, ...patch } : g))
    );
  };

  const removeGroup = (index: number) => {
    commitGroups(optionGroups.filter((_, i) => i !== index));
  };

  const updateValue = (
    groupIndex: number,
    valueIndex: number,
    patch: Partial<{ value: string; label: string; hex?: string }>
  ) => {
    const g = optionGroups[groupIndex];
    const values = g.values.map((v, i) => {
      if (i !== valueIndex) return v;
      const next = { ...v, ...patch };
      if (patch.label != null && patch.value === undefined) {
        const others = g.values
          .filter((_, j) => j !== valueIndex)
          .map((x) => x.value);
        const autoFromOldLabel = optionKey(v.label || "");
        const shouldRefreshKey =
          !v.value.trim() ||
          v.value === autoFromOldLabel ||
          v.value === optionKey(patch.label);
        if (shouldRefreshKey) {
          next.value = uniqueOptionValue(patch.label, others);
        }
      }
      if (patch.value != null) {
        const others = g.values
          .filter((_, j) => j !== valueIndex)
          .map((x) => x.value);
        next.value = uniqueOptionValue(next.label || patch.value, others, patch.value);
      }
      return next;
    });
    commitGroups(
      optionGroups.map((group, i) =>
        i === groupIndex ? { ...group, values } : group
      )
    );
  };

  const addValueToGroup = (groupIndex: number) => {
    const g = optionGroups[groupIndex];
    commitGroups(
      optionGroups.map((group, i) =>
        i === groupIndex
          ? { ...group, values: [...g.values, { value: "", label: "" }] }
          : group
      )
    );
  };

  const removeValue = (groupIndex: number, valueIndex: number) => {
    const g = optionGroups[groupIndex];
    commitGroups(
      optionGroups.map((group, i) =>
        i === groupIndex
          ? { ...group, values: g.values.filter((_, j) => j !== valueIndex) }
          : group
      )
    );
  };

  /** Keep variants in lockstep with option groups; preserve price/SKU/media/main. */
  const reconcileVariants = (
    groups: VariantOptionGroup[],
    existingRows: AdminVariantRow[]
  ): AdminVariantRow[] => {
    const price = parseFloat(basePrice) || 0;
    const compareAt = baseCompareAt.trim()
      ? parseFloat(baseCompareAt)
      : undefined;
    const stock = parseInt(baseStock) || 0;

    const existing = existingRows.map((v) => ({
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
      isMain: v.isMain,
    }));

    const generated = generateVariantsFromOptions(
      groups,
      { sku: baseSku || "SKU", price, compareAtPrice: compareAt, stock },
      existing,
      true
    );

    if (!generated.length) return [];

    const byId = new Map(existingRows.map((v) => [v.id, v]));
    const byAttr = new Map(
      existingRows.map((v) => [JSON.stringify(v.attributes), v])
    );

    const rows = generated.map((v) => {
      const prev =
        byId.get(v.id) ?? byAttr.get(JSON.stringify(v.attributes));
      return {
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: String(v.price),
        compareAtPrice:
          v.compareAtPrice != null ? String(v.compareAtPrice) : "",
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
        isMain: Boolean(prev?.isMain),
      };
    });

    if (!rows.some((r) => r.isMain)) {
      rows[0] = { ...rows[0], isMain: true };
    } else {
      let seen = false;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].isMain) {
          if (seen) rows[i] = { ...rows[i], isMain: false };
          else seen = true;
        }
      }
    }
    return rows;
  };

  const commitGroups = (next: VariantOptionGroup[]) => {
    onOptionGroupsChange(next);
    onVariantsChange(reconcileVariants(next, variants));
  };

  const setMainVariant = (index: number) => {
    let next = variants.map((v, i) => ({
      ...v,
      isMain: i === index,
    }));
    const main = next[index];
    const mainMedia = (main.media ?? []).filter((m) => m.url?.trim());
    if (mainMedia.length) {
      onMainMediaSync?.(
        mainMedia.map((m, i) => ({ ...m, sortOrder: i }))
      );
    } else if (productMedia.length) {
      const copied = productMedia.map((m, i) => ({
        ...m,
        sortOrder: i,
      }));
      next = next.map((v, i) =>
        i === index ? { ...v, media: copied } : v
      );
      onMainMediaSync?.(copied);
    }
    onVariantsChange(next);
  };

  const updateVariant = (index: number, patch: Partial<AdminVariantRow>) => {
    const next = variants.map((v, i) => (i === index ? { ...v, ...patch } : v));
    onVariantsChange(next);
    if (patch.media !== undefined && next[index]?.isMain) {
      const media = (patch.media ?? []).filter((m) => m.url?.trim());
      if (media.length) {
        onMainMediaSync?.(media.map((m, i) => ({ ...m, sortOrder: i })));
      }
    }
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
        isMain: variants[i].isMain,
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

  const hasOptions = optionGroups.length > 0;
  const mainIndex = variants.findIndex((v) => v.isMain);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-subtle)]">
        <div className="border-b border-border bg-secondary/40 px-5 py-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Options
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            How shoppers choose this product
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
            Add option types below — variants update automatically. Pick one{" "}
            <strong className="font-medium text-foreground">Main</strong> row for
            the default price and images. With no options, set a simple price
            instead.
          </p>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Option types</h3>
                <p className="text-[12px] text-muted-foreground">
                  Color, size, pack… Adding or removing syncs the variant table.
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Type</Label>
                  <select
                    className="flex h-10 min-w-[180px] rounded-lg border border-border bg-background px-3 text-sm"
                    value={presetType}
                    onChange={(e) =>
                      setPresetType(e.target.value as VariantOptionType)
                    }
                  >
                    {Object.entries(VARIANT_OPTION_PRESETS).map(([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="button" onClick={addOptionGroup}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add option
                </Button>
              </div>
            </div>

            {!hasOptions ? (
              <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-5 py-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  Single product — no options
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Use price &amp; compare-at below. Add an option when buyers need
                  to choose size, pack, color, etc.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {optionGroups.map((group, gi) => (
                  <div
                    key={group.id}
                    className="rounded-xl border border-border bg-background p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          value={group.name}
                          onChange={(e) =>
                            updateGroup(gi, { name: e.target.value })
                          }
                          className="max-w-[200px] font-medium"
                          placeholder="Option name"
                        />
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                          {VARIANT_OPTION_PRESETS[group.type]?.label ?? group.type}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {group.values.filter((v) => v.value && v.label).length}{" "}
                          values · auto-synced
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeGroup(gi)}
                        title="Remove option (variants update automatically)"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {group.values.map((val, vi) => (
                        <div
                          key={`${group.id}-${vi}`}
                          className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/30 p-2"
                        >
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
                            onChange={(e) =>
                              updateValue(gi, vi, { label: e.target.value })
                            }
                            placeholder="Label (shoppers see this)"
                            className="max-w-[180px] bg-background"
                          />
                          <Input
                            value={val.value}
                            onChange={(e) =>
                              updateValue(gi, vi, { value: e.target.value })
                            }
                            placeholder="Key"
                            className="max-w-[120px] bg-background text-[12px]"
                            title="Internal key — unique in this option"
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
          </section>

          {variants.length > 0 ? (
            <section className="space-y-3 border-t border-border pt-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Variants ({variants.length})
                  </h3>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {mainIndex < 0 ? (
                      <span className="text-destructive">
                        Select a Main variant — required for listing price &amp;
                        default images.
                      </span>
                    ) : (
                      <>
                        Main is required. Row highlighted is the storefront
                        default.
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Smart fill from</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={smartBasePrice}
                      onChange={(e) => handleBasePriceChange(e.target.value)}
                      onBlur={() => {
                        if (variants.length > 1)
                          applySmartPrices(smartBasePrice);
                      }}
                      className="h-9 w-28"
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
                    onClick={() =>
                      applySmartPrices(
                        smartBasePrice || variants[0]?.price || "0"
                      )
                    }
                  >
                    <Wand2 className="mr-1 h-3.5 w-3.5" />
                    Smart prices
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[920px] text-small">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2.5">Variant</th>
                      <th className="px-3 py-2.5">Images</th>
                      <th className="px-3 py-2.5">Main</th>
                      <th className="px-3 py-2.5">SKU</th>
                      <th className="px-3 py-2.5">Price</th>
                      <th className="px-3 py-2.5">Compare</th>
                      <th className="px-3 py-2.5">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v, i) => (
                      <tr
                        key={v.id}
                        className={cn(
                          "border-b border-border/70 align-top last:border-0",
                          v.isMain && "bg-primary/[0.07]"
                        )}
                      >
                        <td className="px-3 py-2.5 font-medium">
                          {v.name}
                          {v.isMain ? (
                            <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              Main
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5">
                          <VariantMediaCell
                            media={v.media ?? []}
                            accessToken={accessToken}
                            productName={productName}
                            onChange={(media) => updateVariant(i, { media })}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
                            <input
                              type="radio"
                              name="variant-main"
                              className="h-4 w-4 border-border accent-primary"
                              checked={Boolean(v.isMain)}
                              onChange={() => setMainVariant(i)}
                            />
                            Default
                          </label>
                        </td>
                        <td className="px-3 py-2.5">
                          <Input
                            value={v.sku}
                            onChange={(e) =>
                              updateVariant(i, { sku: e.target.value })
                            }
                            className="h-8 min-w-[120px]"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <Input
                            type="number"
                            step="0.01"
                            value={v.price}
                            onChange={(e) =>
                              handlePriceChange(i, e.target.value)
                            }
                            className="h-8 w-24"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <Input
                            type="number"
                            step="0.01"
                            value={v.compareAtPrice}
                            onChange={(e) =>
                              updateVariant(i, {
                                compareAtPrice: e.target.value,
                              })
                            }
                            className="h-8 w-24"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <Input
                            type="number"
                            min="0"
                            value={v.stock}
                            onChange={(e) =>
                              updateVariant(i, { stock: e.target.value })
                            }
                            className="h-8 w-20"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      </div>
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
