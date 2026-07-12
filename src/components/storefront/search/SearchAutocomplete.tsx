"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ds/input";
import { cn } from "@/components/ds/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSearchSuggestions } from "@/hooks/use-search-suggestions";
import type { SearchSuggestion } from "@/lib/search/products";
import { startNavigationProgress } from "@/lib/navigation/progress";

function highlightMatch(text: string, query: string) {
  if (!query.trim()) {
    return <span className="font-normal text-muted-foreground">{text}</span>;
  }
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) {
    return <span className="font-normal text-muted-foreground">{text}</span>;
  }
  return (
    <>
      <span className="font-normal text-muted-foreground">
        {text.slice(0, idx)}
      </span>
      <span className="font-bold text-foreground">
        {text.slice(idx, idx + query.length)}
      </span>
      <span className="font-normal text-muted-foreground">
        {text.slice(idx + query.length)}
      </span>
    </>
  );
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (query: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  size?: "sm" | "md" | "lg";
  autoFocus?: boolean;
}

export function SearchAutocomplete({
  value,
  onChange,
  onSubmit,
  placeholder,
  className,
  inputClassName,
  size = "md",
  autoFocus,
}: SearchAutocompleteProps) {
  const t = useTranslations("search");
  const router = useRouter();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debouncedQuery = useDebouncedValue(value, 280);
  const { data, loading } = useSearchSuggestions(debouncedQuery, open);

  const products = data?.products ?? [];
  const trimmedValue = value.trim();
  const showPanel = open && trimmedValue.length >= 2;
  const itemCount = 1 + products.length;

  const goToSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;

      const nextRouteKey = `/products?q=${encodeURIComponent(trimmed)}`;
      let isSameSearch = false;
      if (typeof window !== "undefined") {
        const onProducts = window.location.pathname.endsWith("/products");
        const currentQ = new URLSearchParams(window.location.search).get("q");
        isSameSearch = onProducts && currentQ === trimmed;
      }

      setOpen(false);

      if (isSameSearch) {
        router.refresh();
        onSubmit?.(trimmed);
        return;
      }

      startNavigationProgress();
      router.push(nextRouteKey);
      onSubmit?.(trimmed);
    },
    [onSubmit, router]
  );

  const selectProduct = useCallback(
    (item: SearchSuggestion) => {
      setOpen(false);
      onChange(item.name);
      startNavigationProgress();
      router.push(item.href);
    },
    [onChange, router]
  );

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery, products.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!showPanel) {
      if (e.key === "Enter") {
        e.preventDefault();
        goToSearch(value);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, itemCount - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex === 0) {
        goToSearch(trimmedValue);
      } else if (activeIndex > 0) {
        selectProduct(products[activeIndex - 1]);
      } else {
        goToSearch(value);
      }
    }
  };

  const sizeClass = {
    sm: "h-9 pl-9 text-small",
    md: "h-9 pl-9 md:h-10",
    lg: "h-11 pl-10 text-body",
  }[size];

  const iconClass = size === "lg" ? "h-4 w-4" : "h-4 w-4";

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToSearch(value);
        }}
        className="relative w-full"
      >
        <Search
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
            iconClass
          )}
        />
        <Input
          ref={inputRef}
          type="search"
          autoComplete="off"
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => trimmedValue.length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn("bg-secondary", sizeClass, inputClassName)}
        />
        {loading && (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </form>

      {showPanel && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[200] overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-[var(--shadow-card)]"
          id={listboxId}
          role="listbox"
        >
          <ul className="max-h-[min(70vh,360px)] overflow-y-auto">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={activeIndex === 0}
                onMouseEnter={() => setActiveIndex(0)}
                onClick={() => goToSearch(trimmedValue)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  activeIndex === 0 ? "bg-secondary" : "hover:bg-secondary/70"
                )}
              >
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-small font-bold text-foreground">
                  {trimmedValue}
                </span>
              </button>
            </li>

            {products.map((item, idx) => {
              const optionIndex = idx + 1;
              const isActive = activeIndex === optionIndex;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIndex(optionIndex)}
                    onClick={() => selectProduct(item)}
                    className={cn(
                      "flex w-full items-center px-4 py-2 text-left transition-colors",
                      isActive ? "bg-secondary" : "hover:bg-secondary/70"
                    )}
                  >
                    <span className="truncate text-small">
                      {highlightMatch(item.name, trimmedValue)}
                    </span>
                  </button>
                </li>
              );
            })}

            {loading && products.length === 0 && (
              <li className="flex items-center gap-2 px-4 py-2 text-[12px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("searching")}
              </li>
            )}

            {!loading && products.length === 0 && (
              <li className="px-4 py-2 text-[12px] text-muted-foreground">
                {t("noSuggestions")}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
