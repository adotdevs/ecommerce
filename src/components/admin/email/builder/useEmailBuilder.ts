"use client";

import { useState, useCallback, useRef } from "react";
import type {
  BlockType,
  EmailDocument,
  EmailSection,
  GlobalStyles,
  SectionSettings,
  ProductBlockContent,
} from "@/lib/email/document-schema";
import {
  createDefaultEmailDocument,
  createTextBlock,
  createButtonBlock,
  createImageBlock,
  createProductBlock,
  createHeroBlock,
  createSpacerBlock,
  createDividerBlock,
  createCouponBlock,
  createBannerBlock,
  createFooterBlock,
  createColumnsBlock,
  createProductGridBlock,
  createCountdownBlock,
  createSocialLinksBlock,
  createTestimonialBlock,
  generateBlockId,
} from "@/lib/email/document-defaults";

const MAX_HISTORY = 30;

export function useEmailBuilder(initialDoc?: EmailDocument) {
  const [document, setDocumentState] = useState<EmailDocument>(() =>
    initialDoc || createDefaultEmailDocument("Special Announcement")
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Undo / Redo stacks
  const undoStackRef = useRef<EmailDocument[]>([]);
  const redoStackRef = useRef<EmailDocument[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushHistory = useCallback((currentDoc: EmailDocument) => {
    undoStackRef.current.push(JSON.parse(JSON.stringify(currentDoc)));
    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current.push(JSON.parse(JSON.stringify(document)));
    setDocumentState(prev);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  }, [document]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(JSON.parse(JSON.stringify(document)));
    setDocumentState(next);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  }, [document]);

  const setDocument = useCallback(
    (newDoc: EmailDocument) => {
      pushHistory(document);
      setDocumentState(newDoc);
    },
    [document, pushHistory]
  );

  const updateSubject = useCallback(
    (subject: string) => {
      setDocumentState((prev) => ({ ...prev, subject }));
    },
    []
  );

  const updatePreviewText = useCallback(
    (previewText: string) => {
      setDocumentState((prev) => ({ ...prev, previewText }));
    },
    []
  );

  const updateGlobalStyles = useCallback(
    (styles: Partial<GlobalStyles>) => {
      pushHistory(document);
      setDocumentState((prev) => ({
        ...prev,
        globalStyles: { ...prev.globalStyles, ...styles },
      }));
    },
    [document, pushHistory]
  );

  const createSectionByType = useCallback(
    (type: BlockType, productData?: ProductBlockContent["productSnapshot"]): EmailSection => {
      switch (type) {
        case "text":
          return createTextBlock();
        case "button":
          return createButtonBlock();
        case "image":
          return createImageBlock();
        case "product":
          return createProductBlock(
            productData?.name ? "prod_selected" : "",
            productData || { name: "Featured Product", slug: "featured-product", price: 1999, currency: "Rs" }
          );
        case "hero":
          return createHeroBlock();
        case "spacer":
          return createSpacerBlock(24);
        case "divider":
          return createDividerBlock();
        case "coupon":
          return createCouponBlock();
        case "banner":
          return createBannerBlock();
        case "footer":
          return createFooterBlock();
        case "columns":
          return createColumnsBlock();
        case "product-grid":
          return createProductGridBlock();
        case "countdown":
          return createCountdownBlock();
        case "social-links":
          return createSocialLinksBlock();
        case "testimonial":
          return createTestimonialBlock();
        default:
          return createTextBlock();
      }
    },
    []
  );

  const addSection = useCallback(
    (type: BlockType, index?: number, productData?: ProductBlockContent["productSnapshot"]) => {
      pushHistory(document);
      const newSection = createSectionByType(type, productData);
      setDocumentState((prev) => {
        const sections = [...prev.sections];
        if (index !== undefined && index >= 0 && index <= sections.length) {
          sections.splice(index, 0, newSection);
        } else {
          sections.push(newSection);
        }
        return { ...prev, sections };
      });
      setSelectedSectionId(newSection.id);
      return newSection.id;
    },
    [document, pushHistory, createSectionByType]
  );

  const updateSection = useCallback(
    (id: string, updates: Partial<EmailSection>) => {
      pushHistory(document);
      setDocumentState((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      }));
    },
    [document, pushHistory]
  );

  const updateSectionSettings = useCallback(
    (id: string, settingsUpdates: Partial<EmailSection["settings"]>) => {
      pushHistory(document);
      setDocumentState((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === id ? { ...s, settings: { ...s.settings, ...settingsUpdates } } : s
        ),
      }));
    },
    [document, pushHistory]
  );

  const updateSectionContent = useCallback(
    (id: string, contentUpdates: Record<string, unknown>) => {
      setDocumentState((prev) => ({
        ...prev,
        sections: prev.sections.map((sec) =>
          sec.id === id
            ? { ...sec, content: { ...((sec.content || {}) as unknown as Record<string, unknown>), ...contentUpdates } as unknown as EmailSection["content"] }
            : sec
        ),
      }));
    },
    []
  );

  const removeSection = useCallback(
    (id: string) => {
      pushHistory(document);
      setDocumentState((prev) => ({
        ...prev,
        sections: prev.sections.filter((s) => s.id !== id),
      }));
      setSelectedSectionId((prev) => (prev === id ? null : prev));
    },
    [document, pushHistory]
  );

  const moveSection = useCallback(
    (id: string, direction: "up" | "down") => {
      setDocumentState((prev) => {
        const index = prev.sections.findIndex((s) => s.id === id);
        if (index === -1) return prev;
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= prev.sections.length) return prev;

        const newSections = [...prev.sections];
        const [moved] = newSections.splice(index, 1);
        newSections.splice(targetIndex, 0, moved);
        return { ...prev, sections: newSections };
      });
    },
    []
  );

  const duplicateSection = useCallback(
    (id: string) => {
      pushHistory(document);
      setDocumentState((prev) => {
        const index = prev.sections.findIndex((s) => s.id === id);
        if (index === -1) return prev;
        const original = prev.sections[index];
        const copy: EmailSection = {
          ...JSON.parse(JSON.stringify(original)),
          id: generateBlockId(),
        };
        const newSections = [...prev.sections];
        newSections.splice(index + 1, 0, copy);
        return { ...prev, sections: newSections };
      });
    },
    [document, pushHistory]
  );

  const reorderSections = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      pushHistory(document);
      setDocumentState((prev) => {
        const newSections = [...prev.sections];
        const [moved] = newSections.splice(fromIndex, 1);
        newSections.splice(toIndex, 0, moved);
        return { ...prev, sections: newSections };
      });
    },
    [document, pushHistory]
  );

  const getSelectedSection = useCallback(() => {
    return document.sections.find((s) => s.id === selectedSectionId);
  }, [document.sections, selectedSectionId]);

  return {
    document,
    selectedSectionId,
    setSelectedSectionId,
    getSelectedSection,
    canUndo,
    canRedo,
    undo,
    redo,
    setDocument,
    updateSubject,
    updatePreviewText,
    updateGlobalStyles,
    addSection,
    updateSection,
    updateSectionSettings,
    updateSectionContent,
    removeSection,
    moveSection,
    duplicateSection,
    reorderSections,
  };
}
