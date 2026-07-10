"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, X } from "lucide-react";
import { Button } from "@/components/ds/button";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { useCartStore } from "@/stores/cart-store";
import {
  getThemePromptChoice,
  prefersDarkSystem,
  setThemePromptChoice,
  type ThemePromptChoice,
} from "@/lib/theme/prompt-storage";

const SHOW_DELAY_MS = 2500;

export function ThemePreferencePrompt() {
  const t = useTranslations("theme");
  const mounted = useClientMounted();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [visible, setVisible] = useState(false);
  const cartItems = useCartStore((s) => s.items);

  const cartItemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  useEffect(() => {
    if (!mounted) return;
    if (getThemePromptChoice()) return;
    if (!prefersDarkSystem()) return;
    if (theme !== "light") return;
    if (resolvedTheme !== "light") return;

    const timer = window.setTimeout(() => {
      if (
        !getThemePromptChoice() &&
        prefersDarkSystem() &&
        theme === "light" &&
        resolvedTheme === "light"
      ) {
        setVisible(true);
      }
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [mounted, theme, resolvedTheme]);

  const dismiss = (choice: ThemePromptChoice) => {
    setThemePromptChoice(choice);
    setVisible(false);
  };

  const handleUseDark = () => {
    setTheme("dark");
    dismiss("dark");
  };

  if (!mounted) return null;

  const bottomOffset =
    cartItemCount > 0
      ? "bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-6"
      : "bottom-[calc(1.5rem+env(safe-area-inset-bottom))]";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed left-4 right-4 z-[60] sm:left-auto sm:right-6 sm:max-w-sm ${bottomOffset}`}
        >
          <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
            <button
              type="button"
              onClick={() => dismiss("dismissed")}
              className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label={t("close")}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex gap-3 pr-7">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 text-primary">
                <Moon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-small font-semibold text-foreground">
                  {t("title")}
                </p>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                  {t("description")}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => dismiss("light")}>
                {t("keepLight")}
              </Button>
              <Button size="sm" onClick={handleUseDark}>
                {t("useDark")}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
