"use client";

import { SearchAutocomplete } from "@/components/storefront/search/SearchAutocomplete";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface CatalogSearchBarProps {
  initialQuery?: string;
  size?: "md" | "lg";
  className?: string;
}

export function CatalogSearchBar({
  initialQuery = "",
  size = "lg",
  className,
}: CatalogSearchBarProps) {
  const t = useTranslations("common");
  const [query, setQuery] = useState(initialQuery);

  return (
    <SearchAutocomplete
      value={query}
      onChange={setQuery}
      placeholder={t("search")}
      size={size}
      className={className}
    />
  );
}
