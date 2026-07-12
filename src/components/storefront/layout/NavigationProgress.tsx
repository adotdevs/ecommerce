"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { cn } from "@/components/ds/utils";
import { NAVIGATION_PROGRESS_START } from "@/lib/navigation/progress";

/**
 * Slim top progress bar for client navigations (Next.js App Router).
 * Starts on link clicks / history changes; completes when the route settles.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completing, setCompleting] = useState(false);
  const activeRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeKeyRef = useRef(routeKey);

  const clearTimers = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }
    if (stallRef.current) {
      clearTimeout(stallRef.current);
      stallRef.current = null;
    }
  };

  const finish = () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    setCompleting(true);
    setProgress(100);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      setCompleting(false);
      setProgress(0);
    }, 280);
  };

  const start = () => {
    if (activeRef.current) return;
    activeRef.current = true;
    clearTimers();
    setCompleting(false);
    setVisible(true);
    setProgress(8);
    const startKey = routeKeyRef.current;
    tickRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 88) return p;
        const step = p < 40 ? 10 : p < 70 ? 4 : 1.5;
        return Math.min(88, p + step);
      });
    }, 180);
    stallRef.current = setTimeout(() => {
      if (activeRef.current && routeKeyRef.current === startKey) {
        finish();
      }
    }, 1500);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;

      // Buttons/inputs inside a card link should not start route progress
      const interactive = target?.closest?.(
        "button, input, select, textarea, [role='button']"
      );
      if (
        interactive &&
        anchor.contains(interactive) &&
        interactive !== anchor
      ) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        const next = `${url.pathname}${url.search}`;
        const current = `${window.location.pathname}${window.location.search}`;
        if (next === current) return;
        start();
      } catch {
        /* ignore invalid href */
      }
    };

    const onPopState = () => start();

    const onProgrammaticStart = () => start();

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener(NAVIGATION_PROGRESS_START, onProgrammaticStart);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener(NAVIGATION_PROGRESS_START, onProgrammaticStart);
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (routeKeyRef.current === routeKey) return;
    routeKeyRef.current = routeKey;
    finish();
  }, [routeKey]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[300] h-[3px] overflow-hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-label="Page loading"
    >
      <div
        className={cn(
          "h-full origin-left rounded-r-full bg-primary shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_55%,transparent)]",
          "transition-[width] duration-200 ease-out",
          completing && "duration-200"
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
