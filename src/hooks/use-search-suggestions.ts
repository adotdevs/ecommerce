"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchSuggestionsResult } from "@/lib/search/products";

const cache = new Map<string, SearchSuggestionsResult>();
const MAX_CACHE = 40;

export function useSearchSuggestions(query: string, enabled = true) {
  const [data, setData] = useState<SearchSuggestionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!enabled || q.length < 2) {
      setData(null);
      setLoading(false);
      return;
    }

    const cached = cache.get(q.toLowerCase());
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    fetch(`/api/v1/search/suggestions?q=${encodeURIComponent(q)}&limit=8`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const result = res.data as SearchSuggestionsResult;
          cache.set(q.toLowerCase(), result);
          if (cache.size > MAX_CACHE) {
            const first = cache.keys().next().value;
            if (first) cache.delete(first);
          }
          setData(result);
        } else {
          setData(null);
        }
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [query, enabled]);

  return { data, loading };
}
