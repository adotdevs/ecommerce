"use client";

import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/components/ds/utils";

interface CheckoutFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  icon?: LucideIcon;
  valid?: boolean;
  className?: string;
  inputClassName?: string;
}

export function CheckoutField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  error,
  icon: Icon,
  valid,
  className,
  inputClassName,
}: CheckoutFieldProps) {
  const showValid = valid && value.trim().length > 0 && !error;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={cn(
            "flex h-12 w-full rounded-xl border bg-background text-sm text-foreground transition-colors md:h-[52px]",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1",
            Icon ? "pl-10 pr-10" : "px-4",
            error ? "border-destructive" : "border-border",
            inputClassName
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

interface CheckoutSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
  className?: string;
}

export function CheckoutSelect({
  id,
  label,
  value,
  onChange,
  options,
  required,
  error,
  className,
}: CheckoutSelectProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={cn(
          "flex h-12 w-full appearance-none rounded-xl border bg-background px-4 text-sm text-foreground md:h-[52px]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          error ? "border-destructive" : "border-border"
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface RadioOptionCardProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle?: string;
  priceLabel?: string;
  priceFree?: boolean;
  logo?: React.ReactNode;
  children?: React.ReactNode;
}

export function RadioOptionCard({
  selected,
  onSelect,
  title,
  subtitle,
  priceLabel,
  priceFree,
  logo,
  children,
}: RadioOptionCardProps) {
  return (
    <div
      className={cn(
        "rounded-[16px] border-2 transition-all duration-200",
        selected
          ? "border-primary bg-primary/[0.04] shadow-[0_4px_16px_rgba(79,70,229,0.12)]"
          : "border-border bg-card hover:border-primary/30"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-start gap-3 p-4 text-left md:p-5"
      >
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
            selected ? "border-primary bg-primary" : "border-border bg-background"
          )}
        >
          {selected && <span className="h-2 w-2 rounded-full bg-white" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold text-foreground md:text-base">
                {title}
              </span>
              {subtitle && (
                <span className="mt-0.5 block text-xs text-muted-foreground md:text-sm">
                  {subtitle}
                </span>
              )}
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              {priceLabel && (
                <span
                  className={cn(
                    "text-sm font-semibold",
                    priceFree ? "text-brand-accent" : "text-foreground"
                  )}
                >
                  {priceLabel}
                </span>
              )}
              {logo}
            </span>
          </span>
        </span>
      </button>
      {selected && children && (
        <div className="border-t border-border px-4 pb-4 pt-1 md:px-5 md:pb-5">
          {children}
        </div>
      )}
    </div>
  );
}
