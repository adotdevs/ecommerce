"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { EmailDocument } from "@/lib/email/document-schema";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

interface UseAutoSaveOptions {
  campaignId?: string;
  document: EmailDocument;
  enabled?: boolean;
  debounceMs?: number;
}

export function useAutoSave({
  campaignId,
  document,
  enabled = true,
  debounceMs = 2000,
}: UseAutoSaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastDocJsonRef = useRef<string>(JSON.stringify(document));
  const isFirstRender = useRef(true);

  const saveToServer = useCallback(
    async (docToSave: EmailDocument): Promise<boolean> => {
      if (!campaignId) return false;
      setStatus("saving");
      setErrorMessage(null);

      try {
        const res = await fetch(`/api/v1/admin/email/campaigns/${campaignId}/document`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailDocument: docToSave }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to save draft");
        }

        lastDocJsonRef.current = JSON.stringify(docToSave);
        setStatus("saved");
        setLastSavedAt(new Date());
        return true;
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Save failed");
        return false;
      }
    },
    [campaignId]
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!enabled || !campaignId) return;

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
  }, [document, enabled, campaignId, debounceMs, saveToServer]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    return saveToServer(document);
  }, [document, saveToServer]);

  return {
    status,
    lastSavedAt,
    errorMessage,
    saveNow,
  };
}
