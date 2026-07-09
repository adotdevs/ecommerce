"use client";

import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastAction {
  label: string;
  href: string;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
  action?: ToastAction;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(input: Omit<ToastItem, "id">) {
  useToastStore.getState().push(input);
}

export function toastSaveSuccess(options: {
  sectionName: string;
  translationStatus?: string;
  translationError?: string;
  localeCount?: number;
  manualLocale?: string;
  englishOnly?: boolean;
  previewText?: string;
}) {
  const {
    sectionName,
    translationStatus,
    translationError,
    localeCount,
    manualLocale,
    englishOnly,
    previewText,
  } = options;

  if (manualLocale) {
    toast({
      variant: "success",
      title: "Translation saved",
      description: `${sectionName} — ${manualLocale} content updated successfully.`,
    });
    return;
  }

  if (englishOnly) {
    toast({
      variant: "info",
      title: "Changes saved",
      description: `${sectionName} saved in English. Other languages were not updated.`,
    });
    return;
  }

  if (translationStatus === "completed") {
    toast({
      variant: "success",
      title: "Saved & translated",
      description: previewText
        ? `${sectionName} translated to ${localeCount ?? 5} languages. Preview (ar): "${previewText}" — open the Arabic tab below to edit.`
        : `${sectionName} saved. Auto-translated to ${localeCount ?? 5} languages (ar, ur, fr, de, es). Open a language tab below to review.`,
      duration: 8000,
    });
    return;
  }

  if (translationStatus === "failed") {
    toast({
      variant: "error",
      title: "Saved, but translation failed",
      description:
        translationError ??
        "English content was saved. Auto-translation did not complete — edit languages manually or retry.",
      duration: 8000,
    });
    return;
  }

  if (translationStatus === "idle") {
    toast({
      variant: "warning",
      title: "Saved — translation skipped",
      description: `${sectionName} saved. Auto-translate is disabled; use manual translation tabs.`,
      duration: 6000,
    });
    return;
  }

  toast({
    variant: "success",
    title: "Changes saved",
    description: `${sectionName} updated successfully.`,
  });
}

export function toastError(title: string, description?: string) {
  toast({ variant: "error", title, description, duration: 7000 });
}
