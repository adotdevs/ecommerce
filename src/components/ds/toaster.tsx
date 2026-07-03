"use client";

import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/hooks/use-toast";
import { cn } from "@/components/ds/utils";

const variantStyles: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; border: string; iconColor: string; bg: string }
> = {
  success: {
    icon: CheckCircle2,
    border: "border-l-brand-accent",
    iconColor: "text-brand-accent",
    bg: "bg-brand-accent/5",
  },
  error: {
    icon: XCircle,
    border: "border-l-destructive",
    iconColor: "text-destructive",
    bg: "bg-destructive/5",
  },
  info: {
    icon: Info,
    border: "border-l-primary",
    iconColor: "text-primary",
    bg: "bg-primary/5",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-l-amber-500",
    iconColor: "text-amber-500",
    bg: "bg-amber-500/5",
  },
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-0 right-0 z-[200] flex max-h-screen w-full flex-col gap-3 p-4 sm:bottom-6 sm:right-6 sm:max-w-[420px]"
    >
      {toasts.map((t) => {
        const style = variantStyles[t.variant];
        const Icon = style.icon;
        return (
          <div
            key={t.id}
            role="alert"
            className={cn(
              "pointer-events-auto relative flex gap-3 rounded-[var(--radius-md)] border border-border border-l-4 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm animate-in slide-in-from-bottom-4 fade-in duration-300",
              style.border,
              style.bg
            )}
          >
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", style.iconColor)} />
            <div className="min-w-0 flex-1 pr-6">
              <p className="text-small font-semibold text-foreground">{t.title}</p>
              {t.description && (
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="absolute right-3 top-3 rounded-[var(--radius-sm)] p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
