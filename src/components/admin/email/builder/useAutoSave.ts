"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { EmailDocument } from "@/lib/email/document-schema";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error" | "restored";

interface UseAutoSaveOptions {
  campaignId?: string;
  templateId?: string;
  draftKey?: string;
  document: EmailDocument;
  enabled?: boolean;
  debounceMs?: number;
  onAutoSaved?: (savedAt: Date) => void;
}

const DEFAULT_DRAFT_KEY = "email_builder_working_draft";

export function useAutoSave({
  campaignId,
  templateId,
  draftKey = DEFAULT_DRAFT_KEY,
  document,
  enabled = true,
  debounceMs = 1500,
  onAutoSaved,
}: UseAutoSaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastDocJsonRef = useRef<string>(JSON.stringify(document));
  const isFirstRender = useRef(true);

  // Storage key specific to target
  const storageKey = templateId
    ? `template_draft_${templateId}`
    : campaignId
    ? `campaign_draft_${campaignId}`
    : draftKey;

  // Check if a saved draft exists on mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.document && parsed?.updatedAt) {
            setHasSavedDraft(true);
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey]);

  const saveToLocalStorage = useCallback(
    (docToSave: EmailDocument): Date => {
      const now = new Date();
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              document: docToSave,
              updatedAt: now.toISOString(),
            })
          );
          setHasSavedDraft(true);
        } catch (e) {
          console.warn("Could not save draft to localStorage:", e);
        }
      }
      return now;
    },
    [storageKey]
  );

  const saveToServer = useCallback(
    async (docToSave: EmailDocument): Promise<boolean> => {
      setStatus("saving");
      setErrorMessage(null);

      // Save locally first for instant resilience
      const savedTime = saveToLocalStorage(docToSave);

      if (!campaignId && !templateId) {
        // Standalone draft saved to local storage
        lastDocJsonRef.current = JSON.stringify(docToSave);
        setStatus("saved");
        setLastSavedAt(savedTime);
        onAutoSaved?.(savedTime);
        return true;
      }

      try {
        if (campaignId) {
          const res = await fetch(`/api/v1/admin/email/campaigns/${campaignId}/document`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emailDocument: docToSave }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || "Failed to save draft");
          }
        } else if (templateId) {
          const res = await fetch(`/api/v1/admin/email/templates/${templateId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emailDocument: docToSave }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || "Failed to save draft");
          }
        }

        lastDocJsonRef.current = JSON.stringify(docToSave);
        setStatus("saved");
        setLastSavedAt(savedTime);
        onAutoSaved?.(savedTime);
        return true;
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Save failed");
        return false;
      }
    },
    [campaignId, templateId, saveToLocalStorage, onAutoSaved]
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!enabled) return;

    const currentJson = JSON.stringify(document);
    if (currentJson === lastDocJsonRef.current) return;

    setStatus("unsaved");

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      saveToServer(document);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [document, enabled, debounceMs, saveToServer]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    return saveToServer(document);
  }, [document, saveToServer]);

  const discardDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(storageKey);
        setHasSavedDraft(false);
      } catch {
        // Ignore
      }
    }
  }, [storageKey]);

  const loadSavedDraft = useCallback((): { document: EmailDocument; updatedAt: Date } | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.document) {
        return {
          document: parsed.document as EmailDocument,
          updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date(),
        };
      }
    } catch {
      // Ignore
    }
    return null;
  }, [storageKey]);

  return {
    status,
    lastSavedAt,
    errorMessage,
    hasSavedDraft,
    saveNow,
    discardDraft,
    loadSavedDraft,
  };
}
