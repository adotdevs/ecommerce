"use client";

import Image, { type ImageProps } from "next/image";
import { cn } from "@/components/ds/utils";
import { shouldUseNextImage } from "@/lib/images/should-use-next-image";

type RemoteImageProps = ImageProps;

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
  ...rest
}: RemoteImageProps) {
  const srcString = typeof src === "string" ? src : "";

  if (!shouldUseNextImage(srcString)) {
    const imgStyle = fill
      ? ({
          position: "absolute",
          height: "100%",
          width: "100%",
          inset: 0,
          objectFit: "cover",
        } as const)
      : undefined;

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
      src={src}
      alt={alt}
      className={className}
      fill={fill}
      width={width}
      height={height}
      sizes={sizes}
      loading={loading}
      priority={priority}
      {...rest}
    />
  );
}
