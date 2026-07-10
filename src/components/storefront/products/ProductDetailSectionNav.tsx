"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Star, ChevronDown, FileText, List, HelpCircle, MessageSquare } from "lucide-react";
import { cn } from "@/components/ds/utils";

export interface DetailSection {
  id: string;
  label: string;
  icon: "about" | "specs" | "faq" | "reviews";
  show: boolean;
  badge?: number;
}

interface ProductDetailSectionNavProps {
  sections: DetailSection[];
}

const ICONS = {
  about: FileText,
  specs: List,
  faq: HelpCircle,
  reviews: MessageSquare,
} as const;

function readSiteHeaderHeight(): number {
  const header = document.getElementById("site-header");
  return header?.offsetHeight ?? 100;
}

export function ProductDetailSectionNav({ sections }: ProductDetailSectionNavProps) {
  const tr = useTranslations("reviews");
  const visible = sections.filter((s) => s.show);
  const [activeId, setActiveId] = useState(visible[0]?.id ?? "");
  const [showFloat, setShowFloat] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(100);
  const navRef = useRef<HTMLElement>(null);

  const reviewsSection = visible.find((s) => s.id === "customer-reviews");

  const scrollToSection = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      const navH = navRef.current?.offsetHeight ?? 52;
      const top =
        el.getBoundingClientRect().top +
        window.scrollY -
        headerHeight -
        navH -
        8;
      window.scrollTo({ top, behavior: "smooth" });
    },
    [headerHeight]
  );

  const updateActive = useCallback(() => {
    const navH = navRef.current?.offsetHeight ?? 52;
    const offset = headerHeight + navH + 8;
    let current = visible[0]?.id ?? "";

    for (const section of visible) {
      const el = document.getElementById(section.id);
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
      if (top <= offset) current = section.id;
    }
    setActiveId(current);

    const reviewsEl = document.getElementById("customer-reviews");
    const hero = document.getElementById("product-detail-hero");
    const pastHero = hero
      ? hero.getBoundingClientRect().bottom < window.innerHeight * 0.35
      : window.scrollY > 400;
    const reviewsVisible = reviewsEl
      ? reviewsEl.getBoundingClientRect().top < window.innerHeight * 0.85
      : false;
    setShowFloat(pastHero && !reviewsVisible && Boolean(reviewsSection) && !pinned);
  }, [visible, reviewsSection, pinned, headerHeight]);

  useEffect(() => {
    const header = document.getElementById("site-header");
    const nav = navRef.current;
    if (!nav) return;

    const syncHeaderHeight = () => {
      const h = readSiteHeaderHeight();
      setHeaderHeight(h);
      document.documentElement.style.setProperty("--site-header-height", `${h}px`);
    };

    const measureNav = () => setNavHeight(nav.offsetHeight);

    syncHeaderHeight();
    measureNav();

    const updatePinned = () => {
      syncHeaderHeight();
      const anchor = document.getElementById("pdp-section-nav-anchor");
      const sectionsEl = document.getElementById("product-detail-sections");
      if (!anchor || !sectionsEl) return;

      const h = readSiteHeaderHeight();
      const pastAnchor = anchor.getBoundingClientRect().top <= h;
      const sectionsVisible = sectionsEl.getBoundingClientRect().bottom > h + 24;
      setPinned(pastAnchor && sectionsVisible);
    };

    updatePinned();
    window.addEventListener("scroll", updatePinned, { passive: true });
    window.addEventListener("resize", updatePinned);

    const navRo = new ResizeObserver(measureNav);
    navRo.observe(nav);

    const headerRo = header ? new ResizeObserver(syncHeaderHeight) : null;
    if (header && headerRo) headerRo.observe(header);

    return () => {
      window.removeEventListener("scroll", updatePinned);
      window.removeEventListener("resize", updatePinned);
      navRo.disconnect();
      headerRo?.disconnect();
    };
  }, []);

  useEffect(() => {
    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, [updateActive]);

  if (visible.length === 0) return null;

  const navInner = (
    <div className="flex items-center gap-1 overflow-x-auto py-2.5 scrollbar-none md:justify-center md:gap-2 md:py-3">
      {visible.map((section) => {
        const Icon = ICONS[section.icon];
        const active = activeId === section.id;
        const isReviews = section.id === "customer-reviews";

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollToSection(section.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all duration-200",
              active
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              isReviews && !active && "ring-1 ring-amber-400/25"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <span className="whitespace-nowrap">{section.label}</span>
            {isReviews && section.badge != null && section.badge > 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-amber-400/15 text-amber-700 dark:text-amber-300"
                )}
              >
                <Star className="h-2.5 w-2.5 fill-current" />
                {section.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <div id="pdp-section-nav-anchor" className="h-px w-full" aria-hidden />

      {pinned && <div style={{ height: navHeight }} aria-hidden className="w-full" />}

      <nav
        ref={navRef}
        aria-label="Product sections"
        style={pinned ? { top: headerHeight } : undefined}
        className={cn(
          "z-[49] border-border/80 bg-background/95 backdrop-blur-md transition-shadow duration-200",
          pinned
            ? "fixed left-0 right-0 border-b shadow-[var(--shadow-subtle)]"
            : "relative -mx-4 border-b px-4 sm:mx-0 sm:rounded-[var(--radius-md)] sm:border sm:px-0 sm:shadow-[var(--shadow-subtle)]"
        )}
      >
        <div className={cn(pinned && "container-store px-4 md:px-6")}>
          {navInner}
          <div className="pointer-events-none flex justify-center pb-1 md:hidden">
            <ChevronDown className="h-3 w-3 animate-bounce text-muted-foreground/50" />
          </div>
        </div>
      </nav>

      {reviewsSection && (
        <button
          type="button"
          aria-label={tr("customerReviews")}
          onClick={() => scrollToSection("customer-reviews")}
          className={cn(
            "fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-1.5 rounded-2xl border border-border/80 bg-card/95 px-3 py-3.5 shadow-[var(--shadow-card)] backdrop-blur-md transition-all duration-300 hover:border-primary/35 hover:shadow-lg lg:flex",
            showFloat
              ? "translate-x-0 opacity-100"
              : "pointer-events-none translate-x-4 opacity-0"
          )}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-300">
            <Star className="h-4 w-4 fill-current" />
          </span>
          <span className="max-w-[4.5rem] text-center text-[11px] font-semibold leading-tight text-foreground">
            {tr("customerReviews")}
          </span>
          {reviewsSection.badge != null && reviewsSection.badge > 0 && (
            <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
              {reviewsSection.badge}
            </span>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </>
  );
}
