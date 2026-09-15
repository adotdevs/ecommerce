"use client";

import { useState } from "react";
import { toAbsoluteUrl } from "@/lib/url";
import type { EmailLinkType } from "@/lib/email/tracking";

interface LinkEditorProps {
  url: string;
  linkType?: string;
  onUrlChange: (url: string) => void;
  onLinkTypeChange?: (linkType: EmailLinkType) => void;
  label?: string;
}

const PRESET_LINKS = [
  { label: "Home Page", url: "/" },
  { label: "Products Catalog", url: "/products" },
  { label: "Shopping Cart", url: "/cart" },
];

export function LinkEditor({
  url,
  linkType = "CTA_BUTTON",
  onUrlChange,
  onLinkTypeChange,
  label = "Link Destination",
}: LinkEditorProps) {
  const [showPresets, setShowPresets] = useState(false);
  const absoluteUrl = toAbsoluteUrl(url || "/");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          {showPresets ? "Hide presets" : "Quick presets"}
        </button>
      </div>

      {showPresets && (
        <div className="p-2 bg-gray-50 rounded-md border border-gray-200 flex flex-wrap gap-1.5 text-xs">
          {PRESET_LINKS.map((preset) => (
            <button
              key={preset.url}
              type="button"
              onClick={() => {
                onUrlChange(preset.url);
                setShowPresets(false);
              }}
              className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <input
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="/products/your-slug or https://..."
          className="w-full text-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
        />
        <p className="text-[11px] text-gray-500 truncate" title={absoluteUrl}>
          Resolves to: <span className="text-gray-700 font-mono">{absoluteUrl}</span>
        </p>
      </div>

      {onLinkTypeChange && (
        <div className="space-y-1 pt-1">
          <label className="text-[11px] font-medium text-gray-600">Attribution Link Type</label>
          <select
            value={linkType}
            onChange={(e) => onLinkTypeChange(e.target.value as EmailLinkType)}
            className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="CTA_BUTTON">CTA Button</option>
            <option value="PRODUCT_CTA">Product CTA</option>
            <option value="PRODUCT_IMAGE">Product Image</option>
            <option value="PRODUCT_TITLE">Product Title</option>
            <option value="HERO_BUTTON">Hero Button</option>
            <option value="TEXT_LINK">Text Link</option>
            <option value="BANNER_LINK">Banner Link</option>
            <option value="COUPON_CTA">Coupon CTA</option>
            <option value="CUSTOM_BUTTON">Custom Button</option>
            <option value="FOOTER_LINK">Footer Link</option>
          </select>
        </div>
      )}
    </div>
  );
}
