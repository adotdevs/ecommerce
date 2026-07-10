"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { Plus, Trash2, RefreshCw, Wand2 } from "lucide-react";
import {
  type VariantOptionGroup,
  type VariantOptionType,
  VARIANT_OPTION_PRESETS,
  newOptionGroup,
  optionKey,
  generateVariantsFromOptions,
  applySmartVariantPrices,
} from "@/lib/catalog/variant-options";

export interface AdminVariantRow {
  id: string;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  attributes: Record<string, string>;
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
}: ProductVariantBuilderProps) {
  const [presetType, setPresetType] = useState<VariantOptionType>("color");
  const [smartBasePrice, setSmartBasePrice] = useState(basePrice);

  useEffect(() => {
    if (basePrice) setSmartBasePrice(basePrice);
  }, [basePrice]);

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
    }));

    const generated = generateVariantsFromOptions(
      optionGroups,
      { sku: baseSku || "SKU", price, compareAtPrice: compareAt, stock },
      existing
    );

    onVariantsChange(
      generated.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: String(v.price),
        compareAtPrice: v.compareAtPrice != null ? String(v.compareAtPrice) : "",
        stock: String(v.stock),
        attributes: v.attributes,
      }))
    );
  };

  const updateVariant = (index: number, patch: Partial<AdminVariantRow>) => {
    onVariantsChange(
      variants.map((v, i) => (i === index ? { ...v, ...patch } : v))
    );
  };

  const applySmartPrices = (basePriceStr: string) => {
    const base = parseFloat(basePriceStr);
    if (!base || Number.isNaN(base)) return;
    const compareAt = baseCompareAt.trim() ? parseFloat(baseCompareAt) : undefined;

    const numeric = variants.map((v) => ({
      ...v,
      price: parseFloat(v.price) || 0,
      compareAtPrice: v.compareAtPrice.trim()
        ? parseFloat(v.compareAtPrice)
        : undefined,
      attributes: v.attributes,
    }));

    const updated = applySmartVariantPrices(
      numeric,
      base,
      compareAt,
      optionGroups
    );

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
      }))
    );
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
            Add options like Color, Shoe Size, or Material. Variants are generated from all combinations.
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
                Enter one base price — others auto-fill with smart adjustments by color, size, material, etc. You can edit any row after.
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
                  onChange={(e) => setSmartBasePrice(e.target.value)}
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
              <table className="w-full min-w-[640px] text-small">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-3">Variant</th>
                    <th className="pb-2 pr-3">SKU</th>
                    <th className="pb-2 pr-3">Price</th>
                    <th className="pb-2 pr-3">Compare</th>
                    <th className="pb-2">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => (
                    <tr key={v.id} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-medium">{v.name}</td>
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
