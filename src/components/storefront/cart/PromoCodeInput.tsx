"use client";

import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { cn } from "@/components/ds/utils";
import { useCartStore } from "@/stores/cart-store";
import { toastError } from "@/hooks/use-toast";

interface PromoCodeInputProps {
  subtotalUsd: number;
  className?: string;
  defaultOpen?: boolean;
}

export function PromoCodeInput({
  subtotalUsd,
  className,
  defaultOpen = false,
}: PromoCodeInputProps) {
  const t = useTranslations("cart");
  const appliedPromo = useCartStore((s) => s.appliedPromo);
  const setPromo = useCartStore((s) => s.setPromo);
  const clearPromo = useCartStore((s) => s.clearPromo);

  const [open, setOpen] = useState(defaultOpen || !!appliedPromo);
  const [code, setCode] = useState(appliedPromo?.code ?? "");
  const [loading, setLoading] = useState(false);

  const apply = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/v1/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, subtotalUsd }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPromo({
          code: data.data.code,
          percentOff: data.data.percentOff,
          discountUsd: data.data.discountUsd,
        });
        setCode(data.data.code);
      } else {
        clearPromo();
        toastError(t("promoInvalid"), data.error ?? t("promoInvalid"));
      }
    } catch {
      toastError(t("promoInvalid"), t("promoInvalid"));
    } finally {
      setLoading(false);
    }
  };

  const remove = () => {
    clearPromo();
    setCode("");
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-md)] border border-border",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-small font-medium text-foreground transition-colors hover:bg-secondary/60"
      >
        <span>{t("promoCode")}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4">
          {appliedPromo ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-brand-accent/10 px-3 py-2">
              <p className="text-sm font-medium text-brand-accent">
                {t("promoApplied", { code: appliedPromo.code })}{" "}
                <span className="text-muted-foreground">
                  ({appliedPromo.percentOff}% off)
                </span>
              </p>
              <button
                type="button"
                onClick={remove}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t("removePromo")}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t("promoPlaceholder")}
                className="h-10 uppercase"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), apply())}
              />
              <Button
                type="button"
                variant="primary"
                className="shrink-0"
                onClick={apply}
                disabled={loading || !code.trim()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("applyPromo")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
