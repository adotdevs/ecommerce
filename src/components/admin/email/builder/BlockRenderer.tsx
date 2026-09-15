"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  ShoppingBag,
  Ticket,
  Image as ImageIcon,
  Flame,
  Sparkles,
  Star,
  Tag,
  Clock,
  CheckCircle2,
  Share2,
  Heart,
  Globe,
  Zap,
} from "lucide-react";
import type {
  EmailSection,
  GlobalStyles,
  TextBlockContent,
  ButtonBlockContent,
  ImageBlockContent,
  ProductBlockContent,
  HeroBlockContent,
  SpacerBlockContent,
  DividerBlockContent,
  CouponBlockContent,
  BannerBlockContent,
  FooterBlockContent,
  ProductGridBlockContent,
  ProductGridItem,
  CountdownBlockContent,
  SocialLinksBlockContent,
  TestimonialBlockContent,
} from "@/lib/email/document-schema";

function SafeProductImage({
  src,
  alt,
  className = "w-full h-full object-cover",
  iconClassName = "w-8 h-8 text-gray-400 m-auto",
}: {
  src?: string;
  alt?: string;
  className?: string;
  iconClassName?: string;
}) {
  const [loadFailed, setLoadFailed] = useState(false);

  if (!src || loadFailed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100/80">
        <ShoppingBag className={iconClassName} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Product image"}
      className={className}
      onError={() => setLoadFailed(true)}
      loading="lazy"
    />
  );
}

interface BlockRendererProps {
  section: EmailSection;
  globalStyles: GlobalStyles;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function BlockRenderer({
  section,
  globalStyles,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: BlockRendererProps) {
  const c = section.content || ({} as EmailSection["content"]);
  const s = section.settings || {};

  const sectionStyle: React.CSSProperties = {
    paddingTop: `${s.paddingTop ?? 16}px`,
    paddingBottom: `${s.paddingBottom ?? 16}px`,
    paddingLeft: `${s.paddingLeft ?? 24}px`,
    paddingRight: `${s.paddingRight ?? 24}px`,
    backgroundColor: s.backgroundColor || "transparent",
    textAlign: s.alignment || "left",
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`relative group transition-all cursor-pointer rounded-lg ${
        isSelected
          ? "ring-2 ring-indigo-500 shadow-sm z-10"
          : "hover:ring-1 hover:ring-indigo-300"
      }`}
    >
      {/* Floating Toolbar on Selected / Hover */}
      <div
        className={`absolute -top-3 right-3 z-20 flex items-center gap-0.5 bg-gray-900 text-white rounded-md px-1.5 py-0.5 shadow-md text-[11px] transition-opacity duration-150 ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <span className="text-[10px] font-semibold text-gray-300 uppercase mr-1">
          {section.type}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          className="p-1 hover:bg-gray-800 rounded text-gray-300 hover:text-white"
          title="Move Up"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          className="p-1 hover:bg-gray-800 rounded text-gray-300 hover:text-white"
          title="Move Down"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-1 hover:bg-gray-800 rounded text-gray-300 hover:text-white"
          title="Duplicate"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 hover:bg-red-900/50 rounded text-red-400 hover:text-red-300"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Block Content Rendering */}
      <div style={sectionStyle} className="transition-colors">
        {/* TEXT */}
        {section.type === "text" && (() => {
          const tc = c as TextBlockContent;
          const Tag = (tc.headingLevel || "p") as "p" | "h1" | "h2" | "h3";
          const paragraphs = (tc.text || "Click to add text...").split(/\n\n+/);
          return (
            <div
              style={{
                color: tc.textColor || globalStyles.textColor,
                textAlign: tc.textAlign || "left",
                fontFamily: globalStyles.fontFamily,
              }}
            >
              {paragraphs.map((p, idx) => (
                <Tag
                  key={idx}
                  style={{
                    fontSize: `${tc.fontSize || 15}px`,
                    fontWeight: tc.fontWeight || 400,
                    lineHeight: tc.lineHeight || 1.6,
                    margin: "0 0 12px 0",
                  }}
                >
                  {p}
                </Tag>
              ))}
            </div>
          );
        })()}

        {/* BUTTON */}
        {section.type === "button" && (() => {
          const bc = c as ButtonBlockContent;
          return (
            <div style={{ textAlign: bc.alignment || "center" }}>
              <span
                style={{
                  display: bc.width === "full" ? "block" : "inline-block",
                  backgroundColor: bc.backgroundColor || globalStyles.buttonColor,
                  color: bc.textColor || globalStyles.buttonTextColor,
                  borderRadius: `${bc.borderRadius ?? globalStyles.buttonRadius}px`,
                  padding: "12px 24px",
                  fontSize: `${bc.fontSize || 15}px`,
                  fontWeight: bc.fontWeight || 600,
                  textDecoration: "none",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                {bc.text || "Click Here"}
              </span>
            </div>
          );
        })()}

        {/* PRODUCT */}
        {section.type === "product" && (() => {
          const pc = c as ProductBlockContent;
          const p = pc.productSnapshot;
          const layout = pc.layout || "image-top";
          const title = pc.displayTitle || p?.name || "Featured Product";
          const regularPrice = typeof p?.price === "number" ? p.price : 1999;
          const salePrice = typeof p?.salePrice === "number" ? p.salePrice : undefined;
          const price = salePrice || regularPrice;
          const originalPrice = salePrice ? regularPrice : null;
          const discountPercent = originalPrice && salePrice && originalPrice > salePrice
            ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
            : 0;
          const currency = p?.currency || "Rs";
          const formattedPrice = Number(price).toLocaleString();
          const formattedOriginalPrice = originalPrice ? Number(originalPrice).toLocaleString() : null;

          // 1. HORIZONTAL CARDS (image-left / image-right)
          if (layout === "image-left" || layout === "image-right") {
            return (
              <div
                className={`flex items-center gap-4 bg-gray-50/80 p-4 rounded-xl border border-gray-200/80 shadow-sm ${
                  layout === "image-right" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {pc.showImage && (
                  <div className="w-28 h-28 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 relative border border-gray-200/60">
                    <SafeProductImage src={p?.image} alt={title} iconClassName="w-8 h-8 text-gray-400 m-auto" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {pc.showTitle && (
                    <h4 className="font-bold text-gray-900 text-sm mb-1 truncate">{title}</h4>
                  )}
                  {pc.showDescription && p?.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{p.description}</p>
                  )}
                  {pc.showPrice && (
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="font-bold text-indigo-600 text-sm">{currency} {formattedPrice}</span>
                      {pc.showSalePrice && formattedOriginalPrice && (
                        <span className="line-through text-gray-400 text-xs">
                          {currency} {formattedOriginalPrice}
                        </span>
                      )}
                      {pc.showDiscount && discountPercent > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          -{discountPercent}%
                        </span>
                      )}
                    </div>
                  )}
                  {pc.showCta && (
                    <span
                      style={{
                        backgroundColor: globalStyles.buttonColor,
                        color: globalStyles.buttonTextColor,
                        borderRadius: `${globalStyles.buttonRadius}px`,
                      }}
                      className="inline-block text-xs font-semibold px-3 py-1.5 shadow-sm"
                    >
                      {pc.ctaText || "Shop Now"}
                    </span>
                  )}
                </div>
              </div>
            );
          }

          // 2. HERO SHOWCASE (Full Width)
          if (layout === "hero") {
            return (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-md">
                {pc.showImage && (
                  <div className="w-full h-64 bg-gray-100 relative overflow-hidden">
                    <SafeProductImage src={p?.image} alt={title} iconClassName="w-12 h-12 text-gray-400 m-auto" />
                    {discountPercent > 0 && (
                      <span className="absolute top-3 right-3 bg-red-600 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" /> -{discountPercent}% OFF
                      </span>
                    )}
                  </div>
                )}
                <div className="p-6 text-center space-y-3">
                  {pc.showTitle && (
                    <h3 className="font-extrabold text-gray-950 text-xl tracking-tight">{title}</h3>
                  )}
                  {pc.showDescription && p?.description && (
                    <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">{p.description}</p>
                  )}
                  {pc.showPrice && (
                    <div className="inline-flex items-center justify-center gap-2 bg-indigo-50/80 px-4 py-1.5 rounded-full border border-indigo-100">
                      <span className="font-extrabold text-indigo-700 text-lg">{currency} {formattedPrice}</span>
                      {pc.showSalePrice && formattedOriginalPrice && (
                        <span className="line-through text-gray-400 text-xs">
                          {currency} {formattedOriginalPrice}
                        </span>
                      )}
                    </div>
                  )}
                  {pc.showCta && (
                    <div className="pt-2">
                      <span
                        style={{
                          backgroundColor: globalStyles.buttonColor,
                          color: globalStyles.buttonTextColor,
                          borderRadius: `${globalStyles.buttonRadius}px`,
                        }}
                        className="inline-block w-full max-w-xs text-sm font-bold py-2.5 px-6 shadow-sm"
                      >
                        {pc.ctaText || "Claim This Offer"} &rarr;
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // 3. COMPACT ROW (Slim Catalog Item)
          if (layout === "compact") {
            return (
              <div className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-lg border border-gray-200/90 hover:border-indigo-300 transition">
                <div className="flex items-center gap-3 min-w-0">
                  {pc.showImage && (
                    <div className="w-14 h-14 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 relative border border-gray-200">
                      <SafeProductImage src={p?.image} alt={title} iconClassName="w-5 h-5 text-gray-400 m-auto" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{title}</p>
                    {pc.showPrice && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-bold text-indigo-600 text-xs">{currency} {formattedPrice}</span>
                        {pc.showSalePrice && formattedOriginalPrice && (
                          <span className="line-through text-gray-400 text-[10px]">{currency} {formattedOriginalPrice}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {pc.showCta && (
                  <span
                    style={{
                      backgroundColor: globalStyles.buttonColor,
                      color: globalStyles.buttonTextColor,
                      borderRadius: `${globalStyles.buttonRadius}px`,
                    }}
                    className="flex-shrink-0 text-[11px] font-semibold px-2.5 py-1"
                  >
                    {pc.ctaText || "View"}
                  </span>
                )}
              </div>
            );
          }

          // 4. PRICE-FOCUSED (Bold Price Deal)
          if (layout === "price-focused") {
            return (
              <div className="bg-gradient-to-b from-amber-50/40 to-white rounded-xl border border-amber-200/70 p-4 shadow-sm text-center">
                <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full mb-3">
                  <Flame className="w-3 h-3 text-amber-600" /> Price Drop
                </div>
                {pc.showImage && (
                  <div className="w-36 h-36 bg-gray-100 rounded-xl mx-auto mb-3 relative overflow-hidden border border-gray-100">
                    <SafeProductImage src={p?.image} alt={title} iconClassName="w-8 h-8 text-gray-400 m-auto" />
                  </div>
                )}
                {pc.showTitle && <h4 className="font-bold text-gray-900 text-sm mb-1">{title}</h4>}
                <div className="my-2 py-2 px-3 bg-indigo-600 text-white rounded-lg inline-flex items-center gap-2 shadow-sm">
                  <span className="text-base font-extrabold">{currency} {formattedPrice}</span>
                  {pc.showSalePrice && formattedOriginalPrice && (
                    <span className="line-through text-indigo-200 text-xs">{currency} {formattedOriginalPrice}</span>
                  )}
                  {discountPercent > 0 && (
                    <span className="text-[10px] font-bold bg-white text-indigo-700 px-1.5 py-0.5 rounded">
                      Save {discountPercent}%
                    </span>
                  )}
                </div>
                {pc.showCta && (
                  <div className="mt-2">
                    <span
                      style={{
                        backgroundColor: globalStyles.buttonColor,
                        color: globalStyles.buttonTextColor,
                        borderRadius: `${globalStyles.buttonRadius}px`,
                      }}
                      className="inline-block text-xs font-bold px-5 py-2 shadow-sm"
                    >
                      {pc.ctaText || "Get It Today"}
                    </span>
                  </div>
                )}
              </div>
            );
          }

          // 5. LUXURY SHOWCASE (Dark & Gold / Obsidian)
          if (layout === "luxury-showcase") {
            return (
              <div className="bg-gray-950 text-white rounded-xl border border-amber-500/30 p-5 shadow-lg text-center">
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium tracking-[0.2em] uppercase text-amber-400 mb-3">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Curated Luxury <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                </div>
                {pc.showImage && (
                  <div className="w-48 h-48 bg-gray-900 rounded-lg mx-auto mb-3 relative overflow-hidden border border-gray-800">
                    <SafeProductImage src={p?.image} alt={title} iconClassName="w-10 h-10 text-gray-600 m-auto" />
                  </div>
                )}
                {pc.showTitle && (
                  <h4 className="font-serif font-bold text-gray-100 text-base tracking-wide mb-1">{title}</h4>
                )}
                {pc.showDescription && p?.description && (
                  <p className="text-xs text-gray-400 max-w-sm mx-auto mb-3 line-clamp-2">{p.description}</p>
                )}
                {pc.showPrice && (
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="font-serif text-lg font-bold text-amber-300">{currency} {formattedPrice}</span>
                    {pc.showSalePrice && formattedOriginalPrice && (
                      <span className="line-through text-gray-500 text-xs">{currency} {formattedOriginalPrice}</span>
                    )}
                  </div>
                )}
                {pc.showCta && (
                  <span className="inline-block bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 font-bold text-xs uppercase tracking-wider px-6 py-2 rounded shadow-md">
                    {pc.ctaText || "Acquire Now"}
                  </span>
                )}
              </div>
            );
          }

          // 6. GRADIENT SPOTLIGHT (Modern Vibrant Card)
          if (layout === "gradient-spotlight") {
            return (
              <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-pink-50/80 rounded-2xl border border-indigo-200/60 p-5 shadow-sm text-center">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-white/90 px-3 py-1 rounded-full shadow-xs mb-3 border border-indigo-100">
                  <Sparkles className="w-3 h-3 text-indigo-500" /> Handpicked Highlight
                </div>
                {pc.showImage && (
                  <div className="w-44 h-44 bg-white/80 rounded-xl mx-auto mb-3 relative overflow-hidden shadow-sm border border-white">
                    <SafeProductImage src={p?.image} alt={title} iconClassName="w-8 h-8 text-indigo-300 m-auto" />
                  </div>
                )}
                {pc.showTitle && <h4 className="font-extrabold text-gray-900 text-base mb-1">{title}</h4>}
                {pc.showDescription && p?.description && (
                  <p className="text-xs text-gray-600 max-w-sm mx-auto mb-2 line-clamp-2">{p.description}</p>
                )}
                {pc.showPrice && (
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="font-bold text-indigo-600 text-base">{currency} {formattedPrice}</span>
                    {pc.showSalePrice && formattedOriginalPrice && (
                      <span className="line-through text-gray-400 text-xs">{currency} {formattedOriginalPrice}</span>
                    )}
                  </div>
                )}
                {pc.showCta && (
                  <span
                    style={{
                      backgroundColor: globalStyles.buttonColor,
                      color: globalStyles.buttonTextColor,
                      borderRadius: `${globalStyles.buttonRadius}px`,
                    }}
                    className="inline-block text-xs font-bold px-6 py-2 shadow-sm"
                  >
                    {pc.ctaText || "Explore Product"}
                  </span>
                )}
              </div>
            );
          }

          // 7. BADGE-HIGHLIGHT (Limited Deal / Flash Badge)
          if (layout === "badge-highlight") {
            return (
              <div className="bg-white rounded-xl border-2 border-indigo-500 overflow-hidden shadow-sm">
                <div className="bg-indigo-600 text-white text-[11px] font-bold px-4 py-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 uppercase tracking-wide">
                    <Tag className="w-3.5 h-3.5" /> Exclusive Deal
                  </span>
                  {discountPercent > 0 && <span>Save {discountPercent}%</span>}
                </div>
                <div className="p-4 flex items-center gap-4">
                  {pc.showImage && (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg relative overflow-hidden flex-shrink-0 border border-gray-200">
                      <SafeProductImage src={p?.image} alt={title} iconClassName="w-6 h-6 text-gray-400 m-auto" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {pc.showTitle && <h4 className="font-bold text-gray-900 text-sm truncate mb-1">{title}</h4>}
                    {pc.showPrice && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-indigo-600 text-sm">{currency} {formattedPrice}</span>
                        {pc.showSalePrice && formattedOriginalPrice && (
                          <span className="line-through text-gray-400 text-xs">{currency} {formattedOriginalPrice}</span>
                        )}
                      </div>
                    )}
                    {pc.showCta && (
                      <span
                        style={{
                          backgroundColor: globalStyles.buttonColor,
                          color: globalStyles.buttonTextColor,
                          borderRadius: `${globalStyles.buttonRadius}px`,
                        }}
                        className="inline-block text-xs font-semibold px-3 py-1"
                      >
                        {pc.ctaText || "Grab Deal"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // 8. MINIMAL (Image + CTA Only)
          if (layout === "image-button-only") {
            return (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm max-w-sm mx-auto text-center p-3">
                {pc.showImage && (
                  <div className="w-full h-44 bg-gray-100 rounded-lg relative overflow-hidden mb-3">
                    <SafeProductImage src={p?.image} alt={title} iconClassName="w-10 h-10 text-gray-400 m-auto" />
                  </div>
                )}
                {pc.showCta && (
                  <span
                    style={{
                      backgroundColor: globalStyles.buttonColor,
                      color: globalStyles.buttonTextColor,
                      borderRadius: `${globalStyles.buttonRadius}px`,
                    }}
                    className="inline-block w-full text-xs font-bold py-2"
                  >
                    {pc.ctaText || "Shop Now"}
                  </span>
                )}
              </div>
            );
          }

          // 9. EDITORIAL MAGAZINE (Vogue / High Fashion Luxury)
          if (layout === "editorial-magazine") {
            const badge = pc.badgeText || "★ ATELIER EDIT ★";
            return (
              <div className="border-y-2 border-gray-900 bg-white p-6 text-center max-w-md mx-auto shadow-sm">
                <span className="inline-block text-[10px] font-bold tracking-[0.25em] uppercase text-indigo-600 mb-3">
                  {badge}
                </span>
                {pc.showImage && (
                  <div className="w-full h-56 bg-gray-100 rounded relative overflow-hidden mb-4 border border-gray-100">
                    <SafeProductImage src={p?.image} alt={title} iconClassName="w-10 h-10 text-gray-400 m-auto" />
                  </div>
                )}
                {pc.showTitle && (
                  <h3 className="font-serif text-xl tracking-wide uppercase font-light text-gray-950 mb-2">
                    {title}
                  </h3>
                )}
                {pc.showDescription && p?.description && (
                  <p className="font-serif italic text-xs text-gray-600 max-w-xs mx-auto mb-3 leading-relaxed">
                    “{p.description}”
                  </p>
                )}
                {pc.showPrice && (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="font-serif font-bold text-gray-900 text-lg">{currency} {formattedPrice}</span>
                    {pc.showSalePrice && formattedOriginalPrice && (
                      <span className="font-serif line-through text-gray-400 text-xs">{currency} {formattedOriginalPrice}</span>
                    )}
                  </div>
                )}
                {pc.showCta && (
                  <span
                    style={{
                      backgroundColor: globalStyles.buttonColor,
                      color: globalStyles.buttonTextColor,
                    }}
                    className="inline-block text-xs font-bold uppercase tracking-widest px-8 py-2.5 rounded-xs shadow-sm hover:opacity-90"
                  >
                    {pc.ctaText || "Acquire Piece"} &rarr;
                  </span>
                )}
              </div>
            );
          }

          // 10. GLASSMORPHISM / FROSTED CARD
          if (layout === "glassmorphism-card") {
            return (
              <div className="bg-slate-50/80 backdrop-blur-md rounded-2xl border border-slate-200 p-5 text-center max-w-sm mx-auto shadow-md">
                <div className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-slate-700 bg-slate-200/80 px-3 py-1 rounded-full mb-3">
                  ✦ Handpicked Choice ✦
                </div>
                {pc.showImage && (
                  <div className="w-40 h-40 bg-white rounded-xl mx-auto mb-3 relative overflow-hidden shadow-inner border border-white">
                    <SafeProductImage src={p?.image} alt={title} iconClassName="w-8 h-8 text-slate-400 m-auto" />
                  </div>
                )}
                {pc.showTitle && <h4 className="font-bold text-slate-900 text-base mb-1">{title}</h4>}
                {pc.showDescription && p?.description && (
                  <p className="text-xs text-slate-500 mb-2 line-clamp-2">{p.description}</p>
                )}
                {pc.showPrice && (
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="font-bold text-slate-900 text-base">{currency} {formattedPrice}</span>
                    {pc.showSalePrice && formattedOriginalPrice && (
                      <span className="line-through text-slate-400 text-xs">{currency} {formattedOriginalPrice}</span>
                    )}
                  </div>
                )}
                {pc.showCta && (
                  <span
                    style={{
                      backgroundColor: globalStyles.buttonColor,
                      color: globalStyles.buttonTextColor,
                    }}
                    className="inline-block text-xs font-semibold px-6 py-2 rounded-full shadow-sm"
                  >
                    {pc.ctaText || "Explore Product"} &rarr;
                  </span>
                )}
              </div>
            );
          }

          // 11. NEON CYBER
          if (layout === "neon-cyber") {
            return (
              <div className="bg-zinc-950 text-white rounded-2xl border-2 border-indigo-500 p-5 text-center max-w-sm mx-auto shadow-xl">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-widest uppercase text-purple-400 bg-purple-950/80 border border-purple-800 px-3 py-1 rounded-full mb-3">
                  <Zap className="w-3 h-3 text-purple-400" /> Cyber Drop Alert
                </div>
                {pc.showImage && (
                  <div className="w-44 h-44 bg-zinc-900 rounded-xl mx-auto mb-3 relative overflow-hidden border border-zinc-800">
                    <SafeProductImage src={p?.image} alt={title} iconClassName="w-8 h-8 text-zinc-600 m-auto" />
                  </div>
                )}
                {pc.showTitle && <h4 className="font-extrabold text-zinc-100 text-base mb-1">{title}</h4>}
                {pc.showPrice && (
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="font-extrabold text-cyan-400 text-lg">{currency} {formattedPrice}</span>
                    {pc.showSalePrice && formattedOriginalPrice && (
                      <span className="line-through text-zinc-500 text-xs">{currency} {formattedOriginalPrice}</span>
                    )}
                  </div>
                )}
                {pc.showCta && (
                  <span className="inline-block bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-lg shadow-lg hover:bg-indigo-500">
                    {pc.ctaText || "Claim Deal"} &rarr;
                  </span>
                )}
              </div>
            );
          }

          // 12. STAR-RATED SOCIAL PROOF
          if (layout === "star-rated-deal") {
            const rating = pc.rating || 5;
            const reviews = pc.reviewsCount || 142;
            return (
              <div className="bg-orange-50/50 rounded-2xl border border-amber-200/80 p-5 text-center max-w-sm mx-auto shadow-sm">
                <div className="flex items-center justify-center gap-1 text-amber-500 text-sm mb-1">
                  {"★".repeat(Math.round(rating))}
                  <span className="text-xs font-bold text-amber-900 ml-1">
                    {rating.toFixed(1)}/5 ({reviews} reviews)
                  </span>
                </div>
                {pc.badgeText && (
                  <span className="inline-block text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md mb-2">
                    {pc.badgeText}
                  </span>
                )}
                {pc.showImage && (
                  <div className="w-40 h-40 bg-white rounded-xl mx-auto mb-3 relative overflow-hidden border border-amber-100">
                    <SafeProductImage src={p?.image} alt={title} iconClassName="w-8 h-8 text-amber-300 m-auto" />
                  </div>
                )}
                {pc.showTitle && <h4 className="font-bold text-gray-900 text-base mb-1">{title}</h4>}
                {pc.showPrice && (
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="font-extrabold text-gray-950 text-base">{currency} {formattedPrice}</span>
                    {pc.showSalePrice && formattedOriginalPrice && (
                      <span className="line-through text-gray-400 text-xs">{currency} {formattedOriginalPrice}</span>
                    )}
                  </div>
                )}
                {pc.showCta && (
                  <span className="inline-block bg-orange-600 text-white font-bold text-xs px-6 py-2 rounded-lg shadow-sm">
                    {pc.ctaText || "Get It Now"} &rarr;
                  </span>
                )}
              </div>
            );
          }

          // 13. MINIMAL BOUTIQUE
          if (layout === "minimal-boutique") {
            return (
              <div className="bg-stone-50 rounded-xl border border-stone-200 p-5 text-center max-w-sm mx-auto shadow-sm">
                {pc.showImage && (
                  <div className="w-36 h-36 bg-white rounded-lg mx-auto mb-3 relative overflow-hidden border border-stone-100">
                    <SafeProductImage src={p?.image} alt={title} iconClassName="w-8 h-8 text-stone-300 m-auto" />
                  </div>
                )}
                {pc.showTitle && <h4 className="font-serif font-medium text-stone-900 text-base mb-1">{title}</h4>}
                {pc.showPrice && (
                  <div className="text-stone-700 font-medium text-sm mb-3">
                    {currency} {formattedPrice}
                  </div>
                )}
                {pc.showCta && (
                  <span className="inline-block border border-stone-400 text-stone-800 text-xs font-semibold px-5 py-1.5 rounded hover:bg-stone-100">
                    {pc.ctaText || "Discover"}
                  </span>
                )}
              </div>
            );
          }

          // 14. PILL BADGE ROW
          if (layout === "pill-badge-row") {
            return (
              <div className="flex items-center justify-between gap-3 p-2 px-4 bg-white rounded-full border border-gray-200 shadow-xs hover:border-indigo-300">
                <div className="flex items-center gap-3 min-w-0">
                  {pc.showImage && (
                    <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex-shrink-0 relative border border-gray-200">
                      <SafeProductImage src={p?.image} alt={title} iconClassName="w-4 h-4 text-gray-400 m-auto" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-gray-900 truncate">{title}</p>
                      {pc.badgeText && (
                        <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded">
                          {pc.badgeText}
                        </span>
                      )}
                    </div>
                    {pc.showPrice && (
                      <span className="font-bold text-indigo-600 text-xs">{currency} {formattedPrice}</span>
                    )}
                  </div>
                </div>
                {pc.showCta && (
                  <span
                    style={{
                      backgroundColor: globalStyles.buttonColor,
                      color: globalStyles.buttonTextColor,
                    }}
                    className="flex-shrink-0 text-[11px] font-bold px-3 py-1 rounded-full shadow-xs"
                  >
                    {pc.ctaText || "Buy"}
                  </span>
                )}
              </div>
            );
          }

          // 15. DEFAULT / STANDARD: image-top
          return (
            <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden shadow-sm max-w-sm mx-auto text-center">
              {pc.showImage && (
                <div className="w-full h-44 bg-gray-100 relative overflow-hidden">
                  <SafeProductImage src={p?.image} alt={title} iconClassName="w-10 h-10 text-gray-400 m-auto" />
                </div>
              )}
              <div className="p-4 space-y-2">
                {pc.showTitle && (
                  <h4 className="font-bold text-gray-900 text-base">{title}</h4>
                )}
                {pc.showDescription && p?.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                )}
                {pc.showPrice && (
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className="font-bold text-indigo-600 text-base">{currency} {formattedPrice}</span>
                    {pc.showSalePrice && formattedOriginalPrice && (
                      <span className="line-through text-gray-400 text-xs">
                        {currency} {formattedOriginalPrice}
                      </span>
                    )}
                    {discountPercent > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        -{discountPercent}%
                      </span>
                    )}
                  </div>
                )}
                {pc.showCta && (
                  <div className="pt-2">
                    <span
                      style={{
                        backgroundColor: globalStyles.buttonColor,
                        color: globalStyles.buttonTextColor,
                        borderRadius: `${globalStyles.buttonRadius}px`,
                      }}
                      className="inline-block text-xs font-semibold px-4 py-2 shadow-sm"
                    >
                      {pc.ctaText || "Shop Now"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* HERO */}
        {section.type === "hero" && (() => {
          const hc = c as HeroBlockContent;
          return (
            <div
              style={{
                backgroundColor: hc.backgroundColor || "#1e1b4b",
                color: hc.titleColor || "#ffffff",
                textAlign: hc.alignment || "center",
                borderRadius: "12px",
                padding: "36px 24px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {hc.title && (
                <h2 className="text-2xl md:text-3xl font-extrabold mb-2 tracking-tight">
                  {hc.title}
                </h2>
              )}
              {hc.subtitle && (
                <p className="text-sm font-medium text-indigo-200 mb-2">{hc.subtitle}</p>
              )}
              {hc.paragraph && (
                <p className="text-xs text-gray-300 max-w-md mx-auto mb-4">{hc.paragraph}</p>
              )}
              {hc.ctaText && (
                <span
                  style={{
                    backgroundColor: hc.ctaBackgroundColor || "#ffffff",
                    color: hc.ctaTextColor || "#1e1b4b",
                    borderRadius: "8px",
                  }}
                  className="inline-block text-xs font-bold px-5 py-2.5 shadow"
                >
                  {hc.ctaText}
                </span>
              )}
            </div>
          );
        })()}

        {/* IMAGE */}
        {section.type === "image" && (() => {
          const ic = c as ImageBlockContent;
          return (
            <div style={{ textAlign: ic.alignment || "center" }}>
              {ic.src ? (
                <div
                  className="relative mx-auto overflow-hidden"
                  style={{
                    width: ic.width === "full" ? "100%" : "300px",
                    height: "220px",
                    borderRadius: `${ic.borderRadius ?? 8}px`,
                  }}
                >
                  <Image
                    src={ic.src}
                    alt={ic.alt || "Email image"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="py-12 px-4 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon className="w-8 h-8 mb-1" />
                  <span className="text-xs font-medium">Click to set image URL</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* COUPON */}
        {section.type === "coupon" && (() => {
          const cc = c as CouponBlockContent;
          return (
            <div className="p-4 bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-xl text-center space-y-2 max-w-sm mx-auto">
              <div className="flex items-center justify-center gap-1.5 text-amber-800 font-semibold text-xs">
                <Ticket className="w-4 h-4" />
                <span>{cc.title || "Special Coupon"}</span>
              </div>
              <div className="text-lg font-extrabold tracking-widest font-mono text-amber-900 bg-white border border-amber-200 py-1.5 px-4 rounded-lg inline-block shadow-sm">
                {cc.code || "SAVE20"}
              </div>
              {cc.description && (
                <p className="text-xs text-amber-700">{cc.description}</p>
              )}
              {cc.ctaText && (
                <div>
                  <span className="inline-block bg-amber-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-md">
                    {cc.ctaText}
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {/* BANNER */}
        {section.type === "banner" && (() => {
          const bnc = c as BannerBlockContent;
          return (
            <div
              style={{
                backgroundColor: bnc.backgroundColor || "#4f46e5",
                color: bnc.textColor || "#ffffff",
                padding: "10px 16px",
                borderRadius: "8px",
                textAlign: "center",
                fontWeight: bnc.fontWeight || 600,
                fontSize: `${bnc.fontSize || 13}px`,
              }}
            >
              {bnc.text || "Special Announcement"}
            </div>
          );
        })()}

        {/* SPACER */}
        {section.type === "spacer" && (() => {
          const sp = c as SpacerBlockContent;
          return (
            <div
              style={{ height: `${sp.height || 24}px` }}
              className="bg-gray-100/50 border border-dashed border-gray-200 rounded flex items-center justify-center"
            >
              <span className="text-[10px] text-gray-400 font-mono">
                {sp.height || 24}px spacer
              </span>
            </div>
          );
        })()}

        {/* DIVIDER */}
        {section.type === "divider" && (() => {
          const dc = c as DividerBlockContent;
          return (
            <hr
              style={{
                borderTopStyle: (dc.style as "solid" | "dashed" | "dotted") || "solid",
                borderTopWidth: `${dc.thickness || 1}px`,
                borderColor: dc.color || "#e5e7eb",
                width: dc.width === "full" ? "100%" : `${dc.width || 100}%`,
                margin: "0 auto",
              }}
            />
          );
        })()}

        {/* PRODUCT GRID */}
        {section.type === "product-grid" && (() => {
          const pgc = c as ProductGridBlockContent;
          const items = (pgc.items || (pgc as any).products || []) as ProductGridItem[];
          const cols = pgc.columns === 2 ? "grid-cols-2" : "grid-cols-3";
          return (
            <div className="space-y-3">
              {pgc.title && (
                <div className="text-center mb-3">
                  <h3 className="font-extrabold text-gray-900 text-lg">{pgc.title}</h3>
                  {pgc.subtitle && <p className="text-xs text-gray-500 mt-0.5">{pgc.subtitle}</p>}
                </div>
              )}
              {items.length === 0 ? (
                <div className="py-8 px-4 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                  <ShoppingBag className="w-8 h-8 mb-2 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600">No products added yet</span>
                  <span className="text-[11px] text-gray-400 mt-0.5">Click to configure and select products for this grid</span>
                </div>
              ) : (
                <div className={`grid ${cols} gap-3`}>
                  {items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        backgroundColor: pgc.cardBackground || "#ffffff",
                        borderColor: pgc.cardBorderColor || "#e5e7eb",
                        borderRadius: `${pgc.cardBorderRadius ?? 12}px`,
                      }}
                      className="p-3 border text-center shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-full h-28 bg-gray-100 rounded-lg relative overflow-hidden mb-2 border border-gray-100">
                          <SafeProductImage
                            src={item.image}
                            alt={item.name}
                            iconClassName="w-6 h-6 text-gray-400 m-auto"
                          />
                          {pgc.showBadges && item.badge && (
                            <span className="absolute top-1.5 right-1.5 text-[9px] font-extrabold bg-red-600 text-white px-1.5 py-0.5 rounded shadow-xs z-10">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-900 text-xs line-clamp-2 mb-1.5 text-left">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <span className="font-bold text-indigo-600 text-xs">
                            {item.currency || "Rs"} {Number(item.salePrice || item.price).toLocaleString()}
                          </span>
                          {pgc.showSalePrices && item.salePrice && item.price && item.salePrice < item.price && (
                            <span className="line-through text-gray-400 text-[10px]">
                              {item.currency || "Rs"} {Number(item.price).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        style={{
                          backgroundColor: globalStyles.buttonColor,
                          color: globalStyles.buttonTextColor,
                          borderRadius: `${globalStyles.buttonRadius}px`,
                        }}
                        className="block w-full py-1.5 text-[11px] font-semibold text-center shadow-xs cursor-pointer"
                      >
                        {pgc.ctaText || "Shop Now"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* COUNTDOWN */}
        {section.type === "countdown" && (() => {
          const cdc = c as CountdownBlockContent;
          const hours = String(cdc.hoursRemaining ?? 14).padStart(2, "0");
          const mins = String(cdc.minutesRemaining ?? 35).padStart(2, "0");
          const secs = String(cdc.secondsRemaining ?? 45).padStart(2, "0");
          return (
            <div
              style={{
                backgroundColor: cdc.backgroundColor || "#0f172a",
                color: cdc.textColor || "#ffffff",
              }}
              className="p-6 rounded-2xl text-center space-y-3 shadow-md"
            >
              {cdc.badgeText && (
                <span
                  style={{
                    color: cdc.accentColor || "#fbbf24",
                    backgroundColor: "rgba(251,191,36,0.15)",
                    borderColor: "rgba(251,191,36,0.3)",
                  }}
                  className="inline-block text-[10px] font-extrabold uppercase tracking-widest px-3 py-0.5 rounded-full border"
                >
                  {cdc.badgeText}
                </span>
              )}
              <h3 className="text-lg font-black tracking-wide uppercase">{cdc.title}</h3>
              {cdc.subtitle && <p className="text-xs text-gray-400">{cdc.subtitle}</p>}
              <div className="flex items-center justify-center gap-2 pt-1">
                <div
                  style={{ backgroundColor: cdc.boxBackground || "#1e293b" }}
                  className="px-3 py-2 rounded-lg border border-white/10 min-w-[50px]"
                >
                  <span
                    style={{ color: cdc.accentColor || "#fbbf24" }}
                    className="font-mono text-xl font-extrabold block"
                  >
                    {hours}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Hours</span>
                </div>
                <span className="text-amber-400 font-bold text-lg">:</span>
                <div
                  style={{ backgroundColor: cdc.boxBackground || "#1e293b" }}
                  className="px-3 py-2 rounded-lg border border-white/10 min-w-[50px]"
                >
                  <span
                    style={{ color: cdc.accentColor || "#fbbf24" }}
                    className="font-mono text-xl font-extrabold block"
                  >
                    {mins}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Mins</span>
                </div>
                <span className="text-amber-400 font-bold text-lg">:</span>
                <div
                  style={{ backgroundColor: cdc.boxBackground || "#1e293b" }}
                  className="px-3 py-2 rounded-lg border border-white/10 min-w-[50px]"
                >
                  <span
                    style={{ color: cdc.accentColor || "#fbbf24" }}
                    className="font-mono text-xl font-extrabold block"
                  >
                    {secs}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Secs</span>
                </div>
              </div>
              {cdc.ctaText && (
                <div className="pt-2">
                  <span
                    style={{
                      backgroundColor: cdc.accentColor || "#fbbf24",
                      color: "#0f172a",
                    }}
                    className="inline-block text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-full shadow-md"
                  >
                    {cdc.ctaText} &rarr;
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {/* SOCIAL LINKS */}
        {section.type === "social-links" && (() => {
          const slc = c as SocialLinksBlockContent;
          const links = slc.links || [];
          return (
            <div className="text-center py-2 space-y-2">
              {slc.title && <p className="text-xs font-semibold text-gray-500">{slc.title}</p>}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {links.map((link, idx) => (
                  <span
                    key={idx}
                    style={{ color: slc.iconColor || globalStyles.linkColor }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition border border-gray-200 capitalize"
                  >
                    <Share2 className="w-3 h-3 opacity-60" /> {link.label || link.platform}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* TESTIMONIAL */}
        {section.type === "testimonial" && (() => {
          const tmc = c as TestimonialBlockContent;
          const rating = tmc.rating || 5;
          return (
            <div
              style={{
                backgroundColor: tmc.cardBackground || "#f8fafc",
                borderColor: tmc.cardBorderColor || "#e2e8f0",
              }}
              className="p-5 border rounded-2xl text-center space-y-2 shadow-xs"
            >
              <div style={{ color: tmc.starColor || "#f59e0b" }} className="text-sm">
                {"★".repeat(Math.round(rating))}
              </div>
              <p className="font-serif italic text-sm text-gray-700 max-w-md mx-auto leading-relaxed">
                {tmc.quote}
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                {tmc.authorAvatar && (
                  <div className="w-6 h-6 rounded-full overflow-hidden relative border border-gray-300">
                    <Image src={tmc.authorAvatar} alt={tmc.authorName} fill className="object-cover" unoptimized />
                  </div>
                )}
                <span className="font-bold text-xs text-gray-900">{tmc.authorName}</span>
                {tmc.verifiedCustomer && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                  </span>
                )}
              </div>
              {tmc.authorTitle && <p className="text-[10px] text-gray-400">{tmc.authorTitle}</p>}
            </div>
          );
        })()}

        {/* FOOTER */}
        {section.type === "footer" && (() => {
          const fc = c as FooterBlockContent;
          return (
            <div className="text-center text-xs text-gray-400 space-y-1 pt-4 border-t border-gray-100">
              <p className="font-semibold text-gray-600">{fc.companyName || "Findora"}</p>
              {fc.address && <p className="text-[11px]">{fc.address}</p>}
              <p className="text-[11px] text-gray-400">
                You received this email because you signed up on our store.{" "}
                <span className="underline cursor-pointer">Unsubscribe</span>
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
