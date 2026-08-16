"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Chip,
  Disclosure,
  Input,
  Label,
  Spinner,
  TextField,
} from "@heroui/react";
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
    <Disclosure
      isExpanded={open}
      onExpandedChange={setOpen}
      className={cn("overflow-hidden rounded-[var(--radius-md)] border border-border", className)}
    >
      <Disclosure.Heading>
        <Disclosure.Trigger className="flex w-full items-center justify-between px-4 py-3 text-left text-small font-medium text-foreground">
          {t("promoCode")}
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body className="border-t border-border px-4 py-4">
          {appliedPromo ? (
            <div className="flex items-center justify-between gap-2">
              <Chip color="success" variant="soft">
                <Chip.Label>
                  {t("promoApplied", { code: appliedPromo.code })} ({appliedPromo.percentOff}% off)
                </Chip.Label>
              </Chip>
              <Button type="button" variant="ghost" size="sm" onPress={remove}>
                {t("removePromo")}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <TextField
                value={code}
                onChange={(value) => setCode(value.toUpperCase())}
                className="min-w-0 flex-1"
                aria-label={t("promoCode")}
              >
                <Label className="sr-only">{t("promoCode")}</Label>
                <Input
                  placeholder={t("promoPlaceholder")}
                  className="h-10 uppercase"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void apply();
                    }
                  }}
                />
              </TextField>
              <Button
                type="button"
                className="shrink-0"
                onPress={() => void apply()}
                isDisabled={!code.trim()}
                isPending={loading}
              >
                {loading ? <Spinner color="current" size="sm" /> : t("applyPromo")}
              </Button>
            </div>
          )}
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}
