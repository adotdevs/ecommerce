"use client";

import Image, { type ImageProps } from "next/image";
import { cn } from "@/components/ds/utils";
import { shouldUseNextImage } from "@/lib/images/should-use-next-image";

type RemoteImageProps = ImageProps;

/** Normalizes image src, stripping accidental localhost:3000 prefixes and ensuring clean root paths */
export function normalizeImageSrc(src: string): string {
  if (!src) return "";
  let trimmed = src.trim();

  // Strip accidental http://localhost:3000 or http://127.0.0.1:3000 prefix so local assets load correctly in live production
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(trimmed)) {
    trimmed = trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, "");
  }

  // Ensure public folder paths have leading slash
  if (trimmed.startsWith("brand/") || trimmed.startsWith("uploads/") || trimmed.startsWith("images/")) {
    trimmed = `/${trimmed}`;
  }

  return trimmed;
}

export function RemoteImage({
  src,
  alt = "",
  className,
  fill,
  width,
  height,
  sizes,
  loading,
  priority,
  style,
  ...rest
}: RemoteImageProps) {
  const rawSrc = typeof src === "string" ? src : "";
  const srcString = normalizeImageSrc(rawSrc);

  if (!shouldUseNextImage(srcString)) {
    const imgStyle = fill
      ? ({
          position: "absolute",
          height: "100%",
          width: "100%",
          inset: 0,
          ...style,
        } as const)
      : style;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={srcString}
        alt={alt}
        className={cn(className)}
        style={imgStyle}
        width={typeof width === "number" ? width : undefined}
        height={typeof height === "number" ? height : undefined}
        loading={loading}
      />
    );
  }

  return (
    <Image
      src={srcString || src}
      alt={alt}
      className={className}
      fill={fill}
      width={width}
      height={height}
      sizes={sizes}
      loading={loading}
      priority={priority}
      style={style}
      {...rest}
    />
  );
}
