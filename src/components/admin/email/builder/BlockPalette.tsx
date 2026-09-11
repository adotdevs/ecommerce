"use client";

import { useState } from "react";
import {
  Type,
  SquareSquare,
  Image as ImageIcon,
  ShoppingBag,
  Sparkles,
  MoveVertical,
  Minus,
  Ticket,
  AlertCircle,
  Columns,
  FileText,
  Plus,
  LayoutGrid,
  Clock,
  Share2,
  Heart,
  Search,
  BookTemplate,
  Check,
  Layers,
} from "lucide-react";
import type { BlockType } from "@/lib/email/document-schema";
import { STARTER_TEMPLATES, type StarterTemplate } from "@/lib/email/document-defaults";

interface BlockPaletteProps {
  onAddBlock: (type: BlockType) => void;
  onOpenProductPicker: () => void;
  onSelectTemplate?: (template: StarterTemplate) => void;
  onOpenTemplateModal?: () => void;
}

interface PaletteItem {
  type: BlockType;
  label: string;
  description: string;
  category: "content" | "ecommerce" | "marketing";
  icon: React.ComponentType<{ className?: string }>;
  isSpecialAction?: boolean;
  badge?: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  // E-commerce
  {
    type: "product",
    label: "Product Card",
    description: "Catalog item with price & CTA",
    category: "ecommerce",
    icon: ShoppingBag,
    isSpecialAction: true,
    badge: "Popular",
  },
  {
    type: "product-grid",
    label: "Product Grid",
    description: "2 or 3-column responsive catalog",
    category: "ecommerce",
    icon: LayoutGrid,
    badge: "New",
  },
  {
    type: "countdown",
    label: "Countdown Timer",
    description: "Urgency banner with live timer boxes",
    category: "ecommerce",
    icon: Clock,
    badge: "Hot",
  },
  {
    type: "coupon",
    label: "Coupon Code Box",
    description: "Promo code with copy badge",
    category: "ecommerce",
    icon: Ticket,
  },
  {
    type: "banner",
    label: "Notice Banner",
    description: "Announcement bar & free shipping",
    category: "ecommerce",
    icon: AlertCircle,
  },

  // Content
  {
    type: "hero",
    label: "Hero Section",
    description: "Catchy headline, image & button",
    category: "content",
    icon: Sparkles,
  },
  {
    type: "text",
    label: "Text & Heading",
    description: "Headings, body & tokens",
    category: "content",
    icon: Type,
  },
  {
    type: "button",
    label: "CTA Button",
    description: "High-converting action link",
    category: "content",
    icon: SquareSquare,
  },
  {
    type: "image",
    label: "Image / Banner",
    description: "Banner graphic or photo",
    category: "content",
    icon: ImageIcon,
  },
  {
    type: "columns",
    label: "Multi-Column",
    description: "2 or 3 side-by-side columns",
    category: "content",
    icon: Columns,
  },

  // Marketing & Social
  {
    type: "testimonial",
    label: "Customer Review",
    description: "Star rating & social proof quote",
    category: "marketing",
    icon: Heart,
    badge: "Social",
  },
  {
    type: "social-links",
    label: "Social Follow",
    description: "Instagram, TikTok, WhatsApp & web",
    category: "marketing",
    icon: Share2,
  },
  {
    type: "divider",
    label: "Divider Line",
    description: "Clean visual separator",
    category: "marketing",
    icon: Minus,
  },
  {
    type: "spacer",
    label: "Spacer",
    description: "Custom whitespace block",
    category: "marketing",
    icon: MoveVertical,
  },
  {
    type: "footer",
    label: "Footer Block",
    description: "Unsubscribe & store info",
    category: "marketing",
    icon: FileText,
  },
];

export function BlockPalette({
  onAddBlock,
  onOpenProductPicker,
  onSelectTemplate,
  onOpenTemplateModal,
}: BlockPaletteProps) {
  const [activeTab, setActiveTab] = useState<"blocks" | "templates">("blocks");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);

  const handleClick = (item: PaletteItem) => {
    if (item.type === "product") {
      onOpenProductPicker();
    } else {
      onAddBlock(item.type);
    }
  };

  const handleApplyTemplate = (tpl: StarterTemplate) => {
    onSelectTemplate?.(tpl);
    setAppliedTemplateId(tpl.id);
    setTimeout(() => setAppliedTemplateId(null), 2000);
  };

  const filteredBlocks = PALETTE_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden flex-shrink-0">
      {/* Header & Tabs */}
      <div className="p-3 border-b border-gray-200 bg-gray-50/70">
        <div className="flex bg-gray-200/80 p-0.5 rounded-lg text-xs font-semibold mb-2.5">
          <button
            type="button"
            onClick={() => setActiveTab("blocks")}
            className={`flex-1 py-1.5 rounded-md transition text-center ${
              activeTab === "blocks"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Blocks Library
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`flex-1 py-1.5 rounded-md transition text-center flex items-center justify-center gap-1 ${
              activeTab === "templates"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <BookTemplate className="w-3.5 h-3.5" />
            Templates
          </button>
        </div>

        {activeTab === "blocks" && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search blocks..."
              className="w-full text-xs pl-8 pr-2.5 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
        {activeTab === "blocks" ? (
          <>
            {/* Category Groups */}
            {["ecommerce", "content", "marketing"].map((cat) => {
              const categoryItems = filteredBlocks.filter((b) => b.category === cat);
              if (categoryItems.length === 0) return null;

              const categoryTitle =
                cat === "ecommerce"
                  ? "E-Commerce & Offers"
                  : cat === "content"
                  ? "Content & Layout"
                  : "Marketing & Trust";

              return (
                <div key={cat} className="space-y-1">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 px-2 block mb-1.5">
                    {categoryTitle}
                  </span>
                  {categoryItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleClick(item)}
                        className="w-full text-left p-2.5 rounded-xl border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition group flex items-start gap-2.5 bg-white shadow-xs"
                      >
                        <div className="p-2 rounded-lg bg-gray-50 text-gray-700 group-hover:bg-indigo-600 group-hover:text-white transition flex-shrink-0 shadow-xs">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 transition truncate">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.2 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">
                            {item.description}
                          </p>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-600 transition opacity-0 group-hover:opacity-100 mt-1 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </>
        ) : (
          /* Templates Gallery */
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-bold text-gray-900">Pre-Built Layouts</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Click any template to apply a complete email structure.
              </p>
            </div>

            {onOpenTemplateModal && (
              <button
                type="button"
                onClick={onOpenTemplateModal}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Browse All Templates</span>
              </button>
            )}

            <div className="space-y-2 pt-1">
              {STARTER_TEMPLATES.map((tpl) => {
                const isApplied = appliedTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    className="p-3 rounded-xl border border-gray-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/30 transition shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-900">{tpl.name}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className={`mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isApplied
                          ? "bg-emerald-600 text-white"
                          : "bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white"
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Applied!
                        </>
                      ) : (
                        "Load This Template"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
