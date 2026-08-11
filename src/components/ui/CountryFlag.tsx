import { Coins } from "lucide-react";
import { cn } from "@/components/ds/utils";
import { getCountryByCode } from "@/config/locales";
import { getFlagComponent } from "@/lib/flags/registry";

const SIZE_CLASS = {
  xs: "h-3.5 w-auto",
  sm: "h-4 w-auto",
  md: "h-5 w-auto",
  lg: "h-6 w-auto",
} as const;

export function CountryFlag({
  countryCode,
  size = "sm",
  className,
  title,
}: {
  countryCode: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  title?: string;
}) {
  const code = countryCode.trim().toUpperCase();
  const isValid = /^[A-Z]{2}$/.test(code);
  const label = title ?? getCountryByCode(code)?.name ?? code;
  const Flag = isValid ? getFlagComponent(code) : undefined;

  if (!Flag) {
    const emoji = getCountryByCode(code)?.flag;
    if (emoji) {
      return (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center leading-none",
            SIZE_CLASS[size],
            className
          )}
          title={label}
          role="img"
          aria-label={label}
        >
          {emoji}
        </span>
      );
    }

    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[2px] border border-border bg-muted text-muted-foreground",
          "h-4 w-6",
          className
        )}
        title={label}
        aria-hidden={!title}
      >
        <Coins className="h-[70%] w-[70%]" strokeWidth={2} />
      </span>
    );
  }

  return (
    <Flag
      title={label}
      aria-label={label}
      className={cn(
        "inline-block shrink-0 overflow-hidden rounded-[3px] border border-black/12 shadow-none",
        SIZE_CLASS[size],
        className
      )}
    />
  );
}
