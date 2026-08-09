"use client";

import { Check, ChevronDown } from "lucide-react";
import { CountryFlag } from "@/components/ui/CountryFlag";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ds/dropdown";
import { cn } from "@/components/ds/utils";
import {
  getPhoneCountryOptions,
  getPhoneFieldConfig,
  isValidPhoneForCountry,
  sanitizePhoneNational,
} from "@/lib/checkout/phone-fields";

interface CheckoutPhoneFieldProps {
  id: string;
  label: string;
  phoneCountryCode: string;
  onPhoneCountryCodeChange: (code: string) => void;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  className?: string;
}

export function CheckoutPhoneField({
  id,
  label,
  phoneCountryCode,
  onPhoneCountryCodeChange,
  value,
  onChange,
  required,
  error,
  className,
}: CheckoutPhoneFieldProps) {
  const config = getPhoneFieldConfig(phoneCountryCode);
  const options = getPhoneCountryOptions();
  const valid = isValidPhoneForCountry(phoneCountryCode, value);
  const showValid = valid && value.length > 0 && !error;

  const handleCountryChange = (code: string) => {
    onPhoneCountryCodeChange(code);
    onChange(sanitizePhoneNational(value, code));
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <div className="relative grid grid-cols-[auto_minmax(0,1fr)]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              id={`${id}-country`}
              aria-label="Country code"
              className={cn(
                "relative flex h-12 shrink-0 items-center gap-1.5 rounded-l-xl border border-r-0 bg-secondary/50 pl-2.5 pr-7 md:h-[52px]",
                "text-foreground transition-colors hover:bg-secondary/80",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1",
                error ? "border-destructive" : "border-border"
              )}
            >
              <CountryFlag countryCode={phoneCountryCode} size="sm" />
              <span className="whitespace-nowrap text-xs font-semibold tabular-nums">
                {config.dialCode}
              </span>
              <ChevronDown
                className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={4}
            className="min-w-[min(100vw-2rem,16rem)] max-h-[min(70dvh,16rem)]"
          >
            {options.map((opt) => {
              const selected = opt.code === phoneCountryCode;
              return (
                <DropdownMenuItem
                  key={opt.code}
                  onSelect={() => handleCountryChange(opt.code)}
                  className={cn(
                    "gap-2.5",
                    selected && "bg-secondary font-medium text-foreground"
                  )}
                >
                  <CountryFlag countryCode={opt.code} size="sm" />
                  <span className="shrink-0 tabular-nums text-foreground">
                    {opt.dialCode}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {opt.name}
                  </span>
                  {selected && (
                    <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={value}
          onChange={(e) =>
            onChange(sanitizePhoneNational(e.target.value, phoneCountryCode))
          }
          placeholder={config.placeholder}
          required={required}
          maxLength={config.maxDigits}
          pattern="[0-9]*"
          className={cn(
            "h-12 min-w-0 rounded-r-xl border bg-background px-4 text-sm tabular-nums text-foreground transition-colors md:h-[52px]",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1",
            showValid ? "pr-10" : "",
            error ? "border-destructive" : "border-border"
          )}
        />
        {showValid && (
          <Check className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-accent" />
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
