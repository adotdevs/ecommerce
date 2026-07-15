"use client";

import { useTranslations } from "next-intl";
import { PackageSearch } from "lucide-react";

interface EmptyProductsStateProps {
  title?: string;
  subtitle?: string;
  onClear?: () => void;
}

export function EmptyProductsState({
  title,
  subtitle,
  onClear,
}: EmptyProductsStateProps) {
  const t = useTranslations("catalog");

  return (
    <div className="catalog-empty">
      <div className="catalog-empty__icon" aria-hidden>
        <PackageSearch className="h-6 w-6" />
      </div>
      <h2 className="catalog-empty__title">{title ?? t("emptyTitle")}</h2>
      <p className="catalog-empty__text">{subtitle ?? t("emptySubtitle")}</p>
      {onClear && (
        <button type="button" className="catalog-empty__cta" onClick={onClear}>
          {t("clearFilters")}
        </button>
      )}
    </div>
  );
}
