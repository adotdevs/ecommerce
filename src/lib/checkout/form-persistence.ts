import type { CheckoutFormState, CheckoutStep } from "@/lib/checkout/types";

const STORAGE_KEY = "checkout-form-draft";

export interface CheckoutDraft extends Partial<CheckoutFormState> {
  step?: CheckoutStep;
}

export function loadCheckoutDraft(): CheckoutDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CheckoutDraft;
  } catch {
    return null;
  }
}

export function saveCheckoutDraft(form: CheckoutFormState, step: CheckoutStep) {
  if (typeof sessionStorage === "undefined") return;
  try {
    const draft: CheckoutDraft = { ...form, step };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function clearCheckoutDraft() {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
