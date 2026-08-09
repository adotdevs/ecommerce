import { Coins } from "lucide-react";
import { cn } from "@/components/ds/utils";

const SIZE_CLASS = {
  xs: "h-3.5 w-[1.05rem]",
  sm: "h-4 w-5",
  md: "h-5 w-6",
  lg: "h-6 w-7",
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

  if (!isValid) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[2px] bg-muted text-muted-foreground",
          SIZE_CLASS[size],
          className
        )}
        title={title}
        aria-hidden={!title}
      >
        <Coins className="h-[70%] w-[70%]" strokeWidth={2} />
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/${code.toLowerCase()}.svg`}
      alt={title ?? ""}
      aria-hidden={!title}
      title={title}
      width={20}
      height={15}
      className={cn(
        "inline-block shrink-0 rounded-[2px] object-cover shadow-sm ring-1 ring-black/10",
        SIZE_CLASS[size],
        className
      )}
      loading="lazy"
      decoding="async"
    />
  );
}
