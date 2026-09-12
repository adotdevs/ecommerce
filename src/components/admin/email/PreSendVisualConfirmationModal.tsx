"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Globe,
  Check,
  Edit3,
  Sparkles,
  Send,
  Loader2,
  ChevronRight,
  RefreshCw,
  Monitor,
  Smartphone,
  Eye,
  Languages,
  DollarSign,
  AlertCircle,
  X,
} from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ds/modal";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { renderEmailDocument } from "@/lib/email/document-renderer";
import type { EmailDocument, LocalizedEmailVariant, EmailSection } from "@/lib/email/document-schema";
import { localeConfig } from "@/config/locales";
import { useExchangeRates } from "@/stores/locale-store";

export interface RecipientPersona {
  id: string;
  name: string;
  email: string;
  country: string;
  flag: string;
  locale: string;
  currency: string;
  direction?: "ltr" | "rtl";
}

const DEFAULT_PERSONAS: RecipientPersona[] = [
  { id: "us", name: "Sarah Jenkins", email: "sarah.j@example.com", country: "United States", flag: "🇺🇸", locale: "en", currency: "USD", direction: "ltr" },
  { id: "fr", name: "Amélie Laurent", email: "amelie.l@example.fr", country: "France", flag: "🇫🇷", locale: "fr", currency: "EUR", direction: "ltr" },
  { id: "de", name: "Lukas Schmidt", email: "lukas.s@example.de", country: "Germany", flag: "🇩🇪", locale: "de", currency: "EUR", direction: "ltr" },
  { id: "ae", name: "Fatima Al-Zahra", email: "fatima.z@example.ae", country: "UAE (Dubai)", flag: "🇦🇪", locale: "ar", currency: "AED", direction: "rtl" },
  { id: "pk", name: "Hamza Khan", email: "hamza.k@example.pk", country: "Pakistan", flag: "🇵🇰", locale: "en", currency: "PKR", direction: "ltr" },
  { id: "uk", name: "Oliver Smith", email: "oliver.s@example.co.uk", country: "United Kingdom", flag: "🇬🇧", locale: "en", currency: "GBP", direction: "ltr" },
  { id: "es", name: "Sofia Rodriguez", email: "sofia.r@example.es", country: "Spain", flag: "🇪🇸", locale: "es", currency: "EUR", direction: "ltr" },
];

interface PreSendVisualConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: EmailDocument;
  onUpdateDocument?: (doc: EmailDocument) => void;
  onConfirmLaunch: () => Promise<void> | void;
  isSubmitting?: boolean;
  campaignName?: string;
  recipientCount?: number;
}

export function PreSendVisualConfirmationModal({
  open,
  onOpenChange,
  document,
  onUpdateDocument,
  onConfirmLaunch,
  isSubmitting = false,
  campaignName = "Marketing Campaign",
  recipientCount = 10,
}: PreSendVisualConfirmationModalProps) {
  const storeRates = useExchangeRates();
  const [selectedPersona, setSelectedPersona] = useState<RecipientPersona>(DEFAULT_PERSONAS[0]);
  const [activeLocale, setActiveLocale] = useState<string>("en");
  const [activeCurrency, setActiveCurrency] = useState<string>("USD");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  // Local working copy of document to allow edits to translations
  const [localDoc, setLocalDoc] = useState<EmailDocument>(document);

  // Translation & edit drawer state
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateSuccess, setTranslateSuccess] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editPreviewText, setEditPreviewText] = useState("");
  const [editBodyText, setEditBodyText] = useState("");
  const [editSections, setEditSections] = useState<EmailSection[]>([]);

  // Sync working copy when document prop changes
  useEffect(() => {
    setLocalDoc(document);
  }, [document]);

  // When persona changes, update locale and currency
  const handleSelectPersona = (persona: RecipientPersona) => {
    setSelectedPersona(persona);
    setActiveLocale(persona.locale);
    setActiveCurrency(persona.currency);
  };

  // Check if current locale has an existing translation variant
  const currentVariant = useMemo<LocalizedEmailVariant | undefined>(() => {
    return localDoc.translations?.[activeLocale];
  }, [localDoc, activeLocale]);

  // Initialize edit inputs whenever activeLocale or variant changes
  useEffect(() => {
    if (currentVariant) {
      setEditSubject(currentVariant.subject || localDoc.subject || "");
      setEditPreviewText(currentVariant.previewText || localDoc.previewText || "");
      setEditBodyText(currentVariant.bodyText || "");
      setEditSections(JSON.parse(JSON.stringify(currentVariant.sections || localDoc.sections || [])));
    } else {
      setEditSubject(localDoc.subject || "");
      setEditPreviewText(localDoc.previewText || "");
      setEditBodyText("");
      setEditSections(JSON.parse(JSON.stringify(localDoc.sections || [])));
    }
  }, [activeLocale, currentVariant, localDoc]);

  // Direction: RTL for Arabic / Urdu
  const currentDirection = useMemo<"ltr" | "rtl">(() => {
    if (activeLocale === "ar" || activeLocale === "ur") return "rtl";
    return (localeConfig[activeLocale]?.dir as "ltr" | "rtl") || "ltr";
  }, [activeLocale]);

  // Live rendered HTML for the iframe
  const renderResult = useMemo(() => {
    try {
      const personalization = {
        firstName: selectedPersona.name.split(" ")[0],
        lastName: selectedPersona.name.split(" ")[1] || "",
        email: selectedPersona.email,
        storeName: "Findora Store",
        productPrice: "$99.00",
        salePrice: "$79.00",
        discount: "20% OFF",
        couponCode: "WELCOME20",
        unsubscribeUrl: "#",
      };

      return renderEmailDocument(localDoc, {
        targetLocale: activeLocale,
        targetCurrency: activeCurrency,
        exchangeRates: storeRates,
        direction: currentDirection,
        personalization,
        baseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      });
    } catch (err) {
      return {
        subject: localDoc.subject || "Email Preview",
        previewText: localDoc.previewText || "",
        html: `<div style="padding: 30px; color: #dc2626; font-family: sans-serif; text-align: center;"><h3>Rendering preview failed</h3><p>${
          err instanceof Error ? err.message : "Unknown error"
        }</p></div>`,
        text: "",
        unsubscribeUrl: "#",
        missingVariables: [],
      };
    }
  }, [localDoc, activeLocale, activeCurrency, storeRates, currentDirection, selectedPersona]);

  // Trigger AI Translation for current activeLocale
  const handleAiTranslate = async () => {
    if (activeLocale === "en" && !confirm("Translate English content into English? Press OK if you wish to generate an English variant.")) {
      return;
    }

    setIsTranslating(true);
    setTranslateSuccess(false);

    try {
      const res = await fetch("/api/v1/admin/email/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetLocale: activeLocale,
          sourceLocale: "en",
          subject: localDoc.subject,
          previewText: localDoc.previewText,
          sections: localDoc.sections,
          document: localDoc,
          preserveTokens: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.variant) {
        throw new Error(data.message || data.error || "Translation failed");
      }

      const updatedTranslations = {
        ...(localDoc.translations || {}),
        [activeLocale]: data.variant,
      };

      const updatedDoc: EmailDocument = {
        ...localDoc,
        translations: updatedTranslations,
      };

      setLocalDoc(updatedDoc);
      if (onUpdateDocument) {
        onUpdateDocument(updatedDoc);
      }

      setEditSubject(data.variant.subject);
      setEditPreviewText(data.variant.previewText || "");
      if (data.variant.sections) {
        setEditSections(JSON.parse(JSON.stringify(data.variant.sections)));
      }
      setTranslateSuccess(true);
      setTimeout(() => setTranslateSuccess(false), 2500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "AI translation failed. Please check server logs.");
    } finally {
      setIsTranslating(false);
    }
  };

  // Save manual admin edits for the current locale variant
  const handleSaveManualEdit = () => {
    const existing = localDoc.translations?.[activeLocale] || {
      locale: activeLocale,
      subject: localDoc.subject,
      previewText: localDoc.previewText,
      direction: currentDirection,
    };

    const updatedVariant: LocalizedEmailVariant = {
      ...existing,
      locale: activeLocale,
      subject: editSubject.trim(),
      previewText: editPreviewText.trim(),
      bodyText: editBodyText.trim(),
      sections: editSections.length > 0 ? editSections : existing.sections,
      direction: currentDirection,
      updatedAt: new Date().toISOString(),
    };

    const updatedDoc: EmailDocument = {
      ...localDoc,
      translations: {
        ...(localDoc.translations || {}),
        [activeLocale]: updatedVariant,
      },
    };

    setLocalDoc(updatedDoc);
    if (onUpdateDocument) {
      onUpdateDocument(updatedDoc);
    }
    setEditDrawerOpen(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-6xl w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl">
        {/* Top Header */}
        <ModalHeader className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <ModalTitle className="text-base font-bold text-white flex items-center gap-2">
                Pre-Send Visual & Multilingual Confirmation
                <span className="text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  Step 2 of 2
                </span>
              </ModalTitle>
              <p className="text-xs text-slate-400">
                Confirm exactly how your email renders for international recipients in their native language, currency, and layout direction before final dispatch.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Device Viewport Toggle */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setDevice("desktop")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                  device === "desktop"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDevice("mobile")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                  device === "mobile"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </ModalHeader>

        {/* Recipient Persona Switcher Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between gap-4 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              Simulate Market Persona:
            </span>
            <div className="flex items-center gap-1.5">
              {DEFAULT_PERSONAS.map((p) => {
                const isSelected = selectedPersona.id === p.id;
                const hasTranslation = Boolean(localDoc.translations?.[p.locale]);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPersona(p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                        : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span className="text-sm">{p.flag}</span>
                    <span className="font-semibold">{p.country.split(" ")[0]}</span>
                    <span className="text-[10px] opacity-75 font-mono">({p.currency})</span>
                    {hasTranslation && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Localized Translation Available" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Language Picker */}
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Languages className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={activeLocale}
                onChange={(e) => setActiveLocale(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="en">English (en)</option>
                <option value="fr">Français (fr)</option>
                <option value="de">Deutsch (de)</option>
                <option value="ar">العربية (ar - RTL)</option>
                <option value="ur">اردو (ur - RTL)</option>
                <option value="es">Español (es)</option>
                <option value="it">Italiano (it)</option>
              </select>
            </div>

            {/* Currency Picker */}
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={activeCurrency}
                onChange={(e) => setActiveCurrency(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="PKR">PKR (₨)</option>
                <option value="SAR">SAR (﷼)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Body: Preview & Controls */}
        <div className="flex-1 flex min-h-0 bg-slate-950 relative overflow-hidden">
          {/* Iframe Viewport Area */}
          <div className="flex-1 flex flex-col items-center justify-start p-4 overflow-y-auto bg-slate-950/90">
            {/* Active recipient bar */}
            <div className="w-full max-w-2xl mb-3 flex items-center justify-between text-xs bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl text-slate-300">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{selectedPersona.name}</span>
                <span className="text-slate-500 font-mono text-[11px]">&lt;{selectedPersona.email}&gt;</span>
                <span className="bg-slate-800 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-mono">
                  {selectedPersona.country}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-400">Rendering Direction:</span>
                <span className="font-bold text-amber-400 uppercase font-mono">{currentDirection}</span>
              </div>
            </div>

            {/* Simulated Email Envelope Box */}
            <div className="w-full max-w-2xl mb-2 bg-slate-900 border border-slate-800 rounded-t-xl px-4 py-2.5 text-xs text-slate-200 shadow-sm space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-slate-400 font-semibold w-16 shrink-0">Subject:</span>
                <span className="font-bold text-white truncate" dir={currentDirection}>
                  {renderResult.subject}
                </span>
              </div>
              {renderResult.previewText && (
                <div className="flex items-start gap-2 text-[11px] text-slate-400">
                  <span className="font-semibold w-16 shrink-0">Preheader:</span>
                  <span className="truncate" dir={currentDirection}>
                    {renderResult.previewText}
                  </span>
                </div>
              )}
            </div>

            {/* Email Canvas Iframe */}
            <div
              className={`bg-white rounded-b-xl shadow-2xl transition-all duration-300 overflow-hidden flex flex-col ${
                device === "mobile" ? "w-[375px] h-[640px]" : "w-full max-w-2xl h-[680px]"
              }`}
            >
              <iframe
                title="Email Preview"
                srcDoc={renderResult.html}
                className="w-full h-full border-none bg-white"
                sandbox="allow-same-origin"
              />
            </div>
          </div>

          {/* Right Floating Quick Action Sidebar */}
          <div className="w-72 bg-slate-900 border-l border-slate-800 p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                  Multilingual Controls
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  You have full hybrid power: let AI generate natural e-commerce phrasing, or manually edit copy before sending.
                </p>

                {/* AI Translate Action */}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isTranslating}
                  onClick={handleAiTranslate}
                  className="w-full gap-2 text-xs text-indigo-300 hover:text-white bg-indigo-950/70 hover:bg-indigo-900/90 border border-indigo-700/50 font-bold mb-2 justify-center"
                >
                  {isTranslating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  {isTranslating
                    ? "Translating..."
                    : `Auto AI Translate to ${localeConfig[activeLocale]?.label || activeLocale}`}
                </Button>

                {translateSuccess && (
                  <div className="p-2 bg-emerald-950/60 border border-emerald-700/50 rounded-lg text-emerald-300 text-[11px] flex items-center gap-1.5 mb-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    AI translation generated & applied!
                  </div>
                )}

                {/* Manual Edit Button */}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditDrawerOpen(true)}
                  className="w-full gap-2 text-xs text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700 justify-center font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Edit Translation Copy</span>
                </Button>
              </div>

              {/* Translation Status Summary */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] space-y-2">
                <span className="font-bold text-slate-300 block">Localization Status:</span>
                <div className="space-y-1 text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Target Language:</span>
                    <span className="font-semibold text-white">
                      {localeConfig[activeLocale]?.label || activeLocale}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Display Currency:</span>
                    <span className="font-semibold text-white font-mono">{activeCurrency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Variant Stored:</span>
                    <span className={currentVariant ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                      {currentVariant ? "Custom Translation Ready" : "Default English Fallback"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Direction:</span>
                    <span className="font-mono text-white uppercase">{currentDirection}</span>
                  </div>
                </div>
              </div>

              {/* Recipient Audience Summary */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] space-y-1.5">
                <span className="font-bold text-slate-300 block">Outreach Summary:</span>
                <p className="text-slate-400">
                  Campaign: <span className="text-white font-medium">{campaignName}</span>
                </p>
                <p className="text-slate-400">
                  Eligible Leads: <span className="text-white font-medium">{recipientCount} recipients</span>
                </p>
                <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                  Emails will be dynamically dispatched to each lead based on their detected country and currency with live rates.
                </p>
              </div>
            </div>

            {/* Final Action Button */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                onClick={onConfirmLaunch}
                className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-2.5 shadow-lg shadow-indigo-500/25 justify-center text-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSubmitting ? "Dispatching..." : "Confirm & Launch Campaign"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="w-full text-xs text-slate-400 hover:text-white bg-transparent hover:bg-slate-800 border-none justify-center"
              >
                Back to Audience Settings
              </Button>
            </div>
          </div>

          {/* Slide-over Drawer for In-place Translation Editing */}
          {editDrawerOpen && (
            <div className="absolute inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700 shadow-2xl p-5 z-20 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold text-white">
                      Edit {localeConfig[activeLocale]?.label || activeLocale} Translation
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditDrawerOpen(false)}
                    className="text-slate-400 hover:text-white font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Localized Subject Line
                    </label>
                    <Input
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      placeholder="Localized subject..."
                      className="text-xs bg-slate-800 border-slate-700 text-white"
                      dir={currentDirection}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Localized Preheader / Preview Text
                    </label>
                    <Input
                      value={editPreviewText}
                      onChange={(e) => setEditPreviewText(e.target.value)}
                      placeholder="Localized preview text..."
                      className="text-xs bg-slate-800 border-slate-700 text-white"
                      dir={currentDirection}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Localized Body Text (Simple Mode)
                    </label>
                    <textarea
                      value={editBodyText}
                      onChange={(e) => setEditBodyText(e.target.value)}
                      placeholder="Optional localized plain text body..."
                      rows={4}
                      className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500 resize-none font-sans"
                      dir={currentDirection}
                    />
                  </div>

                  {/* Visual Sections Product Title Editor */}
                  {editSections.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-slate-800">
                      <label className="text-[11px] font-bold text-slate-300 block">
                        Visual Products & Section Titles ({editSections.length} blocks)
                      </label>
                      {editSections.map((sec, idx) => {
                        const secContent = sec.content as any;
                        if (sec.type === "product") {
                          const prodTitle = secContent?.displayTitle || secContent?.productSnapshot?.name || "";
                          const prodDesc = secContent?.displayDescription || secContent?.productSnapshot?.description || "";
                          return (
                            <div key={sec.id || idx} className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-2">
                              <span className="text-[10px] uppercase font-bold text-indigo-400">Product Card #{idx + 1}</span>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">Product Title ({activeLocale.toUpperCase()})</label>
                                <Input
                                  value={prodTitle}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditSections((prev) => {
                                      const next = [...prev];
                                      const s = { ...next[idx] };
                                      const c = { ...(s.content as any), displayTitle: val };
                                      if (c.productSnapshot) {
                                        c.productSnapshot = { ...c.productSnapshot, name: val };
                                      }
                                      s.content = c;
                                      next[idx] = s;
                                      return next;
                                    });
                                  }}
                                  className="text-xs bg-slate-900 border-slate-700 text-white"
                                  dir={currentDirection}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">Product Description</label>
                                <textarea
                                  rows={2}
                                  value={prodDesc}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditSections((prev) => {
                                      const next = [...prev];
                                      const s = { ...next[idx] };
                                      const c = { ...(s.content as any), displayDescription: val };
                                      if (c.productSnapshot) {
                                        c.productSnapshot = { ...c.productSnapshot, description: val };
                                      }
                                      s.content = c;
                                      next[idx] = s;
                                      return next;
                                    });
                                  }}
                                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
                                  dir={currentDirection}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">Button CTA</label>
                                <Input
                                  value={secContent?.ctaText || "Shop Now"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditSections((prev) => {
                                      const next = [...prev];
                                      const s = { ...next[idx] };
                                      s.content = { ...(s.content as any), ctaText: val };
                                      next[idx] = s;
                                      return next;
                                    });
                                  }}
                                  className="text-xs bg-slate-900 border-slate-700 text-white"
                                  dir={currentDirection}
                                />
                              </div>
                            </div>
                          );
                        }
                        if (sec.type === "product-grid") {
                          const items = secContent?.items || secContent?.products || [];
                          return (
                            <div key={sec.id || idx} className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700 space-y-2">
                              <span className="text-[10px] uppercase font-bold text-indigo-400">Product Grid #{idx + 1}</span>
                              {items.map((itm: any, itmIdx: number) => (
                                <div key={itm.id || itmIdx} className="space-y-0.5">
                                  <label className="text-[10px] text-slate-400 block">Item #{itmIdx + 1} Title</label>
                                  <Input
                                    value={itm.name || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditSections((prev) => {
                                        const next = [...prev];
                                        const s = { ...next[idx] };
                                        const sContent = { ...(s.content as any) };
                                        const sItems = [...(sContent?.items || sContent?.products || [])];
                                        if (sItems[itmIdx]) {
                                          sItems[itmIdx] = { ...sItems[itmIdx], name: val };
                                          sContent.items = sItems;
                                        }
                                        s.content = sContent;
                                        next[idx] = s;
                                        return next;
                                      });
                                    }}
                                    className="text-xs bg-slate-900 border-slate-700 text-white"
                                    dir={currentDirection}
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}

                  <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-lg text-[11px] text-indigo-300 leading-relaxed">
                    <p className="font-semibold mb-1">Tip:</p>
                    <p>
                      Keep tokens like {"{{firstName}}"}, {"{{productName}}"} and {"{{couponCode}}"} exactly as shown so recipient personalization works seamlessly.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditDrawerOpen(false)}
                  className="bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveManualEdit}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Save & Apply Translation
                </Button>
              </div>
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
