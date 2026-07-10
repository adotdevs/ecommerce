"use client";

import { useMemo, useState, useEffect } from "react";
import {
  type VariantOptionGroup,
  type VariantOptionValue,
  type ProductVariantInput,
  inferAttributeKeyForGroup,
  findVariantByAttributes,
  getAvailableValues,
} from "@/lib/catalog/variant-options";
import { cn } from "@/components/ds/utils";

interface ProductVariantSelectorProps {
  variantOptions: VariantOptionGroup[];
  variants: ProductVariantInput[];
  onVariantChange: (variant: ProductVariantInput | undefined) => void;
}

export function ProductVariantSelector({
  variantOptions,
  variants,
  onVariantChange,
}: ProductVariantSelectorProps) {
  const groups = useMemo(() => {
    if (variantOptions.length > 0) {
      return variantOptions.map((g) => ({
        key: inferAttributeKeyForGroup(g, variants),
        name: g.name,
        type: g.type,
        values: g.values,
      }));
    }
    const attrMap = new Map<string, Set<string>>();
    for (const v of variants) {
      for (const [key, val] of Object.entries(v.attributes ?? {})) {
        if (!attrMap.has(key)) attrMap.set(key, new Set());
        attrMap.get(key)!.add(val);
      }
    }
    return Array.from(attrMap.entries()).map(([key, values]) => ({
      key,
      name: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      type: key === "color" ? ("color" as const) : ("custom" as const),
      values: Array.from(values).map(
        (val): VariantOptionValue => ({ value: val, label: val })
      ),
    }));
  }, [variantOptions, variants]);

  const initialSelection = useMemo(() => {
    const first = variants[0];
    if (!first) return {};
    return { ...first.attributes };
  }, [variants]);

  const [selected, setSelected] = useState<Record<string, string>>(initialSelection);

  const matchedVariant = useMemo(
    () => findVariantByAttributes(variants, selected),
    [variants, selected]
  );

  useEffect(() => {
    onVariantChange(matchedVariant);
  }, [matchedVariant, onVariantChange]);

  const handleSelect = (groupKey: string, value: string) => {
    const next = { ...selected, [groupKey]: value };
    setSelected(next);
    onVariantChange(findVariantByAttributes(variants, next));
  };

  if (!variants.length || !groups.length) return null;

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const available = getAvailableValues(variants, group.key, selected);
        const selectedVal = selected[group.key];

        return (
          <div key={group.key}>
            <p className="mb-2.5 text-small font-medium text-foreground">
              {group.name}
              {selectedVal && (
                <span className="ml-2 font-normal text-muted-foreground">
                  —{" "}
                  {group.values.find((v) => v.value === selectedVal)?.label ??
                    selectedVal}
                </span>
              )}
            </p>

            {group.type === "color" ? (
              <div className="flex flex-wrap gap-2.5">
                {group.values.map((opt) => {
                  const isAvailable = available.has(opt.value);
                  const isSelected = selectedVal === opt.value;
                  const hex = opt.hex ?? "#e5e7eb";

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      title={opt.label}
                      disabled={!isAvailable}
                      onClick={() => handleSelect(group.key, opt.value)}
                      className={cn(
                        "relative h-9 w-9 rounded-full border-2 transition-all",
                        isSelected
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-muted-foreground",
                        !isAvailable && "cursor-not-allowed opacity-35",
                        ["#f5f5f5", "#ffffff", "#fff", "#fffff0", "#fffdd0", "#f7e7ce", "#e8dcc8", "#f5f0e8"].includes(
                          hex.toLowerCase()
                        ) && "ring-1 ring-inset ring-black/10"
                      )}
                      style={{ backgroundColor: hex }}
                      aria-label={opt.label}
                      aria-pressed={isSelected}
                    >
                      {isSelected && (
                        <span
                          className={cn(
                            "absolute inset-0 flex items-center justify-center text-xs font-bold",
                            ["#f5f5f5", "#ffffff", "#d4c4a8", "#e5e7eb"].includes(
                              hex.toLowerCase()
                            )
                              ? "text-gray-800"
                              : "text-white"
                          )}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : group.type === "shoe_size" || group.type === "apparel_size" ? (
              <div className="flex flex-wrap gap-2">
                {group.values.map((opt) => {
                  const isAvailable = available.has(opt.value);
                  const isSelected = selectedVal === opt.value;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handleSelect(group.key, opt.value)}
                      className={cn(
                        "min-w-[3rem] rounded-[var(--radius-sm)] border px-3 py-2 text-small font-medium tabular-nums transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-muted-foreground",
                        !isAvailable &&
                          "cursor-not-allowed line-through opacity-40"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {group.values.map((opt) => {
                  const isAvailable = available.has(opt.value);
                  const isSelected = selectedVal === opt.value;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handleSelect(group.key, opt.value)}
                      className={cn(
                        "rounded-[var(--radius-sm)] border px-4 py-2 text-small font-medium transition-colors",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-muted-foreground",
                        !isAvailable && "cursor-not-allowed opacity-40"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {matchedVariant && (
        <p className="text-[12px] text-muted-foreground">
          SKU: {matchedVariant.sku}
        </p>
      )}
    </div>
  );
}
