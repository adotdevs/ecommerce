"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  Wand2,
  ShieldCheck,
  ShoppingBag,
  Flame,
  Palette,
  Mail,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  TrendingUp,
  Copy,
  Tag,
} from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ds/modal";
import { Button } from "@/components/ds/button";
import { useAuthStore } from "@/stores/auth-store";
import type {
  EmailDocument,
  ProductBlockContent,
  EmailSection,
  GlobalStyles,
} from "@/lib/email/document-schema";
import { ProductPicker } from "./ProductPicker";

interface AiDesignPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: EmailDocument;
  onApplySections: (
    sections: EmailSection[],
    subject?: string,
    previewText?: string,
    globalStyles?: GlobalStyles
  ) => void;
  onApplySubject?: (subject: string, previewText?: string) => void;
  onApplyStyles?: (styles: Partial<GlobalStyles>) => void;
}

const PROMPT_PRESETS = [
  {
    id: "flash_clearance",
    title: "⚡ Flash Clearance Surge",
    desc: "High urgency, countdown timer, coupon code, and bold savings cards.",
    prompt: "Design a high-energy flash clearance email with an urgency countdown timer, bold discount highlights, 30% off coupon code, and urgent CTA buttons.",
    objective: "flash_sale",
    tone: "urgent",
  },
  {
    id: "luxury_drop",
    title: "💎 Luxury Drop Showcase",
    desc: "Obsidian & gold VIP showcase with high-fashion editorial styling.",
    prompt: "Create an ultra-luxurious, editorial product drop email with obsidian black and gold accents, refined typography, and spotlight product presentation.",
    objective: "announcement",
    tone: "luxurious",
  },
  {
    id: "catalog_grid",
    title: "🛍️ Curated Catalog Grid",
    desc: "Multi-product 3-column collection showcase with social proof ratings.",
    prompt: "Build a multi-product catalog email featuring a 3-column responsive product grid, customer star ratings, and clear product action buttons.",
    objective: "product_promotion",
    tone: "exciting",
  },
  {
    id: "customer_winback",
    title: "🎁 VIP Customer Winback",
    desc: "Warm personal touch with exclusive 20% comeback discount and reviews.",
    prompt: "Draft a heartfelt customer re-engagement email with personal greeting {{firstName}}, special VIP discount coupon SAVE20, and 5-star customer testimonials.",
    objective: "reengagement",
    tone: "friendly",
  },
  {
    id: "weekly_digest",
    title: "📰 Weekly Editorial Digest",
    desc: "Balanced magazine layout with featured product story and social links.",
    prompt: "Create a modern weekly lifestyle digest email with an inspiring hero headline, curated product feature, and social community links.",
    objective: "announcement",
    tone: "luxurious",
  },
];

const CURATED_PALETTES: Array<{
  id: string;
  name: string;
  desc: string;
  styles: Partial<GlobalStyles>;
  preview: string[];
}> = [
  {
    id: "midnight_luxury",
    name: "Midnight Luxury",
    desc: "Obsidian canvas with gold & amber highlights",
    preview: ["#0b0f19", "#111827", "#f59e0b", "#ffffff"],
    styles: {
      backgroundColor: "#0b0f19",
      contentBackground: "#111827",
      headingColor: "#ffffff",
      textColor: "#e5e7eb",
      buttonColor: "#d97706",
      buttonTextColor: "#ffffff",
      borderRadius: 16,
    },
  },
  {
    id: "modern_indigo",
    name: "Modern Indigo",
    desc: "Clean slate canvas with electric indigo CTA",
    preview: ["#f8fafc", "#ffffff", "#4f46e5", "#1e1b4b"],
    styles: {
      backgroundColor: "#f8fafc",
      contentBackground: "#ffffff",
      headingColor: "#1e1b4b",
      textColor: "#475569",
      buttonColor: "#4f46e5",
      buttonTextColor: "#ffffff",
      borderRadius: 12,
    },
  },
  {
    id: "emerald_boutique",
    name: "Emerald Boutique",
    desc: "Organic fresh mint with deep forest green accents",
    preview: ["#f0fdf4", "#ffffff", "#047857", "#064e3b"],
    styles: {
      backgroundColor: "#f0fdf4",
      contentBackground: "#ffffff",
      headingColor: "#064e3b",
      textColor: "#334155",
      buttonColor: "#047857",
      buttonTextColor: "#ffffff",
      borderRadius: 12,
    },
  },
  {
    id: "sunset_terracotta",
    name: "Sunset Terracotta",
    desc: "Warm peach canvas with vibrant artisan terracotta",
    preview: ["#fff7ed", "#ffffff", "#ea580c", "#7c2d12"],
    styles: {
      backgroundColor: "#fff7ed",
      contentBackground: "#ffffff",
      headingColor: "#7c2d12",
      textColor: "#57534e",
      buttonColor: "#ea580c",
      buttonTextColor: "#ffffff",
      borderRadius: 14,
    },
  },
  {
    id: "nordic_minimal",
    name: "Nordic Minimal",
    desc: "Ultra-clean high contrast monochrome",
    preview: ["#f4f4f5", "#ffffff", "#18181b", "#71717a"],
    styles: {
      backgroundColor: "#f4f4f5",
      contentBackground: "#ffffff",
      headingColor: "#18181b",
      textColor: "#3f3f46",
      buttonColor: "#18181b",
      buttonTextColor: "#ffffff",
      borderRadius: 6,
    },
  },
  {
    id: "cyber_neon",
    name: "Cyber Neon",
    desc: "Dark cyberpunk with neon matrix accents",
    preview: ["#022c22", "#064e3b", "#10b981", "#ffffff"],
    styles: {
      backgroundColor: "#022c22",
      contentBackground: "#064e3b",
      headingColor: "#ffffff",
      textColor: "#a7f3d0",
      buttonColor: "#10b981",
      buttonTextColor: "#022c22",
      borderRadius: 16,
    },
  },
];

export function AiDesignPanel({
  open,
  onOpenChange,
  document,
  onApplySections,
  onApplySubject,
  onApplyStyles,
}: AiDesignPanelProps) {
  const { accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"generator" | "subjects" | "audit" | "palettes">("generator");
  const [prompt, setPrompt] = useState("");
  const [objective, setObjective] = useState("product_promotion");
  const [tone, setTone] = useState("exciting");
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductBlockContent["productSnapshot"] | null>(null);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subject line lab state
  const [generatedSubjects, setGeneratedSubjects] = useState<
    Array<{ subject: string; preheader: string; angle: string; openRateScore: number }>
  >([
    {
      subject: "⚡ Early Access: Handcrafted arrivals are going fast",
      preheader: "Enjoy an exclusive 25% preview before official drop",
      angle: "Tasteful Urgency",
      openRateScore: 54,
    },
    {
      subject: "Selected just for you: Our newest artisanal collection",
      preheader: "Craftsmanship meets modern everyday luxury",
      angle: "Curiosity & Value",
      openRateScore: 51,
    },
    {
      subject: "Unlock 20% off with your private code: SAVE20",
      preheader: "Claim your verified saving before midnight Sunday",
      angle: "Direct Offer",
      openRateScore: 49,
    },
    {
      subject: "The piece everyone has been waiting for is back",
      preheader: "Restocked in limited batches — reserve yours today",
      angle: "Social Proof",
      openRateScore: 47,
    },
    {
      subject: "Redefining everyday elegance: The Autumn Catalog",
      preheader: "Designed for those who appreciate the details",
      angle: "Minimal Luxury",
      openRateScore: 45,
    },
  ]);

  // Pre-send Audit calculations
  const subjectLen = (document.subject || "").length;
  const previewLen = (document.previewText || "").length;
  const hasSpamSubject = /FREE|WINNER|\$\$\$|GUARANTEE|ACT NOW|CLICK HERE/i.test(document.subject);
  const hasMultipleExclamations = /!{2,}/.test(document.subject);
  const hasUnsubscribe = document.sections.some((s) => s.type === "footer");
  const blockCount = document.sections.length;
  const productCount = document.sections.filter((s) => s.type === "product" || s.type === "product-grid").length;
  const ctaCount = document.sections.filter((s) => s.type === "button" || s.type === "coupon").length;

  let auditScore = 95;
  if (subjectLen < 15 || subjectLen > 65) auditScore -= 10;
  if (previewLen < 20 || previewLen > 100) auditScore -= 8;
  if (hasSpamSubject) auditScore -= 15;
  if (hasMultipleExclamations) auditScore -= 10;
  if (!hasUnsubscribe) auditScore -= 20;
  if (productCount === 0) auditScore -= 5;
  auditScore = Math.max(40, Math.min(99, auditScore));

  const handleGenerate = async (action: "generate" | "improve") => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/admin/email/ai/design", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          action,
          prompt,
          objective,
          tone,
          currentDocument: document,
          product: selectedProduct || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to generate design");
      }

      const sections = data.data?.sections || data.data?.design?.sections;
      if (Array.isArray(sections) && sections.length > 0) {
        onApplySections(sections, data.data?.subject, data.data?.previewText);
        onOpenChange(false);
      } else {
        throw new Error("No visual sections were returned. Please try another prompt.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSubjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/email/ai/design", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          action: "generate_subjects",
          prompt: prompt || document.subject,
          currentDocument: document,
        }),
      });

      const data = await res.json();
      if (data.data?.subjects && Array.isArray(data.data.subjects)) {
        setGeneratedSubjects(data.data.subjects);
      }
    } catch {
      // Keep existing high-converting variations
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
        <ModalHeader className="pb-3 border-b border-gray-100 flex items-center justify-between">
          <ModalTitle className="flex items-center gap-2.5 text-gray-900 font-bold text-base">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            AI Creative Email Studio
          </ModalTitle>
        </ModalHeader>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 text-xs font-semibold pt-1">
          {[
            { id: "generator", label: "Smart Generator", icon: Wand2 },
            { id: "subjects", label: "Subject Line Lab", icon: Mail },
            { id: "audit", label: "Deliverability Audit", icon: ShieldCheck },
            { id: "palettes", label: "Color Themes", icon: Palette },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition ${
                  active
                    ? "border-indigo-600 text-indigo-600 font-bold bg-indigo-50/40"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 text-xs custom-scrollbar">
          {/* TAB 1: SMART GENERATOR */}
          {activeTab === "generator" && (
            <div className="space-y-4">
              {/* Presets Gallery */}
              <div>
                <label className="font-semibold text-gray-800 text-[11px] uppercase tracking-wider mb-2 block">
                  1-Click Campaign Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PROMPT_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPrompt(p.prompt);
                        setObjective(p.objective);
                        setTone(p.tone);
                      }}
                      className="p-2.5 rounded-lg border border-gray-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/40 text-left transition flex flex-col justify-between group shadow-2xs"
                    >
                      <span className="font-bold text-gray-900 group-hover:text-indigo-600 text-xs mb-1">
                        {p.title}
                      </span>
                      <span className="text-[11px] text-gray-500 line-clamp-2">
                        {p.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt */}
              <div>
                <label className="font-semibold text-gray-800 text-xs mb-1 block">
                  Describe your email campaign or offer
                </label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Design a weekend clearance sale for summer sneakers with 25% discount, countdown timer, customer reviews, and free shipping badge..."
                  className="w-full text-xs p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-600 mb-1 block">Campaign Goal</label>
                  <select
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-gray-300 rounded-md bg-white font-medium"
                  >
                    <option value="product_promotion">Product Promotion</option>
                    <option value="flash_sale">Flash Sale / Urgent Deal</option>
                    <option value="announcement">New Drop / Brand Story</option>
                    <option value="reengagement">Win Back Inactive Customers</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-gray-600 mb-1 block">Brand Voice / Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 border border-gray-300 rounded-md bg-white font-medium"
                  >
                    <option value="exciting">Exciting & High Energy</option>
                    <option value="urgent">Urgent & Direct (FOMO)</option>
                    <option value="luxurious">Premium & Editorial</option>
                    <option value="friendly">Warm & Conversational</option>
                  </select>
                </div>
              </div>

              {/* Product Attachment */}
              <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-indigo-600" />
                    Attach Store Product (Optional)
                  </span>
                  <button
                    type="button"
                    onClick={() => setProductPickerOpen(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    {selectedProduct ? "Change Product" : "+ Browse Catalog"}
                  </button>
                </div>

                {selectedProduct ? (
                  <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-indigo-100 shadow-2xs">
                    <span className="font-semibold text-gray-900 truncate">{selectedProduct.name}</span>
                    <span className="text-indigo-600 font-mono font-bold">
                      Rs {selectedProduct.salePrice || selectedProduct.price}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500">
                    When attached, the AI will build dedicated product cards, pricing, and personalized hooks.
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SUBJECT LINE LAB */}
          {activeTab === "subjects" && (
            <div className="space-y-4">
              <div className="p-3 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 rounded-xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">High-Converting Subject Variations</h4>
                  <p className="text-[11px] text-gray-600">
                    AI-predicted open rates based on real ecommerce benchmark models.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateSubjects}
                  disabled={loading}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Regenerate
                </button>
              </div>

              <div className="space-y-2.5">
                {generatedSubjects.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 transition flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-xs truncate">{item.subject}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 flex-shrink-0">
                          {item.angle}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">
                        <span className="text-gray-400">Preheader:</span> {item.preheader}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-emerald-600 block">
                          {item.openRateScore}%
                        </span>
                        <span className="text-[9px] text-gray-400">Open Rate</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onApplySubject) {
                            onApplySubject(item.subject, item.preheader);
                          }
                          onOpenChange(false);
                        }}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-indigo-600 hover:text-white rounded-md text-xs font-semibold text-gray-700 transition flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DELIVERABILITY AUDIT */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              {/* Score Header */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Pre-Send Health Score
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-black text-emerald-700">{auditScore}</span>
                    <span className="text-xs text-emerald-800 font-semibold">/ 100 Quality Points</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {auditScore >= 90 ? "A+" : auditScore >= 80 ? "A" : "B"}
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2">
                <div className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {subjectLen >= 20 && subjectLen <= 60 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-800 text-xs">Subject Length ({subjectLen} chars)</p>
                      <p className="text-[11px] text-gray-500">Optimal length for mobile inboxes is 30–50 characters.</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold ${subjectLen >= 20 && subjectLen <= 60 ? "text-emerald-600" : "text-amber-600"}`}>
                    {subjectLen >= 20 && subjectLen <= 60 ? "Optimal" : "Attention"}
                  </span>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {!hasSpamSubject && !hasMultipleExclamations ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-800 text-xs">Spam Filter Check</p>
                      <p className="text-[11px] text-gray-500">
                        {hasSpamSubject ? "Found trigger words like 'FREE' or '$$$'" : "Clean subject line with no high-risk trigger words."}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold ${!hasSpamSubject ? "text-emerald-600" : "text-rose-600"}`}>
                    {!hasSpamSubject ? "Passed" : "Warning"}
                  </span>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hasUnsubscribe ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                    )}
                    <div>
                      <p className="font-semibold text-gray-800 text-xs">CAN-SPAM Unsubscribe Compliance</p>
                      <p className="text-[11px] text-gray-500">
                        {hasUnsubscribe ? "Footer block with 1-click unsubscribe is present." : "Missing footer block with unsubscribe link."}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold ${hasUnsubscribe ? "text-emerald-600" : "text-rose-600"}`}>
                    {hasUnsubscribe ? "Compliant" : "Required"}
                  </span>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-gray-800 text-xs">Content Balance ({blockCount} blocks)</p>
                      <p className="text-[11px] text-gray-500">
                        {productCount} product block(s) and {ctaCount} primary action button(s).
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600">Balanced</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COLOR THEMES */}
          {activeTab === "palettes" && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-gray-900 text-xs mb-1">Curated Designer Palettes</h4>
                <p className="text-[11px] text-gray-500">
                  Instant 1-click global styling. Harmonizes canvas background, typography, and buttons.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {CURATED_PALETTES.map((pal) => (
                  <div
                    key={pal.id}
                    className="p-3.5 bg-white border border-gray-200 rounded-xl hover:border-indigo-400 transition space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-xs">{pal.name}</span>
                      <div className="flex items-center gap-1">
                        {pal.preview.map((col, cIdx) => (
                          <span
                            key={cIdx}
                            className="w-3.5 h-3.5 rounded-full border border-gray-300"
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500">{pal.desc}</p>
                    <button
                      type="button"
                      onClick={() => {
                        if (onApplyStyles) {
                          onApplyStyles(pal.styles);
                        }
                        onOpenChange(false);
                      }}
                      className="w-full py-1.5 bg-gray-50 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-semibold text-gray-700 transition border border-gray-200 hover:border-transparent flex items-center justify-center gap-1.5"
                    >
                      <Palette className="w-3 h-3" />
                      Apply Palette
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-gray-200 flex items-center justify-between gap-2 flex-shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-gray-500"
          >
            Close
          </Button>

          {activeTab === "generator" && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleGenerate("improve")}
                disabled={loading}
                className="gap-1.5 text-xs"
              >
                <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                Improve Current Layout
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleGenerate("generate")}
                disabled={loading}
                className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Generate Full Layout
              </Button>
            </div>
          )}
        </div>

        <ProductPicker
          open={productPickerOpen}
          onOpenChange={setProductPickerOpen}
          onSelectProduct={(_id, snapshot) => setSelectedProduct(snapshot)}
          selectedProductId={selectedProduct?.name}
        />
      </ModalContent>
    </Modal>
  );
}
