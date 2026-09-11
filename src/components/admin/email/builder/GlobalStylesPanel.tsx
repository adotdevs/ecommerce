"use client";

import type { GlobalStyles } from "@/lib/email/document-schema";

interface GlobalStylesPanelProps {
  styles: GlobalStyles;
  onChange: (updates: Partial<GlobalStyles>) => void;
}

const FONT_OPTIONS = [
  {
    label: "Modern Sans (System)",
    value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  { label: "Inter / Clean", value: "Inter, Helvetica, Arial, sans-serif" },
  { label: "Arial / Classic", value: "Arial, 'Helvetica Neue', Helvetica, sans-serif" },
  { label: "Georgia / Elegant", value: "Georgia, Times, 'Times New Roman', serif" },
  { label: "Outfit / Geometric", value: "Outfit, Arial, sans-serif" },
  { label: "Trebuchet / Crisp", value: "'Trebuchet MS', 'Lucida Grande', sans-serif" },
];

const DESIGNER_THEMES: Array<{
  name: string;
  desc: string;
  palette: [string, string, string];
  styles: Partial<GlobalStyles>;
}> = [
  {
    name: "Midnight Luxury",
    desc: "Obsidian & Gold",
    palette: ["#0b0f19", "#111827", "#f59e0b"],
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
    name: "Modern Indigo",
    desc: "Slate & Indigo",
    palette: ["#f8fafc", "#ffffff", "#4f46e5"],
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
    name: "Emerald Boutique",
    desc: "Mint & Forest",
    palette: ["#f0fdf4", "#ffffff", "#047857"],
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
    name: "Artisan Terracotta",
    desc: "Warm Peach",
    palette: ["#fff7ed", "#ffffff", "#ea580c"],
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
    name: "Nordic Minimal",
    desc: "Monochrome",
    palette: ["#f4f4f5", "#ffffff", "#18181b"],
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
    name: "Cyber Neon",
    desc: "Dark & Neon",
    palette: ["#022c22", "#064e3b", "#10b981"],
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

export function GlobalStylesPanel({ styles, onChange }: GlobalStylesPanelProps) {
  return (
    <div className="p-4 space-y-5 text-xs text-gray-700">
      <div>
        <h4 className="font-bold text-gray-900 text-sm mb-1">Global Email Styles</h4>
        <p className="text-gray-500 text-[11px]">
          These settings apply across the entire email document.
        </p>
      </div>

      {/* 1-Click Designer Themes */}
      <div className="space-y-2 pb-3 border-b border-gray-100">
        <label className="font-semibold text-gray-800 uppercase tracking-wider text-[11px] block">
          1-Click Designer Themes
        </label>
        <div className="grid grid-cols-2 gap-2">
          {DESIGNER_THEMES.map((theme) => (
            <button
              key={theme.name}
              type="button"
              onClick={() => onChange(theme.styles)}
              className="p-2 bg-white border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/40 rounded-lg text-left transition shadow-2xs group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900 text-[11px] group-hover:text-indigo-600 truncate">
                  {theme.name}
                </span>
                <div className="flex items-center gap-0.5">
                  {theme.palette.map((color, idx) => (
                    <span
                      key={idx}
                      className="w-2.5 h-2.5 rounded-full border border-black/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-gray-400 block">{theme.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Background Colors */}
      <div className="space-y-3">
        <label className="font-semibold text-gray-800 uppercase tracking-wider text-[11px] block">
          Canvas Colors
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[11px] text-gray-600 mb-1 block">Outer Background</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styles.backgroundColor}
                onChange={(e) => onChange({ backgroundColor: e.target.value })}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={styles.backgroundColor}
                onChange={(e) => onChange({ backgroundColor: e.target.value })}
                className="w-full text-xs font-mono px-2 py-1.5 border border-gray-300 rounded"
              />
            </div>
          </div>

          <div>
            <span className="text-[11px] text-gray-600 mb-1 block">Email Body Card</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styles.contentBackground}
                onChange={(e) => onChange({ contentBackground: e.target.value })}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={styles.contentBackground}
                onChange={(e) => onChange({ contentBackground: e.target.value })}
                className="w-full text-xs font-mono px-2 py-1.5 border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <label className="font-semibold text-gray-800 uppercase tracking-wider text-[11px] block">
          Typography
        </label>

        <div>
          <span className="text-[11px] text-gray-600 mb-1 block">Font Family</span>
          <select
            value={styles.fontFamily}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
            className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded bg-white"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[11px] text-gray-600 mb-1 block">Heading Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styles.headingColor}
                onChange={(e) => onChange({ headingColor: e.target.value })}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={styles.headingColor}
                onChange={(e) => onChange({ headingColor: e.target.value })}
                className="w-full text-xs font-mono px-2 py-1.5 border border-gray-300 rounded"
              />
            </div>
          </div>

          <div>
            <span className="text-[11px] text-gray-600 mb-1 block">Text Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styles.textColor}
                onChange={(e) => onChange({ textColor: e.target.value })}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={styles.textColor}
                onChange={(e) => onChange({ textColor: e.target.value })}
                className="w-full text-xs font-mono px-2 py-1.5 border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <label className="font-semibold text-gray-800 uppercase tracking-wider text-[11px] block">
          Default Buttons
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[11px] text-gray-600 mb-1 block">Button Background</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styles.buttonColor}
                onChange={(e) => onChange({ buttonColor: e.target.value })}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={styles.buttonColor}
                onChange={(e) => onChange({ buttonColor: e.target.value })}
                className="w-full text-xs font-mono px-2 py-1.5 border border-gray-300 rounded"
              />
            </div>
          </div>

          <div>
            <span className="text-[11px] text-gray-600 mb-1 block">Button Text</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styles.buttonTextColor}
                onChange={(e) => onChange({ buttonTextColor: e.target.value })}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={styles.buttonTextColor}
                onChange={(e) => onChange({ buttonTextColor: e.target.value })}
                className="w-full text-xs font-mono px-2 py-1.5 border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] text-gray-600 mb-1">
            <span>Button Corner Radius</span>
            <span className="font-mono">{styles.buttonRadius}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            value={styles.buttonRadius}
            onChange={(e) => onChange({ buttonRadius: parseInt(e.target.value, 10) })}
            className="w-full accent-indigo-600"
          />
        </div>
      </div>

      {/* Sizing & Layout */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <label className="font-semibold text-gray-800 uppercase tracking-wider text-[11px] block">
          Container Layout
        </label>

        <div>
          <div className="flex justify-between text-[11px] text-gray-600 mb-1">
            <span>Email Max Width</span>
            <span className="font-mono">{styles.contentWidth}px</span>
          </div>
          <select
            value={styles.contentWidth}
            onChange={(e) => onChange({ contentWidth: parseInt(e.target.value, 10) })}
            className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded bg-white"
          >
            <option value={540}>540px — Compact</option>
            <option value={600}>600px — Standard (Recommended)</option>
            <option value={640}>640px — Wide</option>
            <option value={680}>680px — Extra Wide</option>
          </select>
        </div>

        <div>
          <div className="flex justify-between text-[11px] text-gray-600 mb-1">
            <span>Container Card Radius</span>
            <span className="font-mono">{styles.borderRadius}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="24"
            value={styles.borderRadius}
            onChange={(e) => onChange({ borderRadius: parseInt(e.target.value, 10) })}
            className="w-full accent-indigo-600"
          />
        </div>
      </div>
    </div>
  );
}
