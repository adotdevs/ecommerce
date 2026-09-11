"use client";

import { useState } from "react";
import type { EmailDocument, BlockType, ProductBlockContent, EmailSection } from "@/lib/email/document-schema";
import { useEmailBuilder } from "./useEmailBuilder";
import { useAutoSave } from "./useAutoSave";
import { ToolbarActions } from "./ToolbarActions";
import { BlockPalette } from "./BlockPalette";
import { BuilderCanvas } from "./BuilderCanvas";
import { BlockSettings } from "./BlockSettings";
import { GlobalStylesPanel } from "./GlobalStylesPanel";
import { ProductPicker } from "./ProductPicker";
import { PreviewPanel } from "./PreviewPanel";
import { AiDesignPanel } from "./AiDesignPanel";
import type { DeviceMode, CanvasZoom } from "./types";

interface EmailBuilderProps {
  initialDocument?: EmailDocument;
  campaignId?: string;
  onContinueToSend?: (document: EmailDocument) => void;
  isSavingCampaign?: boolean;
}

export function EmailBuilder({
  initialDocument,
  campaignId,
  onContinueToSend,
  isSavingCampaign = false,
}: EmailBuilderProps) {
  const {
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
  } = useEmailBuilder(initialDocument);

  const { status: saveStatus, lastSavedAt } = useAutoSave({
    campaignId,
    document,
    enabled: Boolean(campaignId),
  });

  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [zoom, setZoom] = useState<CanvasZoom>("100");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [aiDesignOpen, setAiDesignOpen] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<"inspector" | "global">("inspector");

  const selectedSection = getSelectedSection();

  const handleProductSelect = (
    productId: string,
    snapshot: ProductBlockContent["productSnapshot"]
  ) => {
    if (selectedSection && selectedSection.type === "product") {
      updateSectionContent(selectedSection.id, {
        productId,
        productSnapshot: snapshot,
        ctaUrl: `/products/${snapshot?.slug || ""}`,
        displayTitle: snapshot?.name || "",
      });
    } else if (selectedSection && selectedSection.type === "product-grid") {
      const c = (selectedSection.content || {}) as any;
      const current = ((c.items || c.products || []) as any[]);
      const isPlaceholder =
        current.length === 3 &&
        (current[0]?.id === "grid_1" ||
         current[0]?.id === "grid-item-1" ||
         current[0]?.productId === "prod_1" ||
         current[0]?.productId === "sample-1" ||
         current[0]?.slug === "signature-minimal-sneaker");
      const newItem = {
        id: productId || `grid-${Date.now()}`,
        productId,
        name: snapshot?.name || "Product",
        slug: snapshot?.slug || "",
        price: snapshot?.price ?? 1999,
        salePrice: snapshot?.salePrice,
        image: snapshot?.image || "",
        currency: snapshot?.currency || "Rs",
        badge: snapshot?.salePrice ? "Sale" : "Hot",
        badgeText: snapshot?.salePrice ? "Sale" : "Hot",
        ctaText: "Shop Now",
        ctaUrl: `/products/${snapshot?.slug || ""}`,
      };
      const updated = isPlaceholder ? [newItem] : [...current, newItem];
      updateSectionContent(selectedSection.id, {
        items: updated,
        products: updated,
      });
    } else {
      addSection("product", undefined, snapshot);
    }
  };

  const handleApplyTemplate = (tplDoc: EmailDocument) => {
    setDocument(tplDoc);
  };

  return (
    <div className="flex flex-col h-full flex-1 w-full bg-slate-100 overflow-hidden min-h-0">
      {/* Top Action Toolbar */}
      <ToolbarActions
        document={document}
        deviceMode={deviceMode}
        onDeviceModeChange={setDeviceMode}
        zoom={zoom}
        onZoomChange={setZoom}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        onUpdateSubject={updateSubject}
        onUpdatePreviewText={updatePreviewText}
        onOpenPreview={() => setPreviewOpen(true)}
        onOpenAiDesign={() => setAiDesignOpen(true)}
        onContinueToSend={onContinueToSend ? () => onContinueToSend(document) : undefined}
        isSavingCampaign={isSavingCampaign}
      />

      {/* Main 3-Column Layout with min-h-0 to guarantee scrollability */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Column: Block Palette */}
        <BlockPalette
          onAddBlock={(type: BlockType) => addSection(type)}
          onOpenProductPicker={() => setProductPickerOpen(true)}
          onSelectTemplate={(tpl) => handleApplyTemplate(tpl.document)}
        />

        {/* Center Column: Visual Canvas */}
        <BuilderCanvas
          document={document}
          selectedSectionId={selectedSectionId}
          deviceMode={deviceMode}
          zoom={zoom}
          onSelectSection={(id) => {
            setSelectedSectionId(id);
            setRightPanelMode(id ? "inspector" : "global");
          }}
          onMoveUp={(id) => moveSection(id, "up")}
          onMoveDown={(id) => moveSection(id, "down")}
          onDuplicate={(id) => duplicateSection(id)}
          onDelete={(id) => removeSection(id)}
          onAddBlock={(type) => addSection(type)}
          onOpenProductPicker={() => setProductPickerOpen(true)}
          onSelectTemplate={(tpl) => handleApplyTemplate(tpl.document)}
        />

        {/* Right Column: Inspector or Global Styles */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden flex-shrink-0">
          {/* Header to toggle Inspector vs Global Styles */}
          <div className="flex border-b border-gray-200 text-xs font-medium bg-gray-50/70">
            <button
              type="button"
              onClick={() => setRightPanelMode("inspector")}
              className={`flex-1 py-2 text-center border-b-2 transition ${
                rightPanelMode === "inspector"
                  ? "border-indigo-600 text-indigo-600 font-semibold bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Block Inspector
            </button>
            <button
              type="button"
              onClick={() => setRightPanelMode("global")}
              className={`flex-1 py-2 text-center border-b-2 transition ${
                rightPanelMode === "global"
                  ? "border-indigo-600 text-indigo-600 font-semibold bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Global Styles
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {rightPanelMode === "inspector" && selectedSection ? (
              <BlockSettings
                section={selectedSection}
                onUpdateContent={(updates) => updateSectionContent(selectedSection.id, updates)}
                onUpdateSettings={(settings) => updateSectionSettings(selectedSection.id, settings)}
                onDelete={() => removeSection(selectedSection.id)}
                onDuplicate={() => duplicateSection(selectedSection.id)}
                onMoveUp={() => moveSection(selectedSection.id, "up")}
                onMoveDown={() => moveSection(selectedSection.id, "down")}
              />
            ) : rightPanelMode === "global" || !selectedSection ? (
              <GlobalStylesPanel
                styles={document.globalStyles}
                onChange={updateGlobalStyles}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Global Modals */}
      <ProductPicker
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        onSelectProduct={handleProductSelect}
      />

      <PreviewPanel
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={document}
      />

      <AiDesignPanel
        open={aiDesignOpen}
        onOpenChange={setAiDesignOpen}
        document={document}
        onApplySections={(sections: EmailSection[], subject?: string, previewText?: string, globalStyles?: any) => {
          setDocument({
            ...document,
            sections,
            subject: subject || document.subject,
            previewText: previewText || document.previewText,
            globalStyles: globalStyles || document.globalStyles,
          });
        }}
        onApplySubject={(subject, previewText) => {
          setDocument({
            ...document,
            subject,
            previewText: previewText || document.previewText,
          });
        }}
        onApplyStyles={(styles) => {
          updateGlobalStyles(styles);
        }}
      />
    </div>
  );
}
