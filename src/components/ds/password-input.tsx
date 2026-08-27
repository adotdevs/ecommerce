"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ds/input";
import { cn } from "@/components/ds/utils";

export interface PasswordInputProps extends Omit<InputProps, "type"> {
  showLabel?: string;
  hideLabel?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      showLabel = "Show password",
      hideLabel = "Hide password",
      ...props
    },
    ref
  ) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pe-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((open) => !open)}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          tabIndex={0}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" strokeWidth={2.25} />
          ) : (
            <Eye className="h-4 w-4" strokeWidth={2.25} />
          )}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
