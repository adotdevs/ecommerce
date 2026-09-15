"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  ShoppingBag,
  Type,
  Maximize2,
  Palette,
  ExternalLink,
  Sparkles,
  Star,
  Clock,
  Share2,
  Quote,
  Grid,
  Plus,
  Flame,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
} from "lucide-react";
import type {
  EmailSection,
  SectionSettings,
  TextBlockContent,
  ButtonBlockContent,
  ImageBlockContent,
  ProductBlockContent,
  ProductGridBlockContent,
  CountdownBlockContent,
  SocialLinksBlockContent,
  TestimonialBlockContent,
  HeroBlockContent,
  SpacerBlockContent,
  DividerBlockContent,
  CouponBlockContent,
  BannerBlockContent,
  FooterBlockContent,
  ProductLayout,
  SocialPlatform,
} from "@/lib/email/document-schema";
import { LinkEditor } from "./LinkEditor";
import { ProductPicker } from "./ProductPicker";

interface BlockSettingsProps {
  section: EmailSection;
  onUpdateContent: (updates: Record<string, unknown>) => void;
  onUpdateSettings: (settings: Partial<SectionSettings>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const TOKEN_SUGGESTIONS = [
  { label: "First Name", token: "{{firstName}}" },
  { label: "Last Name", token: "{{lastName}}" },
  { label: "Email", token: "{{email}}" },
  { label: "Store Name", token: "{{storeName}}" },
];

const PRODUCT_LAYOUT_PRESETS: Array<{
  id: ProductLayout;
  label: string;
  desc: string;
  badge: string;
  color: string;
}> = [
  { id: "image-top", label: "Standard Top", desc: "Top image card", badge: "Classic", color: "bg-blue-50 text-blue-700" },
  { id: "image-left", label: "Split Left", desc: "Image on left", badge: "Popular", color: "bg-indigo-50 text-indigo-700" },
  { id: "image-right", label: "Split Right", desc: "Image on right", badge: "Balanced", color: "bg-indigo-50 text-indigo-700" },
  { id: "hero", label: "Hero Spotlight", desc: "Full-width spotlight", badge: "Impact", color: "bg-purple-50 text-purple-700" },
  { id: "compact", label: "Compact Row", desc: "Slim catalog row", badge: "Dense", color: "bg-slate-100 text-slate-700" },
  { id: "price-focused", label: "Price Highlight", desc: "Bold savings badge", badge: "Deal", color: "bg-emerald-50 text-emerald-700" },
  { id: "luxury-showcase", label: "Luxury Gold", desc: "Obsidian & gold VIP", badge: "Luxury", color: "bg-amber-50 text-amber-800" },
  { id: "gradient-spotlight", label: "Gradient Glow", desc: "Vibrant modern card", badge: "Glow", color: "bg-pink-50 text-pink-700" },
  { id: "badge-highlight", label: "Urgent Deal", desc: "Limited offer header", badge: "Urgent", color: "bg-rose-50 text-rose-700" },
  { id: "image-button-only", label: "Minimal CTA", desc: "Image + CTA only", badge: "Clean", color: "bg-gray-100 text-gray-700" },
  { id: "editorial-magazine", label: "Editorial Vogue", desc: "High-fashion look", badge: "Vogue", color: "bg-stone-100 text-stone-800" },
  { id: "glassmorphism-card", label: "Frosted Glass", desc: "Glass floating card", badge: "Glass", color: "bg-cyan-50 text-cyan-700" },
  { id: "neon-cyber", label: "Neon Cyber", desc: "High-contrast dark", badge: "Cyber", color: "bg-emerald-950 text-emerald-300" },
  { id: "star-rated-deal", label: "Star Rated", desc: "Social proof stars", badge: "Proof", color: "bg-yellow-50 text-yellow-700" },
  { id: "minimal-boutique", label: "Boutique", desc: "Clean Scandinavian", badge: "Nordic", color: "bg-zinc-100 text-zinc-800" },
  { id: "pill-badge-row", label: "Pill Deal Row", desc: "Horizontal badge row", badge: "Row", color: "bg-violet-50 text-violet-700" },
];

export function BlockSettings({
  section,
  onUpdateContent,
  onUpdateSettings,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: BlockSettingsProps) {
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [gridPickerOpen, setGridPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "spacing">("content");
  const [aiPolishState, setAiPolishState] = useState<"idle" | "polishing" | "done">("idle");

  const c = (section.content || {}) as unknown as Record<string, any>;
  const s = section.settings || {};

  // Quick AI Polish helper
  const handleQuickAiPolish = (field: string, currentText?: string) => {
    if (!currentText) return;
    setAiPolishState("polishing");
    setTimeout(() => {
      let polished = currentText;
      if (field === "headline" || field === "title") {
        polished = currentText
          .replace(/^(exclusive|special|limited|hot|new)\s+/i, "")
          .trim();
        polished = `✨ Handpicked: ${polished} — Limited Edition`;
      } else if (field === "text" || field === "description") {
        polished = `${currentText} Handcrafted to perfection with premium materials, designed for effortless elegance and timeless style.`;
      }
      onUpdateContent({ [field]: polished });
      setAiPolishState("done");
      setTimeout(() => setAiPolishState("idle"), 2000);
    }, 450);
  };

  return (
    <div className="flex flex-col w-full">
      {/* Header */}
      <div className="sticky top-0 z-10 p-3 border-b border-gray-200 flex items-center justify-between bg-white/95 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
            {section.type}
          </span>
          <span className="text-[11px] text-gray-400 font-mono truncate max-w-[85px]">
            {section.id}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            title="Move Up"
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            title="Move Down"
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            title="Duplicate Block"
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete Block"
            className="p-1 hover:bg-red-50 text-red-500 rounded transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[45px] z-10 flex border-b border-gray-200 text-xs font-medium bg-gray-50/90 backdrop-blur-xs">
        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className={`flex-1 py-2 text-center border-b-2 transition ${
            activeTab === "content"
              ? "border-indigo-600 text-indigo-600 font-semibold bg-white"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Content & Layout
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("spacing")}
          className={`flex-1 py-2 text-center border-b-2 transition ${
            activeTab === "spacing"
              ? "border-indigo-600 text-indigo-600 font-semibold bg-white"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Padding & Background
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 text-xs">
        {activeTab === "spacing" ? (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800 text-[11px] uppercase tracking-wider">
              Section Padding (px)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Top</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={s.paddingTop ?? 16}
                  onChange={(e) => onUpdateSettings({ paddingTop: parseInt(e.target.value, 10) || 0 })}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Bottom</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={s.paddingBottom ?? 16}
                  onChange={(e) =>
                    onUpdateSettings({ paddingBottom: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Left</label>
                <input
                  type="number"
                  min="0"
                  max="80"
                  value={s.paddingLeft ?? 24}
                  onChange={(e) => onUpdateSettings({ paddingLeft: parseInt(e.target.value, 10) || 0 })}
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Right</label>
                <input
                  type="number"
                  min="0"
                  max="80"
                  value={s.paddingRight ?? 24}
                  onChange={(e) =>
                    onUpdateSettings({ paddingRight: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <label className="text-[11px] text-gray-500 mb-1 block">
                Custom Section Background Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(s.backgroundColor as string) || "#ffffff"}
                  onChange={(e) => onUpdateSettings({ backgroundColor: e.target.value })}
                  className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={(s.backgroundColor as string) || ""}
                  placeholder="Transparent / Inherit"
                  onChange={(e) => onUpdateSettings({ backgroundColor: e.target.value })}
                  className="w-full text-xs font-mono px-2 py-1.5 border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ─── PRODUCT BLOCK ─────────────────────────────────────────── */}
            {section.type === "product" && (
              <div className="space-y-4">
                {/* Catalog Picker Header */}
                <div className="p-3 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 rounded-xl border border-indigo-100/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-indigo-600" />
                      Catalog Product
                    </span>
                    <button
                      type="button"
                      onClick={() => setProductPickerOpen(true)}
                      className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 hover:underline flex items-center gap-1"
                    >
                      Change Product
                    </button>
                  </div>

                  {(c as ProductBlockContent).productSnapshot?.name ? (
                    <div className="flex items-center gap-2.5 bg-white p-2 rounded-lg border border-indigo-50 shadow-xs">
                      <div className="w-11 h-11 bg-gray-50 border border-gray-200 rounded-md relative overflow-hidden flex-shrink-0">
                        {(c as ProductBlockContent).productSnapshot.image ? (
                          <img
                            src={(c as ProductBlockContent).productSnapshot.image}
                            alt={(c as ProductBlockContent).productSnapshot.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ShoppingBag className="w-5 h-5 text-gray-400 m-auto" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {(c as ProductBlockContent).productSnapshot.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-indigo-600 font-bold font-mono">
                            {(c as ProductBlockContent).productSnapshot.currency || "Rs"}{" "}
                            {(c as ProductBlockContent).productSnapshot.salePrice || (c as ProductBlockContent).productSnapshot.price}
                          </span>
                          {(c as ProductBlockContent).productSnapshot.salePrice && (
                            <span className="text-[11px] text-gray-400 line-through font-mono">
                              {(c as ProductBlockContent).productSnapshot.currency || "Rs"} {(c as ProductBlockContent).productSnapshot.price}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setProductPickerOpen(true)}
                      className="w-full py-3 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-lg text-center bg-white/60 hover:bg-white text-indigo-600 font-medium transition"
                    >
                      + Select a product from store
                    </button>
                  )}
                </div>

                {/* 16 Visual Layout Cards Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-gray-800 block text-xs">
                      Product Card Layout (16 Designs)
                    </label>
                    <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-mono">
                      {(c.layout || "image-top").replace(/-/g, " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar border border-gray-200/80 rounded-lg p-1.5 bg-gray-50/50">
                    {PRODUCT_LAYOUT_PRESETS.map((item) => {
                      const active = (c.layout || "image-top") === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onUpdateContent({ layout: item.id as ProductLayout })}
                          className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                            active
                              ? "border-indigo-600 bg-indigo-50/90 ring-1 ring-indigo-500 shadow-xs"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className="text-[11px] font-bold text-gray-900 truncate">
                              {item.label}
                            </span>
                            <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${item.color}`}>
                              {item.badge}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 truncate block">
                            {item.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Badges, Ratings & Social Proof */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="text-[11px] font-semibold text-gray-700 block uppercase tracking-wider">
                    Badges & Social Proof
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Badge Text</label>
                      <input
                        type="text"
                        value={c.badgeText || ""}
                        placeholder="e.g. BESTSELLER, 40% OFF"
                        onChange={(e) => onUpdateContent({ badgeText: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Stock Status</label>
                      <select
                        value={c.stockStatus || "in-stock"}
                        onChange={(e) => onUpdateContent({ stockStatus: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded bg-white"
                      >
                        <option value="in-stock">In Stock (Normal)</option>
                        <option value="low-stock">🔥 Low Stock (Urgent)</option>
                        <option value="sold-out">❌ Sold Out / Waitlist</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Star Rating</label>
                      <select
                        value={c.rating ?? 5.0}
                        onChange={(e) => onUpdateContent({ rating: parseFloat(e.target.value) })}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded bg-white"
                      >
                        <option value={5.0}>⭐⭐⭐⭐⭐ 5.0</option>
                        <option value={4.9}>⭐⭐⭐⭐⭐ 4.9</option>
                        <option value={4.8}>⭐⭐⭐⭐⭐ 4.8</option>
                        <option value={4.7}>⭐⭐⭐⭐ 4.7</option>
                        <option value={4.5}>⭐⭐⭐⭐ 4.5</option>
                        <option value={0}>Hidden / No rating</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Reviews Count</label>
                      <input
                        type="number"
                        min="0"
                        value={c.reviewsCount ?? 48}
                        onChange={(e) => onUpdateContent({ reviewsCount: parseInt(e.target.value, 10) || 0 })}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Image Aspect Ratio</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: "square", label: "Square (1:1)" },
                        { id: "portrait", label: "Portrait (3:4)" },
                        { id: "wide", label: "Wide (16:9)" },
                      ].map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => onUpdateContent({ aspectRatio: r.id })}
                          className={`py-1 px-2 text-[11px] rounded border text-center font-medium transition ${
                            (c.aspectRatio || "square") === r.id
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Styling Controls */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="text-[11px] font-semibold text-gray-700 block uppercase tracking-wider">
                    Card Styling & Colors
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-0.5 block">Card Background</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={c.cardBackground || "#ffffff"}
                          onChange={(e) => onUpdateContent({ cardBackground: e.target.value })}
                          className="w-7 h-7 rounded border border-gray-300 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={c.cardBackground || ""}
                          placeholder="#ffffff"
                          onChange={(e) => onUpdateContent({ cardBackground: e.target.value })}
                          className="w-full text-[11px] font-mono px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-500 mb-0.5 block">Corner Radius</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="32"
                          value={c.cardBorderRadius ?? 12}
                          onChange={(e) => onUpdateContent({ cardBorderRadius: parseInt(e.target.value, 10) || 0 })}
                          className="w-full accent-indigo-600"
                        />
                        <span className="text-[10px] font-mono text-gray-500 w-7 text-right">
                          {c.cardBorderRadius ?? 12}px
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-0.5 block">CTA Background</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={c.ctaBackgroundColor || "#4f46e5"}
                          onChange={(e) => onUpdateContent({ ctaBackgroundColor: e.target.value })}
                          className="w-7 h-7 rounded border border-gray-300 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={c.ctaBackgroundColor || ""}
                          placeholder="#4f46e5"
                          onChange={(e) => onUpdateContent({ ctaBackgroundColor: e.target.value })}
                          className="w-full text-[11px] font-mono px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-500 mb-0.5 block">CTA Text Color</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={c.ctaTextColor || "#ffffff"}
                          onChange={(e) => onUpdateContent({ ctaTextColor: e.target.value })}
                          className="w-7 h-7 rounded border border-gray-300 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={c.ctaTextColor || ""}
                          placeholder="#ffffff"
                          onChange={(e) => onUpdateContent({ ctaTextColor: e.target.value })}
                          className="w-full text-[11px] font-mono px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visibility Toggles */}
                <div className="space-y-1.5 pt-2 border-t border-gray-100">
                  <label className="text-[11px] font-semibold text-gray-700 block uppercase tracking-wider">
                    Element Visibility
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {[
                      { key: "showImage", label: "Show Image" },
                      { key: "showTitle", label: "Show Title" },
                      { key: "showDescription", label: "Description" },
                      { key: "showPrice", label: "Show Price" },
                      { key: "showSalePrice", label: "Sale Price" },
                      { key: "showDiscount", label: "Discount %" },
                      { key: "showCta", label: "CTA Button" },
                    ].map((toggle) => (
                      <label key={toggle.key} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(c[toggle.key] ?? true)}
                          onChange={(e) => onUpdateContent({ [toggle.key]: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-gray-700">{toggle.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Override Fields & AI Polish */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-gray-700 block uppercase tracking-wider">
                      Content Overrides
                    </label>
                    <button
                      type="button"
                      onClick={() => handleQuickAiPolish("description", c.productSnapshot?.description || c.displayTitle)}
                      disabled={aiPolishState === "polishing"}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-600 animate-pulse" />
                      {aiPolishState === "polishing" ? "Polishing..." : "✨ AI Polish Copy"}
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-500 mb-0.5 block">Custom Title</label>
                    <input
                      type="text"
                      value={c.displayTitle || ""}
                      placeholder={c.productSnapshot?.name || "Product title"}
                      onChange={(e) => onUpdateContent({ displayTitle: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-500 mb-0.5 block">CTA Button Label</label>
                    <input
                      type="text"
                      value={c.ctaText || "Shop Now"}
                      onChange={(e) => onUpdateContent({ ctaText: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                    />
                  </div>

                  <LinkEditor
                    url={c.ctaUrl || `/products/${c.productSnapshot?.slug || ""}`}
                    linkType="PRODUCT_CTA"
                    label="Product Landing Link"
                    onUrlChange={(url) => onUpdateContent({ ctaUrl: url })}
                  />
                </div>

                <ProductPicker
                  open={productPickerOpen}
                  onOpenChange={setProductPickerOpen}
                  onSelectProduct={(productId, snapshot) => {
                    onUpdateContent({
                      productId,
                      productSnapshot: snapshot,
                      ctaUrl: `/products/${snapshot.slug}`,
                    });
                  }}
                  selectedProductId={(c as ProductBlockContent).productId}
                />
              </div>
            )}

            {/* ─── PRODUCT GRID BLOCK ────────────────────────────────────── */}
            {section.type === "product-grid" && (() => {
              const gridItems = ((c.items || c.products || []) as any[]);
              const isDefaultPlaceholder =
                gridItems.length > 0 &&
                gridItems.some(
                  (item: any) =>
                    item?.id === "grid_1" ||
                    item?.id === "grid-item-1" ||
                    item?.productId === "prod_1" ||
                    item?.productId === "sample-1" ||
                    item?.slug === "signature-minimal-sneaker" ||
                    item?.name === "Signature Minimal Sneaker"
                );

              return (
                <div className="space-y-4">
                  <div className="p-3 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 rounded-xl border border-purple-100/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Grid className="w-4 h-4 text-purple-600" />
                        Multi-Product Catalog Grid
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full">
                          {gridItems.length} Items
                        </span>
                        {isDefaultPlaceholder && (
                          <span className="text-[9px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            Sample Items
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Showcase multiple trending items or curated product collections in a clean responsive grid.
                    </p>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 mb-1 block">Grid Section Title</label>
                    <input
                      type="text"
                      value={c.title || ""}
                      onChange={(e) => onUpdateContent({ title: e.target.value })}
                      placeholder="e.g. Trending This Week"
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Grid Subtitle</label>
                    <input
                      type="text"
                      value={c.subtitle || ""}
                      onChange={(e) => onUpdateContent({ subtitle: e.target.value })}
                      placeholder="Handpicked favorites with limited availability"
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Layout Columns</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onUpdateContent({ columns: 2 })}
                        className={`py-1.5 px-3 rounded-lg border text-center font-medium transition ${
                          (c.columns ?? 2) === 2
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold"
                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        2 Columns (Standard)
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateContent({ columns: 3 })}
                        className={`py-1.5 px-3 rounded-lg border text-center font-medium transition ${
                          c.columns === 3
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold"
                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        3 Columns (Compact)
                      </button>
                    </div>
                  </div>

                  {/* Products in Grid */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                        Grid Items ({gridItems.length})
                      </label>
                      <div className="flex items-center gap-1.5">
                        {gridItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onUpdateContent({ items: [], products: [] })}
                            className="text-[10px] text-red-600 hover:text-red-800 font-medium hover:underline"
                          >
                            Clear All
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setGridPickerOpen(true)}
                          className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Store Product
                        </button>
                      </div>
                    </div>

                    {isDefaultPlaceholder && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center justify-between">
                        <span>Currently showing default template products.</span>
                        <button
                          type="button"
                          onClick={() => setGridPickerOpen(true)}
                          className="font-bold text-indigo-700 underline ml-2"
                        >
                          Replace with your store items
                        </button>
                      </div>
                    )}

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {gridItems.map((item: any, idx: number) => (
                        <div
                          key={item.id || idx}
                          className="p-2 bg-white border border-gray-200 rounded-lg flex items-center justify-between gap-2 shadow-2xs hover:border-gray-300"
                        >
                          <div className="w-10 h-10 bg-gray-100 border border-gray-200 rounded relative overflow-hidden flex-shrink-0">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <ShoppingBag className="w-4 h-4 text-gray-400 m-auto" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-indigo-600 font-bold font-mono">
                                {item.currency || "Rs"} {Number(item.salePrice || item.price).toLocaleString()}
                              </span>
                              {(item.badge || item.badgeText) && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-semibold">
                                  {item.badge || item.badgeText}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...gridItems];
                              updated.splice(idx, 1);
                              onUpdateContent({ items: updated, products: updated });
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <ProductPicker
                    open={gridPickerOpen}
                    onOpenChange={setGridPickerOpen}
                    onSelectProduct={(productId, snapshot) => {
                      const newItem = {
                        id: productId || `grid-${Date.now()}`,
                        productId,
                        name: snapshot.name,
                        slug: snapshot.slug,
                        price: snapshot.price,
                        salePrice: snapshot.salePrice,
                        image: snapshot.image,
                        currency: snapshot.currency || "Rs",
                        badge: snapshot.salePrice ? "Sale" : "Hot",
                        badgeText: snapshot.salePrice ? "Sale" : "Hot",
                        ctaText: "Shop",
                        ctaUrl: `/products/${snapshot.slug}`,
                      };
                      const current = ((c.items || c.products || []) as any[]);
                      const isPlaceholder =
                        current.length > 0 &&
                        (current[0]?.id === "grid_1" ||
                         current[0]?.id === "grid-item-1" ||
                         current[0]?.productId === "prod_1" ||
                         current[0]?.productId === "sample-1" ||
                         current[0]?.slug === "signature-minimal-sneaker" ||
                         current[0]?.name === "Signature Minimal Sneaker");
                      const updated = isPlaceholder ? [newItem] : [...current, newItem];
                      onUpdateContent({ items: updated, products: updated });
                    }}
                  />
                </div>
              );
            })()}

            {/* ─── COUNTDOWN TIMER BLOCK ─────────────────────────────────── */}
            {section.type === "countdown" && (
              <div className="space-y-4">
                <div className="p-3 bg-gradient-to-r from-rose-50/60 to-orange-50/60 rounded-xl border border-rose-100/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-rose-600" />
                      Urgency Countdown Timer
                    </span>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3 text-rose-600" />
                      High Conversion
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-700/80">
                    Triggers urgency and FOMO by showing live remaining hours, minutes, and seconds.
                  </p>
                </div>

                {/* Quick Expiry Buttons */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-700 mb-1.5 block">
                    Quick Expiry Presets
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "+12 Hours", hours: 12 },
                      { label: "+24 Hours", hours: 24 },
                      { label: "+48 Hours", hours: 48 },
                      { label: "Tonight 12am", midnight: true },
                      { label: "This Weekend", days: 3 },
                      { label: "+7 Days", days: 7 },
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          if (p.midnight) {
                            now.setHours(23, 59, 59, 999);
                          } else if (p.hours) {
                            now.setTime(now.getTime() + p.hours * 60 * 60 * 1000);
                          } else if (p.days) {
                            now.setDate(now.getDate() + p.days);
                          }
                          onUpdateContent({ targetDate: now.toISOString() });
                        }}
                        className="py-1 px-2 text-[11px] rounded border border-gray-200 bg-white hover:bg-rose-50/50 hover:border-rose-200 text-gray-700 font-medium transition text-center"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Exact Target Date & Time</label>
                  <input
                    type="datetime-local"
                    value={c.targetDate ? new Date(c.targetDate).toISOString().slice(0, 16) : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        onUpdateContent({ targetDate: new Date(e.target.value).toISOString() });
                      }
                    }}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Headline / Badge</label>
                  <input
                    type="text"
                    value={c.headline || "FLASH CLEARANCE ENDS IN"}
                    onChange={(e) => onUpdateContent({ headline: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Subtitle Note</label>
                  <input
                    type="text"
                    value={c.subtitle || "Prices automatically increase when clock strikes zero"}
                    onChange={(e) => onUpdateContent({ subtitle: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Banner Background</label>
                    <input
                      type="color"
                      value={c.backgroundColor || "#881337"}
                      onChange={(e) => onUpdateContent({ backgroundColor: e.target.value })}
                      className="w-full h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Digit Box Background</label>
                    <input
                      type="color"
                      value={c.digitBgColor || "#4c0519"}
                      onChange={(e) => onUpdateContent({ digitBgColor: e.target.value })}
                      className="w-full h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">CTA Button Text</label>
                    <input
                      type="text"
                      value={c.ctaText || "Claim Discount Before It's Gone"}
                      onChange={(e) => onUpdateContent({ ctaText: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">CTA URL</label>
                    <input
                      type="text"
                      value={c.ctaUrl || "/products"}
                      onChange={(e) => onUpdateContent({ ctaUrl: e.target.value })}
                      className="w-full text-xs font-mono px-2.5 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── TESTIMONIAL BLOCK ─────────────────────────────────────── */}
            {section.type === "testimonial" && (
              <div className="space-y-4">
                <div className="p-3 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 rounded-xl border border-amber-100/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Quote className="w-4 h-4 text-amber-600" />
                      Social Proof & Testimonial
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      5-Star Trust
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/80">
                    Real customer quotes and ratings boost conversion rates by up to 34%.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-gray-700">Customer Quote</label>
                    <button
                      type="button"
                      onClick={() => handleQuickAiPolish("quote", c.quote)}
                      className="text-[10px] text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      AI Polish
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={c.quote || ""}
                    onChange={(e) => onUpdateContent({ quote: e.target.value })}
                    placeholder="Quote here..."
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Customer Name</label>
                    <input
                      type="text"
                      value={c.authorName || ""}
                      onChange={(e) => onUpdateContent({ authorName: e.target.value })}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Title / Verified Status</label>
                    <input
                      type="text"
                      value={c.authorTitle || ""}
                      onChange={(e) => onUpdateContent({ authorTitle: e.target.value })}
                      placeholder="Verified Buyer • New York"
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Customer Avatar URL (Optional)</label>
                  <input
                    type="text"
                    value={c.avatarUrl || ""}
                    onChange={(e) => onUpdateContent({ avatarUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full text-xs font-mono px-2.5 py-1.5 border border-gray-300 rounded"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Star Rating</label>
                    <select
                      value={c.rating ?? 5}
                      onChange={(e) => onUpdateContent({ rating: parseInt(e.target.value, 10) || 5 })}
                      className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded bg-white"
                    >
                      <option value={5}>5 Stars</option>
                      <option value={4}>4 Stars</option>
                      <option value={3}>3 Stars</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Card Bg</label>
                    <input
                      type="color"
                      value={c.cardBackground || "#fefce8"}
                      onChange={(e) => onUpdateContent({ cardBackground: e.target.value })}
                      className="w-full h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Accent Color</label>
                    <input
                      type="color"
                      value={c.accentColor || "#ca8a04"}
                      onChange={(e) => onUpdateContent({ accentColor: e.target.value })}
                      className="w-full h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── SOCIAL LINKS BLOCK ────────────────────────────────────── */}
            {section.type === "social-links" && (
              <div className="space-y-4">
                <div className="p-3 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 rounded-xl border border-blue-100/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Share2 className="w-4 h-4 text-blue-600" />
                      Social Channels & Community
                    </span>
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                      {(c.links?.length || 0)} Channels
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800/80">
                    Cross-promote your Instagram, TikTok, Facebook, and WhatsApp channels directly in the email.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Headline / Notice</label>
                  <input
                    type="text"
                    value={c.headline || ""}
                    onChange={(e) => onUpdateContent({ headline: e.target.value })}
                    placeholder="Follow us & join our community"
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Icon Style</label>
                    <select
                      value={c.style || "filled"}
                      onChange={(e) => onUpdateContent({ style: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded bg-white"
                    >
                      <option value="filled">Filled Badges</option>
                      <option value="outlined">Outlined Badges</option>
                      <option value="minimal">Minimal Clean</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Alignment</label>
                    <select
                      value={c.alignment || "center"}
                      onChange={(e) => onUpdateContent({ alignment: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded bg-white"
                    >
                      <option value="center">Center</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>

                {/* Channels Manager */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                      Connected Channels
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newLink = { platform: "instagram" as SocialPlatform, url: "https://instagram.com" };
                        onUpdateContent({ links: [...(c.links || []), newLink] });
                      }}
                      className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Link
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {(c.links || []).map((link: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2 bg-white border border-gray-200 rounded-lg flex items-center gap-2"
                      >
                        <select
                          value={link.platform}
                          onChange={(e) => {
                            const updated = [...(c.links || [])];
                            updated[idx] = { ...updated[idx], platform: e.target.value as SocialPlatform };
                            onUpdateContent({ links: updated });
                          }}
                          className="text-xs px-2 py-1 border border-gray-200 rounded bg-gray-50 font-medium"
                        >
                          <option value="instagram">Instagram</option>
                          <option value="facebook">Facebook</option>
                          <option value="twitter">X / Twitter</option>
                          <option value="tiktok">TikTok</option>
                          <option value="youtube">YouTube</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="website">Website</option>
                        </select>
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) => {
                            const updated = [...(c.links || [])];
                            updated[idx] = { ...updated[idx], url: e.target.value };
                            onUpdateContent({ links: updated });
                          }}
                          className="w-full text-xs font-mono px-2 py-1 border border-gray-200 rounded"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...(c.links || [])];
                            updated.splice(idx, 1);
                            onUpdateContent({ links: updated });
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TEXT BLOCK ────────────────────────────────────────────── */}
            {section.type === "text" && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-gray-700">Text Content</label>
                    <div className="flex items-center gap-1">
                      {TOKEN_SUGGESTIONS.map((t) => (
                        <button
                          key={t.token}
                          type="button"
                          onClick={() =>
                            onUpdateContent({
                              text: `${(c as TextBlockContent).text || ""}${t.token}`,
                            })
                          }
                          className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded font-mono"
                          title={`Insert ${t.label}`}
                        >
                          {t.token}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    value={(c as TextBlockContent).text || ""}
                    onChange={(e) => onUpdateContent({ text: e.target.value })}
                    placeholder="Enter your message here... You can use tokens like {{firstName}}"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Heading Tag</label>
                    <select
                      value={(c as TextBlockContent).headingLevel || "p"}
                      onChange={(e) => onUpdateContent({ headingLevel: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded bg-white"
                    >
                      <option value="p">Paragraph (p)</option>
                      <option value="h1">Heading 1 (h1)</option>
                      <option value="h2">Heading 2 (h2)</option>
                      <option value="h3">Heading 3 (h3)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Text Alignment</label>
                    <select
                      value={(c as TextBlockContent).textAlign || "left"}
                      onChange={(e) => onUpdateContent({ textAlign: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded bg-white"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Font Size (px)</label>
                    <input
                      type="number"
                      min="10"
                      max="48"
                      value={(c as TextBlockContent).fontSize || 15}
                      onChange={(e) =>
                        onUpdateContent({ fontSize: parseInt(e.target.value, 10) || 15 })
                      }
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Font Weight</label>
                    <select
                      value={(c as TextBlockContent).fontWeight || 400}
                      onChange={(e) =>
                        onUpdateContent({ fontWeight: parseInt(e.target.value, 10) || 400 })
                      }
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded bg-white"
                    >
                      <option value={400}>Regular (400)</option>
                      <option value={500}>Medium (500)</option>
                      <option value={600}>Semi-Bold (600)</option>
                      <option value={700}>Bold (700)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Custom Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(c as TextBlockContent).textColor || "#374151"}
                      onChange={(e) => onUpdateContent({ textColor: e.target.value })}
                      className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={(c as TextBlockContent).textColor || ""}
                      placeholder="Default style"
                      onChange={(e) => onUpdateContent({ textColor: e.target.value })}
                      className="w-full text-xs font-mono px-2 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── BUTTON BLOCK ──────────────────────────────────────────── */}
            {section.type === "button" && (
              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">Button Text</label>
                  <input
                    type="text"
                    value={(c as ButtonBlockContent).text || ""}
                    onChange={(e) => onUpdateContent({ text: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <LinkEditor
                  url={(c as ButtonBlockContent).url || "/products"}
                  linkType="PRIMARY_BUTTON"
                  label="Button Destination"
                  onUrlChange={(url) => onUpdateContent({ url })}
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Button Color</label>
                    <input
                      type="color"
                      value={(c as ButtonBlockContent).backgroundColor || "#4f46e5"}
                      onChange={(e) => onUpdateContent({ backgroundColor: e.target.value })}
                      className="w-full h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Text Color</label>
                    <input
                      type="color"
                      value={(c as ButtonBlockContent).textColor || "#ffffff"}
                      onChange={(e) => onUpdateContent({ textColor: e.target.value })}
                      className="w-full h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Border Radius</label>
                    <input
                      type="number"
                      min="0"
                      max="32"
                      value={(c as ButtonBlockContent).borderRadius ?? 8}
                      onChange={(e) =>
                        onUpdateContent({ borderRadius: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Alignment</label>
                    <select
                      value={(c as ButtonBlockContent).alignment || "center"}
                      onChange={(e) => onUpdateContent({ alignment: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded bg-white"
                    >
                      <option value="center">Center</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ─── HERO BLOCK ────────────────────────────────────────────── */}
            {section.type === "hero" && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-gray-700">Hero Title</label>
                    <button
                      type="button"
                      onClick={() => handleQuickAiPolish("title", (c as HeroBlockContent).title)}
                      className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      AI Polish
                    </button>
                  </div>
                  <input
                    type="text"
                    value={(c as HeroBlockContent).title || ""}
                    onChange={(e) => onUpdateContent({ title: e.target.value })}
                    placeholder="Big Headline Here"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Subtitle</label>
                  <input
                    type="text"
                    value={(c as HeroBlockContent).subtitle || ""}
                    onChange={(e) => onUpdateContent({ subtitle: e.target.value })}
                    placeholder="Supporting headline"
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Paragraph Body</label>
                  <textarea
                    rows={3}
                    value={(c as HeroBlockContent).paragraph || ""}
                    onChange={(e) => onUpdateContent({ paragraph: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Background Image URL</label>
                  <input
                    type="text"
                    value={(c as HeroBlockContent).backgroundImage || ""}
                    onChange={(e) => onUpdateContent({ backgroundImage: e.target.value })}
                    placeholder="https://..."
                    className="w-full text-xs font-mono px-2.5 py-1.5 border border-gray-300 rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">CTA Button Text</label>
                    <input
                      type="text"
                      value={c.ctaText || ""}
                      onChange={(e) => onUpdateContent({ ctaText: e.target.value })}
                      placeholder="Explore Now"
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Alignment</label>
                    <select
                      value={c.alignment || "center"}
                      onChange={(e) => onUpdateContent({ alignment: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded bg-white"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>

                <LinkEditor
                  url={c.ctaUrl || "/products"}
                  linkType="HERO_BUTTON"
                  label="Hero Button Target"
                  onUrlChange={(ctaUrl) => onUpdateContent({ ctaUrl })}
                />
              </div>
            )}

            {/* ─── IMAGE BLOCK ───────────────────────────────────────────── */}
            {section.type === "image" && (
              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">Image Source URL</label>
                  <input
                    type="text"
                    value={(c as ImageBlockContent).src || ""}
                    onChange={(e) => onUpdateContent({ src: e.target.value })}
                    placeholder="https://.../image.png"
                    className="w-full text-xs font-mono px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Alt Text (Accessibility)</label>
                  <input
                    type="text"
                    value={(c as ImageBlockContent).alt || ""}
                    onChange={(e) => onUpdateContent({ alt: e.target.value })}
                    placeholder="Description of image"
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                  />
                </div>

                <LinkEditor
                  url={c.ctaUrl || c.linkUrl || ""}
                  linkType="IMAGE_LINK"
                  label="Clickable Link (Optional)"
                  onUrlChange={(url) => onUpdateContent({ ctaUrl: url, linkUrl: url })}
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Width</label>
                    <select
                      value={c.width || "full"}
                      onChange={(e) => onUpdateContent({ width: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded bg-white"
                    >
                      <option value="full">100% Full Width</option>
                      <option value="auto">Natural Size</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Border Radius</label>
                    <input
                      type="number"
                      min="0"
                      max="32"
                      value={c.borderRadius ?? 8}
                      onChange={(e) =>
                        onUpdateContent({ borderRadius: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── COUPON BLOCK ──────────────────────────────────────────── */}
            {section.type === "coupon" && (
              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">Promo Code</label>
                  <input
                    type="text"
                    value={c.code || "SAVE20"}
                    onChange={(e) => onUpdateContent({ code: e.target.value.toUpperCase() })}
                    className="w-full text-xs font-mono font-bold tracking-widest px-3 py-2 border border-gray-300 rounded uppercase"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Title / Headline</label>
                  <input
                    type="text"
                    value={c.title || "Special Offer"}
                    onChange={(e) => onUpdateContent({ title: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Description</label>
                  <input
                    type="text"
                    value={c.description || ""}
                    placeholder="Use this code at checkout to get 20% off"
                    onChange={(e) => onUpdateContent({ description: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">CTA Label</label>
                    <input
                      type="text"
                      value={c.ctaText || "Apply Code"}
                      onChange={(e) => onUpdateContent({ ctaText: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Discount Amount</label>
                    <input
                      type="text"
                      value={c.discountAmount || "20% OFF"}
                      onChange={(e) => onUpdateContent({ discountAmount: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <LinkEditor
                  url={c.ctaUrl || "/products"}
                  linkType="COUPON_CTA"
                  label="Coupon CTA Destination"
                  onUrlChange={(ctaUrl) => onUpdateContent({ ctaUrl })}
                />
              </div>
            )}

            {/* ─── BANNER BLOCK ──────────────────────────────────────────── */}
            {section.type === "banner" && (
              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">Banner Notice</label>
                  <textarea
                    rows={2}
                    value={c.text || ""}
                    onChange={(e) => onUpdateContent({ text: e.target.value })}
                    placeholder="Free Shipping on all orders above Rs 2,000!"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Background</label>
                    <input
                      type="color"
                      value={c.backgroundColor || "#4f46e5"}
                      onChange={(e) => onUpdateContent({ backgroundColor: e.target.value })}
                      className="w-full h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Text Color</label>
                    <input
                      type="color"
                      value={c.textColor || "#ffffff"}
                      onChange={(e) => onUpdateContent({ textColor: e.target.value })}
                      className="w-full h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                  </div>
                </div>

                <LinkEditor
                  url={c.ctaUrl || c.linkUrl || ""}
                  linkType="BANNER_LINK"
                  label="Banner Click Target (Optional)"
                  onUrlChange={(ctaUrl) => onUpdateContent({ ctaUrl })}
                />
              </div>
            )}

            {/* ─── SPACER BLOCK ──────────────────────────────────────────── */}
            {section.type === "spacer" && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold text-gray-700">
                  <span>Spacer Height</span>
                  <span className="font-mono">{c.height ?? 24}px</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="120"
                  step="4"
                  value={c.height ?? 24}
                  onChange={(e) =>
                    onUpdateContent({ height: parseInt(e.target.value, 10) || 24 })
                  }
                  className="w-full accent-indigo-600"
                />
              </div>
            )}

            {/* ─── DIVIDER BLOCK ─────────────────────────────────────────── */}
            {section.type === "divider" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Line Style</label>
                    <select
                      value={c.style || "solid"}
                      onChange={(e) => onUpdateContent({ style: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded bg-white"
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Thickness (px)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={c.thickness ?? 1}
                      onChange={(e) =>
                        onUpdateContent({ thickness: parseInt(e.target.value, 10) || 1 })
                      }
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Divider Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={c.color || "#e5e7eb"}
                      onChange={(e) => onUpdateContent({ color: e.target.value })}
                      className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={c.color || "#e5e7eb"}
                      onChange={(e) => onUpdateContent({ color: e.target.value })}
                      className="w-full text-xs font-mono px-2 py-1.5 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── FOOTER BLOCK ──────────────────────────────────────────── */}
            {section.type === "footer" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Company Name</label>
                  <input
                    type="text"
                    value={c.companyName || "Findora"}
                    onChange={(e) => onUpdateContent({ companyName: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Physical Address</label>
                  <input
                    type="text"
                    value={c.address || ""}
                    placeholder="e.g. 123 Commercial Ave, Lahore, Pakistan"
                    onChange={(e) => onUpdateContent({ address: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Footer Copy / Notice</label>
                  <input
                    type="text"
                    value={c.text || ""}
                    placeholder="e.g. You are receiving this because you subscribed."
                    onChange={(e) => onUpdateContent({ text: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
