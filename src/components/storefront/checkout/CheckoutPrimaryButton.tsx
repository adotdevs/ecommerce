"use client";

import { Check, ArrowRight, Lock, Loader2 } from "lucide-react";
import { cn } from "@/components/ds/utils";

interface CheckoutPrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  icon?: "arrow" | "lock";
  className?: string;
}

export function CheckoutPrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
  loading,
  icon = "arrow",
  className,
}: CheckoutPrimaryButtonProps) {
  const Icon = icon === "lock" ? Lock : ArrowRight;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px]",
        "bg-gradient-to-r from-[#5b4df5] to-primary text-base font-semibold text-white",
        "shadow-[0_8px_24px_rgba(79,70,229,0.28)] transition-all duration-200",
        "hover:from-primary hover:to-[#4338ca] hover:shadow-[0_10px_28px_rgba(79,70,229,0.35)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          <span>{children}</span>
          <Icon className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

interface SecureNoteProps {
  children: React.ReactNode;
}

export function SecureNote({ children }: SecureNoteProps) {
  return (
    <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
      <Lock className="h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
