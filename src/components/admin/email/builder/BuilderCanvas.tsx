"use client";

import { useRef, useEffect } from "react";
import {
  Plus,
  ShoppingBag,
  Sparkles,
  FileText,
  Clock,
  LayoutGrid,
  Share2,
  Heart,
  ChevronUp,
  ChevronDown,
  Smartphone,
  Eye,
  Layers,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { EmailDocument, BlockType } from "@/lib/email/document-schema";
import { STARTER_TEMPLATES, type StarterTemplate } from "@/lib/email/document-defaults";
import type { DeviceMode, CanvasZoom } from "./types";
import { BlockRenderer } from "./BlockRenderer";

interface BuilderCanvasProps {
  document: EmailDocument;
  selectedSectionId: string | null;
  deviceMode: DeviceMode;
  zoom?: CanvasZoom;
  onSelectSection: (id: string | null) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAddBlock: (type: BlockType) => void;
  onOpenProductPicker: () => void;
  onSelectTemplate?: (template: StarterTemplate) => void;
  onEditSubject?: () => void;
}

export function BuilderCanvas({
  document,
  selectedSectionId,
  deviceMode,
  zoom = "100",
  onSelectSection,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onAddBlock,
  onOpenProductPicker,
  onSelectTemplate,
  onEditSubject,
}: BuilderCanvasProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gs = document.globalStyles;
  const isMobile = deviceMode === "mobile";

  const containerWidth = isMobile ? "375px" : `${gs.contentWidth}px`;

  // Zoom transform mapping
  const zoomScaleMap: Record<CanvasZoom, number> = {
    "100": 1,
    "90": 0.9,
    "80": 0.8,
    "75": 0.75,
    fit: 0.85,
  };
  const scale = zoomScaleMap[zoom] || 1;

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      onClick={() => onSelectSection(null)}
      style={{
        backgroundColor: gs.backgroundColor || "#f1f5f9",
        backgroundImage: `radial-gradient(rgba(148, 163, 184, 0.25) 1px, transparent 1px)`,
        backgroundSize: "20px 20px",
      }}
      className="flex-1 overflow-y-auto min-h-0 h-full p-4 md:p-8 pb-48 flex flex-col items-center justify-start transition-colors relative [scrollbar-gutter:stable]"
    >
      {/* Subject Line Pill & Inbox Preview Snippet Header */}
      <div className="sticky top-0 z-20 mb-6 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full border border-gray-200/90 text-xs shadow-md flex items-center gap-2 max-w-xl w-full justify-between cursor-pointer hover:border-indigo-300 transition group"
        onClick={(e) => {
          e.stopPropagation();
          onEditSubject?.();
        }}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          <span className="font-extrabold text-indigo-600 uppercase text-[10px] tracking-wider bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 flex-shrink-0">
            Subject
          </span>
          <span className="text-gray-900 font-semibold truncate text-xs">
            {document.subject || "No subject set"}
          </span>
          {document.previewText && (
            <>
              <span className="text-gray-300 flex-shrink-0">•</span>
              <span className="text-gray-400 truncate text-[11px]">
                {document.previewText}
              </span>
            </>
          )}
        </div>
        <span className="text-[10px] text-gray-400 font-medium group-hover:text-indigo-600 transition flex-shrink-0 ml-2">
          {document.sections.length} blocks
        </span>
      </div>

      {/* Outer Scaled Wrapper for Zoom */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {/* If Mobile Mode: Realistic Phone Bezel Frame */}
        {isMobile ? (
          <div className="w-[395px] p-2.5 bg-gray-900 rounded-[44px] shadow-2xl border-4 border-gray-800 transition-all">
            {/* Phone Speaker Notch */}
            <div className="w-full flex items-center justify-center pb-2 pt-1">
              <div className="w-20 h-4 bg-gray-950 rounded-full flex items-center justify-center gap-1.5 px-3">
                <div className="w-2 h-2 rounded-full bg-gray-800" />
                <div className="w-8 h-1 rounded-full bg-gray-800" />
              </div>
            </div>

            {/* Email Inner Card */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: gs.contentBackground,
                borderRadius: "32px",
                fontFamily: gs.fontFamily,
              }}
              className="overflow-hidden min-h-[550px] flex flex-col border border-gray-100 shadow-inner"
            >
              {document.sections.length === 0 ? (
                <EmptyCanvasState
                  onAddBlock={onAddBlock}
                  onOpenProductPicker={onOpenProductPicker}
                  onSelectTemplate={onSelectTemplate}
                />
              ) : (
                <div className="flex-1 flex flex-col divide-y divide-gray-100">
                  {document.sections.map((section) => (
                    <BlockRenderer
                      key={section.id}
                      section={section}
                      globalStyles={gs}
                      isSelected={selectedSectionId === section.id}
                      onSelect={() => onSelectSection(section.id)}
                      onMoveUp={() => onMoveUp(section.id)}
                      onMoveDown={() => onMoveDown(section.id)}
                      onDuplicate={() => onDuplicate(section.id)}
                      onDelete={() => onDelete(section.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Phone Bottom Bar */}
            <div className="w-full flex items-center justify-center pt-2.5 pb-1">
              <div className="w-32 h-1 bg-gray-600 rounded-full" />
            </div>
          </div>
        ) : (
          /* Desktop Email Card Container */
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: containerWidth,
              backgroundColor: gs.contentBackground,
              borderRadius: `${gs.borderRadius}px`,
              fontFamily: gs.fontFamily,
              boxShadow: "0 10px 30px -4px rgba(0, 0, 0, 0.08), 0 4px 10px -2px rgba(0, 0, 0, 0.03)",
            }}
            className="transition-all duration-200 min-h-[500px] flex flex-col border border-gray-200/70"
          >
            {document.sections.length === 0 ? (
              <EmptyCanvasState
                onAddBlock={onAddBlock}
                onOpenProductPicker={onOpenProductPicker}
                onSelectTemplate={onSelectTemplate}
              />
            ) : (
              <div className="flex-1 flex flex-col divide-y divide-gray-100">
                {document.sections.map((section) => (
                  <BlockRenderer
                    key={section.id}
                    section={section}
                    globalStyles={gs}
                    isSelected={selectedSectionId === section.id}
                    onSelect={() => onSelectSection(section.id)}
                    onMoveUp={() => onMoveUp(section.id)}
                    onMoveDown={() => onMoveDown(section.id)}
                    onDuplicate={() => onDuplicate(section.id)}
                    onDelete={() => onDelete(section.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Add Bar at bottom of canvas */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 max-w-xl">
        <button
          type="button"
          onClick={() => onAddBlock("text")}
          className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-xs font-semibold shadow-xs transition flex items-center gap-1 hover:border-indigo-300"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-600" />
          Text
        </button>
        <button
          type="button"
          onClick={onOpenProductPicker}
          className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-xs font-semibold shadow-xs transition flex items-center gap-1 hover:border-indigo-300"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
          Product Card
        </button>
        <button
          type="button"
          onClick={() => onAddBlock("product-grid")}
          className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-xs font-semibold shadow-xs transition flex items-center gap-1 hover:border-indigo-300"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
          Product Grid
        </button>
        <button
          type="button"
          onClick={() => onAddBlock("countdown")}
          className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-xs font-semibold shadow-xs transition flex items-center gap-1 hover:border-indigo-300"
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Countdown
        </button>
        <button
          type="button"
          onClick={() => onAddBlock("button")}
          className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-xs font-semibold shadow-xs transition flex items-center gap-1 hover:border-indigo-300"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-600" />
          Button
        </button>
        <button
          type="button"
          onClick={() => onAddBlock("testimonial")}
          className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-xs font-semibold shadow-xs transition flex items-center gap-1 hover:border-indigo-300"
        >
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          Review
        </button>
        <button
          type="button"
          onClick={() => onAddBlock("coupon")}
          className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-xs font-semibold shadow-xs transition flex items-center gap-1 hover:border-indigo-300"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-600" />
          Coupon
        </button>
      </div>

      {/* Floating Canvas Navigation Minimap Controls */}
      {document.sections.length > 3 && (
        <div className="fixed bottom-6 right-84 z-20 flex items-center gap-1 bg-gray-900/90 backdrop-blur text-white px-2 py-1.5 rounded-full shadow-lg border border-gray-800 text-xs">
          <button
            type="button"
            onClick={scrollToTop}
            title="Scroll to Top"
            className="p-1 hover:bg-gray-800 rounded-full transition text-gray-300 hover:text-white"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono px-1.5 text-gray-400">
            {document.sections.length} blocks
          </span>
          <button
            type="button"
            onClick={scrollToBottom}
            title="Scroll to Bottom"
            className="p-1 hover:bg-gray-800 rounded-full transition text-gray-300 hover:text-white"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyCanvasState({
  onAddBlock,
  onOpenProductPicker,
  onSelectTemplate,
}: {
  onAddBlock: (type: BlockType) => void;
  onOpenProductPicker: () => void;
  onSelectTemplate?: (template: StarterTemplate) => void;
}) {
  return (
    <div className="p-8 md:p-12 text-center my-auto space-y-6">
      <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-indigo-100">
        <Sparkles className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">Your Email Canvas is Empty</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 leading-relaxed">
          Start from scratch using building blocks, or choose one of our high-converting designer starter templates below.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onOpenProductPicker}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Add Product Card
        </button>
        <button
          type="button"
          onClick={() => onAddBlock("product-grid")}
          className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
          Add Product Grid
        </button>
        <button
          type="button"
          onClick={() => onAddBlock("hero")}
          className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          Add Hero Banner
        </button>
        <button
          type="button"
          onClick={() => onAddBlock("countdown")}
          className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Add Countdown
        </button>
      </div>

      {/* Starter Template Previews in Empty State */}
      {onSelectTemplate && (
        <div className="pt-4 border-t border-gray-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
            Or Load A High-Converting Template (1-Click)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left max-w-xl mx-auto">
            {STARTER_TEMPLATES.slice(0, 3).map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onSelectTemplate(tpl)}
                className="p-3 bg-gray-50 hover:bg-indigo-50/60 border border-gray-200 hover:border-indigo-300 rounded-xl transition group text-left flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 transition block mb-1">
                    {tpl.name}
                  </span>
                  <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 mt-2 flex items-center gap-0.5">
                  Load Template &rarr;
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
