"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ds/utils";
import type { CheckoutStep } from "@/lib/checkout/types";

interface CheckoutStepsProps {
  currentStep: CheckoutStep;
}

const STEPS = [
  { id: "shipping" as const, labelKey: "stepShipping" as const },
  { id: "payment" as const, labelKey: "stepPayment" as const },
  { id: "review" as const, labelKey: "stepReview" as const },
];

export function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  const t = useTranslations("checkout");
  const activeIndex =
    currentStep === "success" ? 3 : STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Checkout progress" className="mb-8 md:mb-10">
      <ol className="flex items-center justify-center gap-0">
        {STEPS.map((step, index) => {
          const completed = activeIndex > index;
          const active = activeIndex === index && currentStep !== "success";
          const isLast = index === STEPS.length - 1;

          return (
            <li key={step.id} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors md:h-10 md:w-10",
                    completed &&
                      "border-brand-accent bg-brand-accent text-white",
                    active &&
                      "border-primary bg-primary text-white shadow-[0_4px_14px_rgba(79,70,229,0.35)]",
                    !completed &&
                      !active &&
                      "border-border bg-card text-muted-foreground"
                  )}
                >
                  {completed ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:block",
                    active || completed
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {t(step.labelKey)}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mx-2 h-0.5 w-8 rounded-full md:mx-4 md:w-16",
                    completed ? "bg-brand-accent" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
