"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/components/ds/utils";

interface ProductCarouselProps {
  children: React.ReactNode;
  className?: string;
  previousLabel?: string;
  nextLabel?: string;
}

export function ProductCarousel({
  children,
  className,
  previousLabel,
  nextLabel,
}: ProductCarouselProps) {
  const t = useTranslations("catalog");
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, children]);

  const scroll = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.max(260, el.clientWidth * 0.75) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className={cn("store-carousel relative", className)}>
      {canPrev && (
        <button
          type="button"
          aria-label={previousLabel ?? t("previous")}
          onClick={() => scroll(-1)}
          className="store-carousel__arrow store-carousel__arrow--left"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          aria-label={nextLabel ?? t("next")}
          onClick={() => scroll(1)}
          className="store-carousel__arrow store-carousel__arrow--right"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      <div ref={trackRef} className="store-carousel__track scrollbar-none">
        {children}
      </div>
    </div>
  );
}
