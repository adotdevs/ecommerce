"use client";

import { useCallback, useRef, useState } from "react";
import { RemoteImage } from "@/components/storefront/RemoteImage";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/components/ds/utils";

export interface GalleryImage {
  url: string;
  alt?: string;
}

interface ProductGalleryProps {
  images: GalleryImage[];
  productName: string;
}

const ZOOM_SCALE = 2.5;
const LENS_RATIO = 0.38;

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [lens, setLens] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  const current = images[active];
  const hasMultiple = images.length > 1;

  const go = useCallback(
    (dir: -1 | 1) => {
      setActive((i) => (i + dir + images.length) % images.length);
      setLens({ x: 50, y: 50 });
    },
    [images.length]
  );

  const updateLens = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    const half = (LENS_RATIO * 100) / 2;
    setLens({
      x: Math.min(100 - half, Math.max(half, x)),
      y: Math.min(100 - half, Math.max(half, y)),
    });
  }, []);

  if (!current) {
    return (
      <div className="aspect-square rounded-[var(--radius-lg)] border border-border bg-secondary" />
    );
  }

  const thumbButton = (img: GalleryImage, i: number, vertical: boolean) => (
    <button
      key={`${img.url}-${i}`}
      type="button"
      onClick={() => {
        setActive(i);
        setLens({ x: 50, y: 50 });
      }}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[var(--radius-sm)] border-2 bg-secondary transition-all duration-200",
        vertical ? "h-[72px] w-[72px]" : "h-16 w-16",
        i === active
          ? "border-primary ring-2 ring-primary/20"
          : "border-border opacity-70 hover:border-muted-foreground hover:opacity-100"
      )}
    >
      <RemoteImage src={img.url} alt="" fill className="object-contain p-1" sizes="72px" />
    </button>
  );

  const lensSize = `${LENS_RATIO * 100}%`;

  return (
    <div className="relative overflow-visible">
      <div className="flex gap-3 overflow-visible lg:gap-4">
        {hasMultiple && (
          <div className="hidden max-h-[min(520px,70vw)] flex-col gap-2 overflow-y-auto pr-1 lg:flex">
            {images.map((img, i) => thumbButton(img, i, true))}
          </div>
        )}

        <div className="relative min-w-0 flex-1 overflow-visible">
          <div
            ref={containerRef}
            className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-white p-3"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onMouseMove={(e) => updateLens(e.clientX, e.clientY)}
          >
            <RemoteImage
              src={current.url}
              alt={current.alt ?? productName}
              fill
              className="object-contain p-2"
              priority
              sizes="(max-width:1024px) 100vw, 45vw"
            />

            {/* Lens indicator — desktop hover only */}
            {hovering && (
              <div
                className="pointer-events-none absolute hidden border-2 border-primary/60 bg-primary/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)] lg:block"
                style={{
                  width: lensSize,
                  height: lensSize,
                  left: `${lens.x}%`,
                  top: `${lens.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            )}
          </div>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-card lg:hidden"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-card lg:hidden"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Hover zoom pane — floats beside image on desktop */}
          {hovering && (
            <div
              className="pointer-events-none absolute left-[calc(100%+1rem)] top-0 z-20 hidden aspect-square w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-card)] lg:block"
              aria-hidden
            >
              <div
                className="h-full w-full bg-no-repeat"
                style={{
                  backgroundImage: `url(${current.url})`,
                  backgroundSize: `${ZOOM_SCALE * 100}%`,
                  backgroundPosition: `${lens.x}% ${lens.y}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {hasMultiple && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {images.map((img, i) => thumbButton(img, i, false))}
        </div>
      )}
    </div>
  );
}
