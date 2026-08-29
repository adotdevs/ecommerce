import { RemoteImage } from "@/components/storefront/RemoteImage";
import { cn } from "@/components/ds/utils";

interface BrandLogoProps {
  logo?: string | null;
  logoDark?: string | null;
  storeName?: string | null;
  className?: string;
  fallbackClassName?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

/**
 * Renders light/dark logos with CSS (`dark:`), not `useTheme()`.
 * next-themes leaves `resolvedTheme` empty until hydration, so a JS-based
 * swap shows the light logo after a dark-mode refresh.
 */
export function BrandLogo({
  logo,
  logoDark,
  storeName,
  className,
  fallbackClassName,
  width = 120,
  height = 32,
  priority = false,
}: BrandLogoProps) {
  const light = logo?.trim() || "";
  const dark = logoDark?.trim() || "";
  const name = storeName?.trim() || "";

  if (!light) {
    if (!name) return null;
    return (
      <span className={cn("font-bold tracking-tight", fallbackClassName)}>
        {name}
      </span>
    );
  }

  return (
    <>
      <span className={cn("inline-flex items-center", dark && "dark:hidden")}>
        <RemoteImage
          src={light}
          alt={name}
          width={width}
          height={height}
          priority={priority}
          className={className}
        />
      </span>
      {dark ? (
        <span className="hidden items-center dark:inline-flex">
          <RemoteImage
            src={dark}
            alt={name}
            width={width}
            height={height}
            priority={priority}
            className={className}
          />
        </span>
      ) : null}
    </>
  );
}
