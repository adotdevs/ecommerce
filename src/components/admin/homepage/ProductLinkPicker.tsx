"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Button } from "@/components/ds/button";
import { Loader2, Link2, X } from "lucide-react";

interface CatalogItem {
  name: string;
  slug: string;
  image?: string;
  path: string;
}

interface ProductLinkPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  accessToken: string;
  placeholder?: string;
  hint?: string;
}

function SuggestionThumb({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
        No img
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-10 w-10 shrink-0 rounded object-cover"
    />
  );
}

function useCatalogSearch(
  type: "product" | "category",
  query: string,
  accessToken: string,
  enabled: boolean
) {
  const [suggestions, setSuggestions] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!enabled || q.length < 1) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    // Skip search when query already looks like a resolved path
    if (/^\/(products|categories)\//i.test(q) && !q.includes(" ")) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/v1/admin/catalog/search?type=${type}&q=${encodeURIComponent(q)}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          }
        );
        const data = await res.json();
        if (!controller.signal.aborted) {
          setSuggestions(data.success && Array.isArray(data.data) ? data.data : []);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, type, accessToken, enabled]);

  return { suggestions, loading };
}

export function ProductLinkPicker({
  label,
  value,
  onChange,
  accessToken,
  placeholder = "Search product by name or slug…",
  hint,
}: ProductLinkPickerProps) {
  const [preview, setPreview] = useState<CatalogItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { suggestions, loading } = useCatalogSearch(
    "product",
    value,
    accessToken,
    open
  );

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions]);

  const selectItem = (item: CatalogItem) => {
    onChange(item.path);
    setPreview(item);
    setError(null);
    setOpen(false);
  };

  const lookup = async () => {
    if (!value.trim()) return;
    setLookupLoading(true);
    setError(null);
    setOpen(false);
    try {
      const res = await fetch(
        `/api/v1/admin/catalog/lookup?type=product&q=${encodeURIComponent(value)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      if (data.success && data.data) {
        const item: CatalogItem = {
          name: data.data.name,
          slug: data.data.slug,
          image: data.data.image,
          path: `/products/${data.data.slug}`,
        };
        selectItem(item);
      } else {
        setPreview(null);
        setError(data.error ?? "Product not found");
      }
    } catch {
      setError("Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  };

  const showDropdown = open && (loading || suggestions.length > 0);

  return (
    <div className="space-y-1.5" ref={wrapRef}>
      <Label>{label}</Label>
      <div className="relative flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setPreview(null);
              setError(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (!showDropdown || suggestions.length === 0) {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void lookup();
                }
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                selectItem(suggestions[activeIndex]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={placeholder}
            autoComplete="off"
          />
          {showDropdown && (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-[var(--radius-sm)] border border-border bg-background shadow-md">
              {loading && suggestions.length === 0 ? (
                <li className="flex items-center gap-2 px-3 py-2.5 text-[13px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching…
                </li>
              ) : (
                suggestions.map((item, i) => (
                  <li key={item.path}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                        i === activeIndex ? "bg-muted" : "hover:bg-muted/70"
                      }`}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectItem(item)}
                    >
                      <SuggestionThumb src={item.image} alt={item.name} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-foreground">
                          {item.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {item.path}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={lookup}
          disabled={lookupLoading}
          title="Resolve exact URL or slug"
        >
          {lookupLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              onChange("");
              setPreview(null);
              setError(null);
              setOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
      {preview && (
        <div className="flex items-center gap-2 rounded border border-border px-2 py-1.5">
          <SuggestionThumb src={preview.image} alt={preview.name} />
          <p className="min-w-0 truncate text-[12px] text-brand-accent">
            {preview.name}{" "}
            <span className="text-muted-foreground">({preview.slug})</span>
          </p>
        </div>
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
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [resolved, setResolved] = useState<Record<string, CatalogItem>>({});
  const wrapRef = useRef<HTMLDivElement>(null);

  const { suggestions, loading } = useCatalogSearch(
    type,
    draft,
    accessToken,
    open
  );

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions]);

  // Resolve images/names for already-selected links
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const missing = links.filter((link) => !resolved[link]);
      if (missing.length === 0) return;

      const entries = await Promise.all(
        missing.map(async (link) => {
          try {
            const res = await fetch(
              `/api/v1/admin/catalog/lookup?type=${type}&q=${encodeURIComponent(link)}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const data = await res.json();
            if (data.success && data.data) {
              return [
                link,
                {
                  name: data.data.name,
                  slug: data.data.slug,
                  image: data.data.image,
                  path: link,
                } satisfies CatalogItem,
              ] as const;
            }
          } catch {
            /* ignore */
          }
          return null;
        })
      );
      if (cancelled) return;
      setResolved((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const entry of entries) {
          if (entry && !next[entry[0]]) {
            next[entry[0]] = entry[1];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-resolve when links change
  }, [links, type, accessToken]);

  const addPath = (path: string, item?: CatalogItem) => {
    if (!links.includes(path)) onChange([...links, path]);
    if (item) setResolved((prev) => ({ ...prev, [path]: item }));
    setDraft("");
    setError(null);
    setOpen(false);
  };

  const addFromDraft = async () => {
    if (!draft.trim()) return;
    setAdding(true);
    setError(null);
    try {
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
        addPath(path, {
          name: data.data.name,
          slug: data.data.slug,
          image: data.data.image,
          path,
        });
      } else {
        setError(data.error ?? `${type === "product" ? "Product" : "Category"} not found`);
      }
    } catch {
      setError("Lookup failed");
    } finally {
      setAdding(false);
    }
  };

  const showDropdown = open && (loading || suggestions.length > 0);
  const filteredSuggestions = suggestions.filter((s) => !links.includes(s.path));

  return (
    <div className="space-y-2" ref={wrapRef}>
      <Label>{label}</Label>
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
      <div className="relative flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={
              type === "product"
                ? "Search product by name or slug…"
                : "Search category by name or slug…"
            }
            autoComplete="off"
            onKeyDown={(e) => {
              const list = filteredSuggestions;
              if (!showDropdown || list.length === 0) {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addFromDraft();
                }
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, list.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                addPath(list[activeIndex].path, list[activeIndex]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          {showDropdown && (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-[var(--radius-sm)] border border-border bg-background shadow-md">
              {loading && filteredSuggestions.length === 0 ? (
                <li className="flex items-center gap-2 px-3 py-2.5 text-[13px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching…
                </li>
              ) : filteredSuggestions.length === 0 ? (
                <li className="px-3 py-2.5 text-[13px] text-muted-foreground">
                  No matches
                </li>
              ) : (
                filteredSuggestions.map((item, i) => (
                  <li key={item.path}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                        i === activeIndex ? "bg-muted" : "hover:bg-muted/70"
                      }`}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addPath(item.path, item)}
                    >
                      <SuggestionThumb src={item.image} alt={item.name} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-foreground">
                          {item.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {item.path}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        <Button type="button" variant="outline" onClick={addFromDraft} disabled={adding}>
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
        </Button>
      </div>
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      {links.length > 0 && (
        <ul className="space-y-1">
          {links.map((link) => {
            const item = resolved[link];
            return (
              <li
                key={link}
                className="flex items-center gap-3 rounded border border-border px-2 py-1.5 text-[13px]"
              >
                <SuggestionThumb src={item?.image} alt={item?.name ?? link} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {item?.name ?? link}
                  </span>
                  {item && (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {link}
                    </span>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onChange(links.filter((l) => l !== link))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
