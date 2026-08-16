"use client";

import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@heroui/react";
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
    <Button
      type={type}
      onPress={onClick}
      isDisabled={disabled}
      isPending={loading}
      size="lg"
      fullWidth
      className={cn(
        "h-[52px] rounded-[14px] bg-gradient-to-r from-[#5b4df5] to-primary font-semibold text-white",
        "shadow-[0_8px_24px_rgba(79,70,229,0.28)]",
        className
      )}
    >
      {loading ? (
        children
      ) : (
        <>
          <span>{children}</span>
          <Icon />
        </>
      )}
    </Button>
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
