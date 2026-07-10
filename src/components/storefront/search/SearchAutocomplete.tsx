"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { RemoteImage } from "@/components/storefront/RemoteImage";
import {
  Search,
  Loader2,
  Package,
  FolderTree,
  Tag,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ds/input";
import { cn } from "@/components/ds/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSearchSuggestions } from "@/hooks/use-search-suggestions";
import type { SearchSuggestion } from "@/lib/search/products";
import { useFormattedPrice } from "@/hooks/use-formatted-price";

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-primary/15 px-0.5 text-foreground">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function SuggestionPrice({ amount }: { amount: number }) {
  const formatted = useFormattedPrice(amount);
  return <span className="shrink-0 text-[12px] font-semibold text-foreground">{formatted}</span>;
}

const TYPE_ICON = {
  product: Package,
  category: FolderTree,
  brand: Tag,
} as const;

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

  const flatItems = useMemo(() => {
    if (!data) return [] as SearchSuggestion[];
    return [...data.products, ...data.categories, ...data.brands];
  }, [data]);

  const showPanel = open && value.trim().length >= 2;
  const hasResults = flatItems.length > 0;

  const goToSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setOpen(false);
      onSubmit?.(trimmed);
      router.push(`/products?q=${encodeURIComponent(trimmed)}`);
    },
    [onSubmit, router]
  );

  const selectItem = useCallback(
    (item: SearchSuggestion) => {
      setOpen(false);
      onChange(item.name);
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
  }, [debouncedQuery, flatItems.length]);

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
      setActiveIndex((i) => Math.min(i + 1, flatItems.length));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < flatItems.length) {
        selectItem(flatItems[activeIndex]);
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

  const renderSection = (
    title: string,
    items: SearchSuggestion[],
    offset: number
  ) => {
    if (!items.length) return null;
    return (
      <div key={title} className="py-1">
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </p>
        <ul>
          {items.map((item, idx) => {
            const globalIdx = offset + idx;
            const Icon = TYPE_ICON[item.type];
            const isActive = activeIndex === globalIdx;
            return (
              <li key={`${item.type}-${item.id}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIndex(globalIdx)}
                  onClick={() => selectItem(item)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    isActive ? "bg-secondary" : "hover:bg-secondary/70"
                  )}
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    {item.image ? (
                      <RemoteImage
                        src={item.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-small font-medium text-foreground">
                      {highlightMatch(item.name, value)}
                    </p>
                    {item.subtitle && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                  {item.price != null && <SuggestionPrice amount={item.price} />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  let sectionOffset = 0;
  const productOffset = sectionOffset;
  sectionOffset += data?.products.length ?? 0;
  const categoryOffset = sectionOffset;
  sectionOffset += data?.categories.length ?? 0;

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
          onFocus={() => value.trim().length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn("bg-secondary", sizeClass, inputClassName)}
        />
        {loading && (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </form>

      {showPanel && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[80] overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--shadow-card)]"
          id={listboxId}
          role="listbox"
        >
          {loading && !data ? (
            <div className="flex items-center gap-2 px-4 py-6 text-small text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("searching")}
            </div>
          ) : hasResults ? (
            <div className="max-h-[min(70vh,420px)] overflow-y-auto">
              {renderSection(t("products"), data?.products ?? [], productOffset)}
              {renderSection(t("categories"), data?.categories ?? [], categoryOffset)}
              {renderSection(t("brands"), data?.brands ?? [], sectionOffset)}
            </div>
          ) : (
            <p className="px-4 py-6 text-center text-small text-muted-foreground">
              {t("noSuggestions")}
            </p>
          )}

          <div className="border-t border-border bg-muted/30 px-3 py-2">
            <button
              type="button"
              onClick={() => goToSearch(value)}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-small font-medium text-primary transition hover:bg-secondary"
            >
              <span>
                {t("viewAll")} “{value.trim()}”
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
