import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/components/ds/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-small font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-brand-hover shadow-[var(--shadow-subtle)]",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-accent",
        outline:
          "border border-border bg-transparent hover:bg-secondary text-foreground",
        ghost: "hover:bg-secondary text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        accent:
          "bg-brand-accent text-white hover:brightness-110 shadow-[var(--shadow-subtle)]",
      },
      size: {
        sm: "h-8 px-3 rounded-[var(--radius-sm)] text-[13px]",
        md: "h-10 px-4 rounded-[var(--radius-sm)]",
        lg: "h-12 px-6 rounded-[var(--radius-md)] text-body",
        icon: "h-10 w-10 rounded-[var(--radius-sm)]",
        "icon-sm": "h-8 w-8 rounded-[var(--radius-sm)]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
