"use client";

import { Check, type LucideIcon } from "lucide-react";
import {
  FieldError,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from "@heroui/react";
import { cn } from "@/components/ds/utils";

const FIELD_CONTROL =
  "checkout-control w-full items-center rounded-xl text-sm";

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
  endAdornment?: React.ReactNode;
  valid?: boolean;
  className?: string;
  inputClassName?: string;
}

function autoCompleteFor(id: string) {
  if (id === "cardNumber") return "cc-number";
  if (id === "cardName") return "cc-name";
  if (id === "cardExpiry") return "cc-exp";
  if (id === "cardCvv") return "cc-csc";
  return undefined;
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
  endAdornment,
  valid,
  className,
  inputClassName,
}: CheckoutFieldProps) {
  const showValid = valid && value.trim().length > 0 && !error;
  const hasTrailing = showValid || Boolean(endAdornment);

  return (
    <TextField
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      isRequired={required}
      isInvalid={Boolean(error)}
      fullWidth
      className={cn("w-full min-w-0 gap-1.5", className)}
    >
      <Label>{label}</Label>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        ) : null}
        <Input
          placeholder={placeholder}
          autoComplete={autoCompleteFor(id)}
          className={cn(
            FIELD_CONTROL,
            Icon ? "ps-10" : "ps-4",
            hasTrailing ? "pe-11" : "pe-4",
            inputClassName
          )}
        />
        {showValid ? (
          <Check className="pointer-events-none absolute right-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-brand-accent" />
        ) : endAdornment ? (
          <div className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2">
            {endAdornment}
          </div>
        ) : null}
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </TextField>
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
  const placeholder = options.find((opt) => opt.value === "")?.label;
  const items = options.filter((opt) => opt.value !== "");

  return (
    <Select
      id={id}
      selectedKey={value || null}
      onSelectionChange={(key) => onChange(key == null ? "" : String(key))}
      isRequired={required}
      isInvalid={Boolean(error)}
      placeholder={placeholder}
      fullWidth
      className={cn("w-full min-w-0 gap-1.5", className)}
    >
      <Label>{label}</Label>
      <Select.Trigger className={cn(FIELD_CONTROL, "flex justify-start")}>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="max-h-[min(70dvh,16rem)] overflow-auto">
        <ListBox>
          {items.map((opt) => (
            <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>
              {opt.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      {error ? <FieldError>{error}</FieldError> : null}
    </Select>
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
