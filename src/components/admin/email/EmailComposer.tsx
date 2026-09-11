"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ds/modal";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Badge } from "@/components/ds/badge";
import { toast, toastError } from "@/hooks/use-toast";
import {
  Sparkles,
  Send,
  Eye,
  Smartphone,
  Monitor,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  ChevronDown,
  Save,
  Layers,
  Wand2,
  Plus,
  X,
  RotateCcw,
  FileText,
  Layout,
  ExternalLink,
  Globe,
  Tag,
  Copy,
  Check,
  User,
  Clock,
  ArrowRight,
  Trash2,
  Languages,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { TemplateSelectorModal, type SelectedTemplateResult } from "./TemplateSelectorModal";
import { renderEmailDocument } from "@/lib/email/document-renderer";
import {
  createSimpleEmailDocument,
  createDefaultEmailDocument,
  STARTER_SIMPLE_TEMPLATES,
  type StarterSimpleTemplate,
} from "@/lib/email/document-defaults";
import type { EmailDocument, LocalizedEmailVariant } from "@/lib/email/document-schema";
import { useExchangeRates } from "@/stores/locale-store";
import { countryLocaleMap, countryCurrencyMap } from "@/lib/geo/country-preferences";
import { localeConfig, currencies } from "@/config/locales";

export interface SelectedLeadContext {
  _id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  phoneCountry?: string;
  phone?: string;
  emailSentCount?: number;
  lastEmailSentAt?: string | Date;
  isSuppressed?: boolean;
  cooldownUntil?: string | Date;
  brand?: string;
}

interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: SelectedLeadContext[];
  onSuccess?: () => void;
  initialSubject?: string;
  initialBody?: string;
}

interface ProductItem {
  _id: string;
  name: string;
  slug: string;
  pricing?: { price: number; compareAtPrice?: number };
  media?: { url: string }[];
  description?: string;
}

const AVAILABLE_TOKENS = [
  { token: "{{firstName}}", label: "First Name", example: "Sarah" },
  { token: "{{lastName}}", label: "Last Name", example: "Jenkins" },
  { token: "{{email}}", label: "Email Address", example: "sarah@example.com" },
  { token: "{{storeName}}", label: "Store Name", example: "Findora Store" },
  { token: "{{country}}", label: "Country", example: "United States" },
  { token: "{{productName}}", label: "Product Name", example: "Wireless ANC Headphones" },
  { token: "{{couponCode}}", label: "Coupon Code", example: "VIPOFFER20" },
  { token: "{{unsubscribeUrl}}", label: "Unsubscribe Link", example: "#" },
];

export function EmailComposer({
  open,
  onOpenChange,
  leads,
  onSuccess,
  initialSubject = "",
  initialBody = "",
}: EmailComposerProps) {
  const storeRates = useExchangeRates();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tab & Viewport
  const [tab, setTab] = useState<"edit" | "preview" | "review">("edit");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Template Engine State
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null);
  const [composerFormat, setComposerFormat] = useState<"simple" | "visual">("simple");
  const [isModifiedFromTemplate, setIsModifiedFromTemplate] = useState(false);
  const [visualDoc, setVisualDoc] = useState<EmailDocument | null>(null);

  // Core Form State
  const [campaignName, setCampaignName] = useState("");
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("premium, warm, and professional");
  const [subject, setSubject] = useState(initialSubject);
  const [previewText, setPreviewText] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState(initialBody);

  // Simple CTA & Sign-off State
  const [enableCta, setEnableCta] = useState(true);
  const [ctaText, setCtaText] = useState("Shop Collection");
  const [ctaUrl, setCtaUrl] = useState("/products");
  const [signOff, setSignOff] = useState("Warm regards,\nThe Findora Team");

  // Offer & Delivery
  const [couponCode, setCouponCode] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [bypassCooldown, setBypassCooldown] = useState(true);

  // Product Selector State
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<ProductItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);

  // AI & Review States
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isGeneratingSubjects, setIsGeneratingSubjects] = useState(false);
  const [subjectOptions, setSubjectOptions] = useState<Array<{ subject: string; angle: string }>>([]);
  const [isReviewingAi, setIsReviewingAi] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState<{
    clarityScore: number;
    toneAssessment: string;
    warnings: string[];
    suggestions: string[];
  } | null>(null);

  // Test Email
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Save as New Template Modal State
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState("general_promotion");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Primary lead context for personalization & localization auto-detection
  const primaryLead = leads[0];
  const leadCountryCode = (
    primaryLead?.country ||
    primaryLead?.phoneCountry ||
    "US"
  ).toUpperCase();
  const detectedLocale = countryLocaleMap[leadCountryCode] || "en";
  const detectedCurrency = countryCurrencyMap[leadCountryCode] || "USD";

  // Localization State (auto-selected by lead country, with manual override)
  const [activeLocale, setActiveLocale] = useState<string>(detectedLocale);
  const [activeCurrency, setActiveCurrency] = useState<string>(detectedCurrency);
  const [templateTranslations, setTemplateTranslations] = useState<Record<string, LocalizedEmailVariant>>({});
  const [isTranslatingLocale, setIsTranslatingLocale] = useState(false);

  // Direction: RTL for Arabic or Urdu
  const isRtl = activeLocale === "ar" || activeLocale === "ur";
  const currentVariant = useMemo<LocalizedEmailVariant | undefined>(() => {
    return activeLocale === "en" ? undefined : templateTranslations[activeLocale];
  }, [activeLocale, templateTranslations]);

  // Active copy for the currently selected locale (distinct per language)
  const activeSubject = activeLocale === "en" ? subject : (currentVariant?.subject ?? subject);
  const activePreviewText = activeLocale === "en" ? previewText : (currentVariant?.previewText ?? previewText);
  const activeBody = activeLocale === "en" ? body : (currentVariant?.bodyText ?? body);
  const activeVisualSections = activeLocale === "en"
    ? (visualDoc?.sections || [])
    : (currentVariant?.sections && currentVariant.sections.length > 0 ? currentVariant.sections : (visualDoc?.sections || []));

  // Auto-detect and initialize localization preferences from lead country
  useEffect(() => {
    if (!open) return;
    const code = (primaryLead?.country || primaryLead?.phoneCountry || "US").toUpperCase();
    const loc = countryLocaleMap[code] || "en";
    const curr = countryCurrencyMap[code] || "USD";
    setActiveLocale(loc);
    setActiveCurrency(curr);
  }, [open, primaryLead]);

  // Initialize or reset composer when modal opens
  useEffect(() => {
    if (!open) return;

    if (!campaignName) {
      if (leads.length === 1 && (primaryLead?.firstName || primaryLead?.email)) {
        const leadName = [primaryLead.firstName, primaryLead.lastName].filter(Boolean).join(" ") || primaryLead.email;
        setCampaignName(`Direct Outreach - ${leadName}`);
      } else {
        setCampaignName(`Lead Outreach Batch (${leads.length} leads)`);
      }
    }

    if (!subject) {
      setSubject(
        leads.length === 1 && primaryLead?.firstName
          ? `Special invitation for you, ${primaryLead.firstName}`
          : "An exclusive update for our valued customers"
      );
    }

    if (!body) {
      setBody(
        leads.length === 1 && primaryLead?.firstName
          ? `Hi ${primaryLead.firstName},\n\nI wanted to reach out personally to see how everything is going and share an exclusive offer we prepared for you.\n\nPlease let me know if you have any questions or need any assistance.`
          : `Hi {{firstName}},\n\nWe wanted to personally reach out and share an exclusive offer we prepared for you.\n\nEnjoy handpicked selections and special member savings.`
      );
    }
  }, [open, leads, primaryLead, campaignName, subject, body]);

  // Track modification when user alters subject, preview or body after picking a template
  const handleSubjectChange = (val: string) => {
    if (activeLocale === "en") {
      setSubject(val);
    } else {
      setTemplateTranslations((prev) => ({
        ...prev,
        [activeLocale]: {
          ...(prev[activeLocale] || {
            locale: activeLocale,
            previewText: activePreviewText,
            bodyText: activeBody,
            sections: visualDoc?.sections,
            direction: isRtl ? "rtl" : "ltr",
          }),
          subject: val,
          updatedAt: new Date().toISOString(),
        },
      }));
    }
    if (selectedTemplateId) setIsModifiedFromTemplate(true);
  };

  const handlePreviewTextChange = (val: string) => {
    if (activeLocale === "en") {
      setPreviewText(val);
    } else {
      setTemplateTranslations((prev) => ({
        ...prev,
        [activeLocale]: {
          ...(prev[activeLocale] || {
            locale: activeLocale,
            subject: activeSubject,
            bodyText: activeBody,
            sections: visualDoc?.sections,
            direction: isRtl ? "rtl" : "ltr",
          }),
          previewText: val,
          updatedAt: new Date().toISOString(),
        },
      }));
    }
    if (selectedTemplateId) setIsModifiedFromTemplate(true);
  };

  const handleBodyChange = (val: string) => {
    if (activeLocale === "en") {
      setBody(val);
    } else {
      setTemplateTranslations((prev) => ({
        ...prev,
        [activeLocale]: {
          ...(prev[activeLocale] || {
            locale: activeLocale,
            subject: activeSubject,
            previewText: activePreviewText,
            sections: visualDoc?.sections,
            direction: isRtl ? "rtl" : "ltr",
          }),
          bodyText: val,
          updatedAt: new Date().toISOString(),
        },
      }));
    }
    if (selectedTemplateId) setIsModifiedFromTemplate(true);
  };

  // Search product catalog
  useEffect(() => {
    if (!productSearch.trim()) {
      setProductResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingProduct(true);
      try {
        const res = await fetch(`/api/v1/products?q=${encodeURIComponent(productSearch)}&limit=5`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.items)) {
          setProductResults(data.data.items);
        }
      } catch {
        // Ignore search errors
      } finally {
        setIsSearchingProduct(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch]);

  // Insert token at cursor in body textarea
  const insertToken = (token: string) => {
    if (!textareaRef.current) {
      setBody((prev) => prev + " " + token);
      if (selectedTemplateId) setIsModifiedFromTemplate(true);
      return;
    }
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + token + after;
    setBody(newText);
    if (selectedTemplateId) setIsModifiedFromTemplate(true);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  // Compile full EmailDocument dynamically
  const compiledDocument = useMemo<EmailDocument>(() => {
    let baseDoc: EmailDocument;
    if (composerFormat === "visual" && visualDoc) {
      baseDoc = {
        ...visualDoc,
        subject: subject.trim() || visualDoc.subject,
        previewText: previewText.trim() || visualDoc.previewText,
      };
    } else {
      baseDoc = createSimpleEmailDocument(subject.trim() || "Special Offer", body, {
        previewText: previewText.trim() || undefined,
        buttonText: enableCta && ctaText.trim() ? ctaText.trim() : undefined,
        buttonUrl: enableCta && ctaUrl.trim() ? ctaUrl.trim() : undefined,
        signOff: signOff.trim() || undefined,
      });
    }

    if (Object.keys(templateTranslations).length > 0) {
      baseDoc = {
        ...baseDoc,
        translations: templateTranslations,
      };
    }
    return baseDoc;
  }, [composerFormat, visualDoc, subject, previewText, body, enableCta, ctaText, ctaUrl, signOff, templateTranslations]);

  // Live real-time rendered preview
  const previewHtml = useMemo(() => {
    try {
      const personalization = {
        firstName: primaryLead?.firstName || "Sarah",
        lastName: primaryLead?.lastName || "Jenkins",
        email: primaryLead?.email || "sarah@example.com",
        storeName: "Findora Store",
        country: primaryLead?.country || "United States",
        productName: selectedProduct?.name || "Wireless ANC Headphones",
        productPrice: selectedProduct?.pricing?.price ? `$${selectedProduct.pricing.price}` : "$99.00",
        salePrice: selectedProduct?.pricing?.compareAtPrice ? `$${selectedProduct.pricing.compareAtPrice}` : "$79.00",
        couponCode: couponCode || "VIPOFFER20",
        unsubscribeUrl: "#unsubscribe",
      };

      const res = renderEmailDocument(compiledDocument, {
        personalization,
        targetLocale: activeLocale,
        targetCurrency: activeCurrency,
        direction: isRtl ? "rtl" : "ltr",
        exchangeRates: storeRates,
      });

      return res.html;
    } catch (err) {
      return `<div style="padding: 24px; color: #dc2626; font-family: sans-serif;">Failed to render live preview: ${
        err instanceof Error ? err.message : "Unknown error"
      }</div>`;
    }
  }, [compiledDocument, primaryLead, selectedProduct, couponCode, activeLocale, activeCurrency, isRtl, storeRates]);

  // Handle template selection from TemplateSelectorModal
  const handleLoadTemplate = (tpl: SelectedTemplateResult) => {
    setSelectedTemplateId(tpl.templateId || null);
    setSelectedTemplateName(tpl.name);
    setComposerFormat(tpl.templateType);
    setSubject(tpl.subject);
    setIsModifiedFromTemplate(false);

    if (tpl.templateType === "simple") {
      setBody(tpl.bodyText || tpl.emailDocument?.subject || "");
      if (tpl.emailDocument?.previewText) {
        setPreviewText(tpl.emailDocument.previewText);
      }
    } else {
      setVisualDoc(tpl.emailDocument);
      if (tpl.emailDocument?.previewText) {
        setPreviewText(tpl.emailDocument.previewText);
      }
    }

    if (tpl.emailDocument?.translations) {
      setTemplateTranslations(tpl.emailDocument.translations);
    } else {
      setTemplateTranslations({});
    }

    setTemplateSelectorOpen(false);
    toast({
      variant: "success",
      title: "Template Loaded",
      description: `Loaded "${tpl.name}". You can now customize it for this lead.`,
    });
  };

  // Handle loading a starter preset
  const handleApplyPreset = (preset: StarterSimpleTemplate) => {
    setSelectedTemplateId(null);
    setSelectedTemplateName(`Preset: ${preset.name}`);
    setComposerFormat("simple");
    setSubject(preset.subject);
    setPreviewText(preset.previewText || "");
    setBody(preset.bodyText);
    setTemplateTranslations({});
    if (preset.buttonText && preset.buttonUrl) {
      setEnableCta(true);
      setCtaText(preset.buttonText);
      setCtaUrl(preset.buttonUrl);
    } else {
      setEnableCta(false);
    }
    if (preset.signOff) {
      setSignOff(preset.signOff);
    }
    setIsModifiedFromTemplate(false);
    toast({
      variant: "success",
      title: "Preset Loaded",
      description: `Loaded starter preset "${preset.name}".`,
    });
  };

  // Clear loaded template to custom scratch
  const handleResetToCustom = () => {
    setSelectedTemplateId(null);
    setSelectedTemplateName(null);
    setIsModifiedFromTemplate(false);
    setVisualDoc(null);
    setComposerFormat("simple");
    setTemplateTranslations({});
  };

  // Visual Section mutation helpers (supports per-language editing)
  const updateVisualSection = (sectionIndex: number, field: string, value: any) => {
    const baseSections = activeLocale === "en" ? (visualDoc?.sections || []) : activeVisualSections;
    if (!baseSections || baseSections.length === 0) return;
    const newSections = [...baseSections];
    const targetSection = { ...newSections[sectionIndex] };
    targetSection.content = {
      ...(targetSection.content as any),
      [field]: value,
    };
    newSections[sectionIndex] = targetSection;

    if (activeLocale === "en") {
      if (visualDoc) {
        setVisualDoc({
          ...visualDoc,
          sections: newSections,
        });
      }
    } else {
      setTemplateTranslations((prev) => ({
        ...prev,
        [activeLocale]: {
          ...(prev[activeLocale] || {
            locale: activeLocale,
            subject: activeSubject,
            previewText: activePreviewText,
            bodyText: activeBody,
            direction: isRtl ? "rtl" : "ltr",
          }),
          sections: newSections,
          updatedAt: new Date().toISOString(),
        },
      }));
    }
    setIsModifiedFromTemplate(true);
  };

  const updateProductTitle = (sectionIndex: number, val: string) => {
    const baseSections = activeLocale === "en" ? (visualDoc?.sections || []) : activeVisualSections;
    if (!baseSections || !baseSections[sectionIndex]) return;
    const newSections = [...baseSections];
    const targetSection = { ...newSections[sectionIndex] };
    const content = { ...(targetSection.content as any) };
    content.displayTitle = val;
    if (content.productSnapshot) {
      content.productSnapshot = { ...content.productSnapshot, name: val };
    }
    targetSection.content = content;
    newSections[sectionIndex] = targetSection;

    if (activeLocale === "en") {
      if (visualDoc) {
        setVisualDoc({ ...visualDoc, sections: newSections });
      }
    } else {
      setTemplateTranslations((prev) => ({
        ...prev,
        [activeLocale]: {
          ...(prev[activeLocale] || {
            locale: activeLocale,
            subject: activeSubject,
            previewText: activePreviewText,
            bodyText: activeBody,
            direction: isRtl ? "rtl" : "ltr",
          }),
          sections: newSections,
          updatedAt: new Date().toISOString(),
        },
      }));
    }
    setIsModifiedFromTemplate(true);
  };

  const updateProductDescription = (sectionIndex: number, val: string) => {
    const baseSections = activeLocale === "en" ? (visualDoc?.sections || []) : activeVisualSections;
    if (!baseSections || !baseSections[sectionIndex]) return;
    const newSections = [...baseSections];
    const targetSection = { ...newSections[sectionIndex] };
    const content = { ...(targetSection.content as any) };
    content.displayDescription = val;
    if (content.productSnapshot) {
      content.productSnapshot = { ...content.productSnapshot, description: val };
    }
    targetSection.content = content;
    newSections[sectionIndex] = targetSection;

    if (activeLocale === "en") {
      if (visualDoc) {
        setVisualDoc({ ...visualDoc, sections: newSections });
      }
    } else {
      setTemplateTranslations((prev) => ({
        ...prev,
        [activeLocale]: {
          ...(prev[activeLocale] || {
            locale: activeLocale,
            subject: activeSubject,
            previewText: activePreviewText,
            bodyText: activeBody,
            direction: isRtl ? "rtl" : "ltr",
          }),
          sections: newSections,
          updatedAt: new Date().toISOString(),
        },
      }));
    }
    setIsModifiedFromTemplate(true);
  };

  const updateProductGridItem = (sectionIndex: number, itemIndex: number, field: "name" | "badge", val: string) => {
    const baseSections = activeLocale === "en" ? (visualDoc?.sections || []) : activeVisualSections;
    if (!baseSections || !baseSections[sectionIndex]) return;
    const newSections = [...baseSections];
    const targetSection = { ...newSections[sectionIndex] };
    const content = { ...(targetSection.content as any) };
    const items = [...(content.items || content.products || [])];
    if (items[itemIndex]) {
      items[itemIndex] = { ...items[itemIndex], [field]: val };
      content.items = items;
    }
    targetSection.content = content;
    newSections[sectionIndex] = targetSection;

    if (activeLocale === "en") {
      if (visualDoc) {
        setVisualDoc({ ...visualDoc, sections: newSections });
      }
    } else {
      setTemplateTranslations((prev) => ({
        ...prev,
        [activeLocale]: {
          ...(prev[activeLocale] || {
            locale: activeLocale,
            subject: activeSubject,
            previewText: activePreviewText,
            bodyText: activeBody,
            direction: isRtl ? "rtl" : "ltr",
          }),
          sections: newSections,
          updatedAt: new Date().toISOString(),
        },
      }));
    }
    setIsModifiedFromTemplate(true);
  };

  const insertTokenIntoVisualSection = (sectionIndex: number, field: string, token: string) => {
    const currentVal = (activeVisualSections[sectionIndex]?.content as any)?.[field] || "";
    updateVisualSection(sectionIndex, field, currentVal ? `${currentVal} ${token}` : token);
  };

  const removeVisualSection = (sectionIndex: number) => {
    if (activeVisualSections.length <= 1) return;
    const newSections = activeVisualSections.filter((_, idx) => idx !== sectionIndex);
    if (activeLocale === "en") {
      if (visualDoc) {
        setVisualDoc({
          ...visualDoc,
          sections: newSections,
        });
      }
    } else {
      setTemplateTranslations((prev) => ({
        ...prev,
        [activeLocale]: {
          ...(prev[activeLocale] || {
            locale: activeLocale,
            subject: activeSubject,
            previewText: activePreviewText,
            bodyText: activeBody,
            direction: isRtl ? "rtl" : "ltr",
          }),
          sections: newSections,
          updatedAt: new Date().toISOString(),
        },
      }));
    }
    setIsModifiedFromTemplate(true);
  };

  const duplicateVisualSection = (sectionIndex: number) => {
    const sectionToDup = activeVisualSections[sectionIndex];
    if (!sectionToDup) return;
    const cloned = {
      ...sectionToDup,
      id: `section_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    const newSections = [...activeVisualSections];
    newSections.splice(sectionIndex + 1, 0, cloned);
    if (activeLocale === "en") {
      if (visualDoc) {
        setVisualDoc({
          ...visualDoc,
          sections: newSections,
        });
      }
    } else {
      setTemplateTranslations((prev) => ({
        ...prev,
        [activeLocale]: {
          ...(prev[activeLocale] || {
            locale: activeLocale,
            subject: activeSubject,
            previewText: activePreviewText,
            bodyText: activeBody,
            direction: isRtl ? "rtl" : "ltr",
          }),
          sections: newSections,
          updatedAt: new Date().toISOString(),
        },
      }));
    }
    setIsModifiedFromTemplate(true);
  };

  // AI Translation of current template to activeLocale
  const handleTranslateToActiveLocale = async (targetLoc?: string) => {
    const loc = targetLoc || activeLocale;
    if (loc === "en") {
      toast({
        title: "English is Base Language",
        description: "English is the default master template. Switch to another language (e.g. French, Arabic, German, Spanish) to translate.",
      });
      return;
    }

    setIsTranslatingLocale(true);
    try {
      const res = await fetch("/api/v1/admin/email/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetLocale: loc,
          sourceLocale: "en",
          subject: activeSubject,
          previewText: activePreviewText,
          bodyText: activeBody,
          sections: activeVisualSections,
          document: compiledDocument,
          preserveTokens: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to translate template.");
      }

      const variant: LocalizedEmailVariant = data.variant || data.data?.variant;
      if (variant) {
        setTemplateTranslations((prev) => ({
          ...prev,
          [loc]: variant,
        }));
        setIsModifiedFromTemplate(true);
        const langName = localeConfig[loc]?.label || loc.toUpperCase();
        toast({
          variant: "success",
          title: `Translated to ${langName}`,
          description: `Generated distinct ${langName} variant. You can inspect and edit it independently.`,
        });
      }
    } catch (err) {
      toastError("Translation Failed", err instanceof Error ? err.message : "Error translating template");
    } finally {
      setIsTranslatingLocale(false);
    }
  };

  // AI Generation
  const handleWriteWithAi = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/v1/admin/email/ai/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: goal || `Personal outreach to valued customer ${primaryLead?.firstName || ""}`,
          tone,
          couponCode,
          product: selectedProduct
            ? {
                name: selectedProduct.name,
                description: selectedProduct.description,
                price: selectedProduct.pricing?.price,
                salePrice: selectedProduct.pricing?.compareAtPrice,
              }
            : undefined,
          leadContext:
            leads.length === 1
              ? {
                  firstName: primaryLead?.firstName,
                  previousEmailsCount: primaryLead?.emailSentCount || 0,
                }
              : undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.draft) {
        const d = data.data.draft;
        setSubject(d.subject);
        setPreviewText(d.previewText);
        setHeadline(d.headline);
        setBody(d.body);
        if (d.ctaText) setCtaText(d.ctaText);
        if (selectedTemplateId) setIsModifiedFromTemplate(true);
        toast({ variant: "success", title: "AI Draft Generated" });
      } else {
        toastError("AI Generation Failed", data.error || "Please try again or edit manually.");
      }
    } catch {
      toastError("AI Generation Error", "Network error during AI generation.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // AI Subject Line Generator
  const handleGenerateSubjects = async () => {
    setIsGeneratingSubjects(true);
    try {
      const res = await fetch("/api/v1/admin/email/ai/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: selectedProduct?.name,
          headline: headline || subject,
          bodySnippet: body,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.options)) {
        setSubjectOptions(data.data.options);
      } else {
        toastError("Could not generate subjects", data.error);
      }
    } catch {
      toastError("Error", "Failed to generate subject options.");
    } finally {
      setIsGeneratingSubjects(false);
    }
  };

  // AI Improve action
  const handleImproveAi = async (
    action: "shorter" | "more_premium" | "more_friendly" | "more_persuasive" | "less_salesy" | "improve_cta" | "fix_grammar"
  ) => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/v1/admin/email/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentDraft: { subject: activeSubject, previewText: activePreviewText, headline, body: activeBody, ctaText },
          action,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.draft) {
        const d = data.data.draft;
        if (activeLocale === "en") {
          setSubject(d.subject);
          setPreviewText(d.previewText);
          setHeadline(d.headline);
          setBody(d.body);
          if (d.ctaText) setCtaText(d.ctaText);
        } else {
          setTemplateTranslations((prev) => ({
            ...prev,
            [activeLocale]: {
              ...(prev[activeLocale] || {
                locale: activeLocale,
                sections: visualDoc?.sections,
                direction: isRtl ? "rtl" : "ltr",
              }),
              subject: d.subject,
              previewText: d.previewText,
              bodyText: d.body,
              updatedAt: new Date().toISOString(),
            },
          }));
        }
        if (selectedTemplateId) setIsModifiedFromTemplate(true);
        toast({ variant: "success", title: `Applied: ${action.replace("_", " ")}` });
      } else {
        toastError("Improvement failed", data.error);
      }
    } catch {
      toastError("Error", "Could not improve draft.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // AI Pre-Send Review
  const handlePreSendReview = async () => {
    setIsReviewingAi(true);
    try {
      const res = await fetch("/api/v1/admin/email/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: activeSubject, previewText: activePreviewText, headline, body: activeBody, ctaText }),
      });
      const data = await res.json();
      if (data.success && data.data?.review) {
        setAiReviewResult(data.data.review);
        setTab("review");
      } else {
        toastError("Review failed", data.error);
      }
    } catch {
      toastError("Error", "Could not complete AI review.");
    } finally {
      setIsReviewingAi(false);
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      toastError("Enter email address", "Please provide a valid recipient for the test email.");
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await fetch("/api/v1/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: testEmailAddress.trim(),
          subject: activeSubject.trim() || "Test Email",
          previewText: activePreviewText,
          headline,
          body: activeBody,
          ctaText,
          ctaUrl,
          couponCode,
          emailDocument: compiledDocument,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ variant: "success", title: "Test Email Sent", description: data.data.message });
      } else {
        toastError("Test Send Failed", data.error);
      }
    } catch {
      toastError("Error", "Could not send test email.");
    } finally {
      setIsSendingTest(false);
    }
  };

  // Core Dispatcher to /api/v1/admin/email/campaigns
  const dispatchEmailCampaign = async () => {
    const payload = {
      name: campaignName.trim(),
      objective: goal || "Personal Lead Outreach",
      subject: activeSubject.trim() || subject.trim(),
      previewText: activePreviewText.trim() || previewText.trim(),
      headline: headline.trim(),
      body: activeBody.trim() || body.trim(),
      ctaText: enableCta ? ctaText.trim() : undefined,
      ctaUrl: enableCta ? ctaUrl.trim() : undefined,
      couponCode: couponCode.trim(),
      emailDocument: compiledDocument,
      leadIds: leads.map((l) => l._id),
      overrideLocale: activeLocale,
      overrideCurrency: activeCurrency,
      sendImmediately: !scheduleDate,
      scheduledAt: scheduleDate ? new Date(scheduleDate).toISOString() : undefined,
      ignoreCooldown: bypassCooldown,
    };

    const res = await fetch("/api/v1/admin/email/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || "Failed to dispatch email.");
    }

    return data;
  };

  // Option 1: Send Without Saving (Leaves master library template clean)
  const handleSendWithoutSaving = async () => {
    if (!activeSubject.trim()) {
      toastError("Subject required", "Please provide a subject line.");
      return;
    }
    if (!activeBody.trim() && composerFormat !== "visual") {
      toastError("Body required", "Please write the email content.");
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatchEmailCampaign();
      toast({
        variant: "success",
        title: "Email Dispatched",
        description: `Sent customized email to ${leads.length} recipient(s). Master template was left unchanged.`,
      });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toastError("Dispatch Failed", err instanceof Error ? err.message : "Error sending email");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Option 2: Save Changes to Template & Send
  const handleSaveAndSend = async () => {
    if (!selectedTemplateId) {
      handleSendWithoutSaving();
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update library template
      await fetch(`/api/v1/admin/email/templates/${selectedTemplateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectTemplate: subject.trim(),
          previewTextTemplate: previewText.trim(),
          bodyTemplate: body,
          ctaTemplate: enableCta ? ctaText.trim() : undefined,
          ctaUrlTemplate: enableCta ? ctaUrl.trim() : undefined,
          emailDocument: compiledDocument,
          translations: templateTranslations,
        }),
      });

      // 2. Dispatch email
      await dispatchEmailCampaign();
      toast({
        variant: "success",
        title: "Template Saved & Email Sent",
        description: `Master template updated in library and email dispatched to ${leads.length} recipient(s).`,
      });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toastError("Operation Failed", err instanceof Error ? err.message : "Failed to save & send");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Option 3: Save as New Template
  const handleSaveAsNewTemplate = async (andSend: boolean = false) => {
    if (!newTemplateName.trim()) {
      toastError("Name Required", "Please enter a name for the new template.");
      return;
    }

    setIsSavingTemplate(true);
    try {
      const res = await fetch("/api/v1/admin/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          templateType: composerFormat,
          category: newTemplateCategory,
          description: newTemplateDescription.trim() || undefined,
          subjectTemplate: subject.trim(),
          previewTextTemplate: previewText.trim(),
          bodyTemplate: body,
          ctaTemplate: enableCta ? ctaText.trim() : undefined,
          ctaUrlTemplate: enableCta ? ctaUrl.trim() : undefined,
          emailDocument: compiledDocument,
          translations: templateTranslations,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to save new template.");

      const createdTpl = data.template || data.data?.template;
      setSelectedTemplateId(createdTpl?._id || null);
      setSelectedTemplateName(newTemplateName.trim());
      setIsModifiedFromTemplate(false);
      setSaveAsModalOpen(false);
      setNewTemplateName("");
      setNewTemplateDescription("");

      toast({
        variant: "success",
        title: "New Template Saved",
        description: `Registered "${newTemplateName}" permanently in your template library.`,
      });

      if (andSend) {
        await handleSendWithoutSaving();
      }
    } catch (err) {
      toastError("Save Failed", err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Option 4: Save Template Only (no send)
  const handleSaveTemplateOnly = async () => {
    if (!selectedTemplateId) return;
    setIsSavingTemplate(true);
    try {
      const res = await fetch(`/api/v1/admin/email/templates/${selectedTemplateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectTemplate: subject.trim(),
          previewTextTemplate: previewText.trim(),
          bodyTemplate: body,
          ctaTemplate: enableCta ? ctaText.trim() : undefined,
          ctaUrlTemplate: enableCta ? ctaUrl.trim() : undefined,
          emailDocument: compiledDocument,
          translations: templateTranslations,
        }),
      });

      if (!res.ok) throw new Error("Failed to save changes to template.");

      setIsModifiedFromTemplate(false);
      toast({
        variant: "success",
        title: "Template Saved",
        description: `Saved changes to "${selectedTemplateName}".`,
      });
    } catch (err) {
      toastError("Save Error", err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen && (templateSelectorOpen || saveAsModalOpen)) {
            return;
          }
          onOpenChange(isOpen);
        }}
      >
        <DialogContent
          onPointerDownOutside={(e) => {
            e.preventDefault();
          }}
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
          className="max-h-[94vh] max-w-5xl w-[96vw] overflow-y-auto p-0 rounded-2xl shadow-2xl bg-white border border-gray-200 text-gray-900"
        >
          {/* Header Bar */}
          <DialogHeader className="border-b border-gray-200 bg-slate-50/80 px-6 py-4 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                    Lead Email Outreach
                    <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                      Direct 1-on-1 Contact
                    </span>
                  </DialogTitle>
                  {/* Recipient Lead Context Badge */}
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-600">
                    <span className="flex items-center gap-1 font-semibold text-gray-900">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {leads.length === 1
                        ? [primaryLead?.firstName, primaryLead?.lastName].filter(Boolean).join(" ") || primaryLead?.email
                        : `${leads.length} Selected Leads`}
                    </span>
                    {leads.length === 1 && primaryLead?.email && (
                      <span className="font-mono text-[11px] text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
                        {primaryLead.email}
                      </span>
                    )}
                    {leads.length === 1 && (primaryLead?.country || primaryLead?.phoneCountry) && (
                      <span className="bg-white border border-gray-200 px-2 py-0.5 rounded text-[11px] text-gray-600 font-medium">
                        🌍 {primaryLead.country || primaryLead.phoneCountry}
                      </span>
                    )}
                    {leads.length === 1 && (
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {(primaryLead?.emailSentCount ?? 0) > 0
                          ? `Contacted ${primaryLead?.emailSentCount}x`
                          : "Never contacted"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* View Tabs */}
              <div className="flex items-center gap-1 bg-gray-200/80 p-1 rounded-xl">
                <Button
                  variant={tab === "edit" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setTab("edit")}
                  className={`text-xs h-8 ${tab === "edit" ? "bg-indigo-600 text-white shadow-xs" : "text-gray-700 hover:text-gray-900"}`}
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Compose & Edit
                </Button>
                <Button
                  variant={tab === "preview" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setTab("preview")}
                  className={`text-xs h-8 ${tab === "preview" ? "bg-indigo-600 text-white shadow-xs" : "text-gray-700 hover:text-gray-900"}`}
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Live Lead Preview
                </Button>
                <Button
                  variant={tab === "review" ? "primary" : "ghost"}
                  size="sm"
                  onClick={handlePreSendReview}
                  disabled={isReviewingAi}
                  className={`text-xs h-8 ${tab === "review" ? "bg-indigo-600 text-white shadow-xs" : "text-gray-700 hover:text-gray-900"}`}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                  AI Quality Check
                </Button>
              </div>
            </div>

            {/* Template Selector & Presets Action Sub-bar */}
            <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setTemplateSelectorOpen(true)}
                  className="h-7 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 font-semibold gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Choose Template from Library</span>
                </Button>

                {/* Quick Presets Dropdown */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 font-medium text-[11px]">Quick Starters:</span>
                  <div className="flex items-center gap-1">
                    {STARTER_SIMPLE_TEMPLATES.slice(0, 3).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-gray-900 rounded text-[11px] font-medium transition"
                      >
                        {p.name.replace("Founder Note - ", "")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Template Status Pill */}
              <div className="flex items-center gap-2">
                {selectedTemplateName ? (
                  <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                    <span className="text-[11px] text-gray-600">Template:</span>
                    <span className="font-bold text-indigo-900 text-[11px] max-w-40 truncate">
                      {selectedTemplateName}
                    </span>
                    {isModifiedFromTemplate ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] px-1.5">
                        Modified
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] px-1.5">
                        Original
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={handleResetToCustom}
                      title="Reset to blank custom scratch"
                      className="text-gray-400 hover:text-gray-700 ml-1 font-bold text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-gray-500 font-medium bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
                    Custom 1-on-1 Scratch
                  </span>
                )}

                {/* Format Toggle Pill */}
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => setComposerFormat("simple")}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      composerFormat === "simple" ? "bg-white text-indigo-600 shadow-2xs font-bold" : "text-gray-600"
                    }`}
                  >
                    Simple Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerFormat("visual")}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      composerFormat === "visual" ? "bg-white text-indigo-600 shadow-2xs font-bold" : "text-gray-600"
                    }`}
                  >
                    Visual Studio
                  </button>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* TAB 1: COMPOSE & EDIT */}
          {tab === "edit" && (
            <div className="grid gap-6 p-6 lg:grid-cols-3">
              {/* Left 2 Columns: Email Composition */}
              <div className="space-y-4 lg:col-span-2">
                {/* Visual Format Banner if active */}
                {composerFormat === "visual" && (
                  <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-900">
                    <div className="flex items-center gap-2">
                      <Layout className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>
                        Using visual blocks format (banners, hero, product grids, buttons).
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-7 text-xs bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-100"
                    >
                      <Link href="/admin/campaigns/new">Open Full Visual Studio</Link>
                    </Button>
                  </div>
                )}

                {/* Localization & Currency Control Bar */}
                <div className="p-3 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-indigo-100 rounded-xl space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-indigo-600 text-white rounded-md shadow-2xs">
                        <Languages className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900">
                            Language & Currency
                          </span>
                          {isRtl && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] px-1.5 py-0 font-medium">
                              ⇄ RTL Active
                            </Badge>
                          )}
                          {activeLocale !== "en" && currentVariant && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] px-1.5 py-0 font-medium">
                              ✓ Translated
                            </Badge>
                          )}
                          {activeLocale !== "en" && !currentVariant && (
                            <Badge className="bg-gray-100 text-gray-600 border-gray-300 text-[9px] px-1.5 py-0 font-medium">
                              Untranslated (Fallback to EN)
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500">
                          Auto-configured from recipient's country with full manual override.
                        </span>
                      </div>
                    </div>

                    {/* Quick reset to lead defaults if modified */}
                    {primaryLead && (detectedLocale !== activeLocale || detectedCurrency !== activeCurrency) && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveLocale(detectedLocale);
                          setActiveCurrency(detectedCurrency);
                          toast({
                            title: "Reset to Lead Country Defaults",
                            description: `Switched back to ${detectedLocale.toUpperCase()} and ${detectedCurrency}.`,
                          });
                        }}
                        className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        Reset to Lead Default ({detectedLocale.toUpperCase()} / {detectedCurrency})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                    {/* Language Dropdown */}
                    <div className="sm:col-span-5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        Content Language
                      </label>
                      <select
                        value={activeLocale}
                        onChange={(e) => setActiveLocale(e.target.value)}
                        className="w-full h-8 text-xs font-medium rounded-lg border border-gray-200 bg-white px-2.5 text-gray-800 focus:border-indigo-500 focus:outline-none shadow-2xs"
                      >
                        <option value="en">🇺🇸 English (Default Master)</option>
                        {Object.entries(localeConfig)
                          .filter(([code]) => code !== "en")
                          .map(([code, meta]) => {
                            const hasTranslation = !!templateTranslations[code];
                            const isRtlLang = code === "ar" || code === "ur";
                            return (
                              <option key={code} value={code}>
                                {meta.label} ({meta.nativeLabel}){isRtlLang ? " [RTL]" : ""}
                                {hasTranslation ? " • ✓ Translated" : ""}
                              </option>
                            );
                          })}
                      </select>
                    </div>

                    {/* AI Translate Trigger Button */}
                    <div className="sm:col-span-3 flex items-end">
                      {activeLocale !== "en" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleTranslateToActiveLocale()}
                          disabled={isTranslatingLocale}
                          className="w-full h-8 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 font-bold"
                        >
                          {isTranslatingLocale ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                          ) : (
                            <Wand2 className="w-3 h-3 mr-1.5 text-indigo-600" />
                          )}
                          {currentVariant ? "Re-Translate (AI)" : "Translate (AI)"}
                        </Button>
                      ) : (
                        <div className="w-full h-8 flex items-center justify-center text-[11px] text-gray-400 font-medium bg-gray-50 rounded-lg border border-gray-100">
                          Base Language (EN)
                        </div>
                      )}
                    </div>

                    {/* Currency Dropdown */}
                    <div className="sm:col-span-4">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                          Currency
                        </label>
                        <span className="text-[9px] font-mono text-gray-400">
                          Rate: {storeRates[activeCurrency] || 1}
                        </span>
                      </div>
                      <select
                        value={activeCurrency}
                        onChange={(e) => setActiveCurrency(e.target.value)}
                        className="w-full h-8 text-xs font-medium rounded-lg border border-gray-200 bg-white px-2.5 text-gray-800 focus:border-indigo-500 focus:outline-none shadow-2xs font-mono"
                      >
                        {currencies.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} ({c.symbol}) — {c.rate !== 1 ? `Rate ${c.rate}` : "Base USD"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Subject Line & AI Generator */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="camp-subject" className="text-xs font-bold text-gray-700">
                      Subject Line <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-gray-400">
                        {activeSubject.length}/60 chars
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateSubjects}
                        disabled={isGeneratingSubjects}
                        className="h-6 text-[11px] text-indigo-600 hover:bg-indigo-50 font-bold px-2"
                      >
                        {isGeneratingSubjects ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Wand2 className="w-3 h-3 mr-1" />
                        )}
                        AI Angles
                      </Button>
                    </div>
                  </div>
                  <Input
                    id="camp-subject"
                    value={activeSubject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    dir={isRtl ? "rtl" : "ltr"}
                    placeholder="e.g. Special offer for you, Sarah"
                    className={`text-xs ${isRtl ? "text-right" : ""}`}
                  />

                  {/* AI Suggested Angles Dropdown */}
                  {subjectOptions.length > 0 && (
                    <div className="mt-2 space-y-1 rounded-xl border border-indigo-100 bg-indigo-50/60 p-2.5 text-xs">
                      <div className="flex items-center justify-between pb-1 border-b border-indigo-100 text-[10px] font-bold text-indigo-700 uppercase">
                        <span>AI Recommended Angles</span>
                        <button
                          type="button"
                          onClick={() => setSubjectOptions([])}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                      {subjectOptions.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          className="flex w-full items-center justify-between rounded-lg p-1.5 text-left text-xs text-gray-800 hover:bg-white transition"
                          onClick={() => {
                            handleSubjectChange(opt.subject);
                            setSubjectOptions([]);
                          }}
                        >
                          <span className="truncate">{opt.subject}</span>
                          <Badge variant="outline" className="text-[9px] uppercase ml-2 text-indigo-700 bg-indigo-100">
                            {opt.angle.replace("_", " ")}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preheader / Preview Text */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="camp-preview" className="text-xs font-bold text-gray-700">
                      Preview Text (Preheader)
                    </Label>
                    <span className="text-[10px] font-mono text-gray-400">
                      {activePreviewText.length}/90 chars
                    </span>
                  </div>
                  <Input
                    id="camp-preview"
                    value={activePreviewText}
                    onChange={(e) => handlePreviewTextChange(e.target.value)}
                    dir={isRtl ? "rtl" : "ltr"}
                    placeholder="Engaging inbox preview snippet shown next to subject..."
                    className={`text-xs ${isRtl ? "text-right" : ""}`}
                  />
                </div>

                {composerFormat === "visual" && visualDoc ? (
                  /* Visual Blocks In-Place Section Editor */
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Layout className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-indigo-950 block">
                            Visual Layout Blocks ({activeVisualSections.length})
                          </span>
                          <span className="text-[11px] text-indigo-700">
                            Edit headlines, copy, CTAs, and banners in {localeConfig[activeLocale]?.label || activeLocale.toUpperCase()}.
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setTemplateSelectorOpen(true)}
                          className="h-7 text-xs bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-100 font-medium"
                        >
                          <Layers className="w-3.5 h-3.5 mr-1" />
                          Change Template
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const textParts = activeVisualSections
                              .map((s) => s.content?.text || s.content?.headline || s.content?.subtitle || "")
                              .filter(Boolean)
                              .join("\n\n");
                            setBody(textParts || body);
                            setComposerFormat("simple");
                          }}
                          className="h-7 text-xs text-gray-600 hover:text-gray-900 font-medium"
                        >
                          Convert to Simple
                        </Button>
                      </div>
                    </div>

                    {/* Section Cards */}
                    <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                      {activeVisualSections.map((sec, sIdx) => {
                        const blockType = sec.type;
                        return (
                          <div
                            key={sec.id || sIdx}
                            className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-xs space-y-2.5 transition hover:border-indigo-300"
                          >
                            {/* Section Header */}
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                  #{sIdx + 1}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 border-indigo-200"
                                >
                                  {blockType}
                                </Badge>
                                <span className="text-xs font-bold text-gray-800 truncate max-w-64">
                                  {sec.content?.headline || sec.content?.title || `${blockType.toUpperCase()} BLOCK`}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => duplicateVisualSection(sIdx)}
                                  title="Duplicate block"
                                  className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded transition"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                {activeVisualSections.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeVisualSection(sIdx)}
                                    title="Delete block"
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Block Content Fields */}
                            {blockType === "hero" && (
                              <div className="space-y-2 text-xs">
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                    Hero Headline
                                  </label>
                                  <Input
                                    value={sec.content?.headline || ""}
                                    onChange={(e) => updateVisualSection(sIdx, "headline", e.target.value)}
                                    dir={isRtl ? "rtl" : "ltr"}
                                    placeholder="Big bold headline..."
                                    className={`text-xs ${isRtl ? "text-right" : ""}`}
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                    Subtitle / Tagline
                                  </label>
                                  <Input
                                    value={sec.content?.subtitle || ""}
                                    onChange={(e) => updateVisualSection(sIdx, "subtitle", e.target.value)}
                                    dir={isRtl ? "rtl" : "ltr"}
                                    placeholder="Supporting description..."
                                    className={`text-xs ${isRtl ? "text-right" : ""}`}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                      Button Text
                                    </label>
                                    <Input
                                      value={sec.content?.buttonText || sec.content?.ctaText || ""}
                                      onChange={(e) => updateVisualSection(sIdx, "buttonText", e.target.value)}
                                      dir={isRtl ? "rtl" : "ltr"}
                                      placeholder="Shop Now"
                                      className={`text-xs ${isRtl ? "text-right" : ""}`}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                      Button URL
                                    </label>
                                    <Input
                                      value={sec.content?.buttonUrl || sec.content?.ctaUrl || ""}
                                      onChange={(e) => updateVisualSection(sIdx, "buttonUrl", e.target.value)}
                                      placeholder="/products"
                                      className="text-xs"
                                    />
                                  </div>
                                </div>
                                {sec.content?.imageUrl !== undefined && (
                                  <div>
                                    <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                      Hero Banner Image URL
                                    </label>
                                    <Input
                                      value={sec.content?.imageUrl || ""}
                                      onChange={(e) => updateVisualSection(sIdx, "imageUrl", e.target.value)}
                                      placeholder="https://..."
                                      className="text-xs"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {blockType === "text" && (
                              <div className="space-y-2 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                  <label className="text-[11px] font-semibold text-gray-600">
                                    Text Content
                                  </label>
                                  <div className="flex flex-wrap gap-1">
                                    {AVAILABLE_TOKENS.slice(0, 4).map((item) => (
                                      <button
                                        key={item.token}
                                        type="button"
                                        onClick={() => insertTokenIntoVisualSection(sIdx, "text", item.token)}
                                        className="rounded bg-gray-100 hover:bg-indigo-100 hover:text-indigo-800 text-gray-700 px-1 py-0.2 font-mono text-[9px] border border-gray-200"
                                      >
                                        +{item.token}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <textarea
                                  rows={4}
                                  value={sec.content?.text || ""}
                                  onChange={(e) => updateVisualSection(sIdx, "text", e.target.value)}
                                  dir={isRtl ? "rtl" : "ltr"}
                                  placeholder="Paragraph copy..."
                                  className={`w-full rounded-lg border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none leading-relaxed font-sans ${
                                    isRtl ? "text-right" : ""
                                  }`}
                                />
                              </div>
                            )}

                            {blockType === "button" && (
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                    Button Label
                                  </label>
                                  <Input
                                    value={sec.content?.buttonText || sec.content?.text || ""}
                                    onChange={(e) => updateVisualSection(sIdx, "buttonText", e.target.value)}
                                    dir={isRtl ? "rtl" : "ltr"}
                                    placeholder="Click Here"
                                    className={`text-xs ${isRtl ? "text-right" : ""}`}
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                    Target URL
                                  </label>
                                  <Input
                                    value={sec.content?.buttonUrl || sec.content?.url || ""}
                                    onChange={(e) => updateVisualSection(sIdx, "buttonUrl", e.target.value)}
                                    placeholder="https://..."
                                    className="text-xs"
                                  />
                                </div>
                              </div>
                            )}

                            {blockType === "product" && (
                              <div className="space-y-2.5 text-xs">
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">
                                    Product Title / Name ({activeLocale.toUpperCase()})
                                  </label>
                                  <Input
                                    value={(sec.content as any)?.displayTitle || (sec.content as any)?.productSnapshot?.name || ""}
                                    onChange={(e) => updateProductTitle(sIdx, e.target.value)}
                                    dir={isRtl ? "rtl" : "ltr"}
                                    placeholder="Product title in current language..."
                                    className={`text-xs font-medium ${isRtl ? "text-right" : ""}`}
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">
                                    Product Description ({activeLocale.toUpperCase()})
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={(sec.content as any)?.displayDescription || (sec.content as any)?.productSnapshot?.description || ""}
                                    onChange={(e) => updateProductDescription(sIdx, e.target.value)}
                                    dir={isRtl ? "rtl" : "ltr"}
                                    placeholder="Product description in current language..."
                                    className={`w-full rounded-lg border border-gray-200 p-2 text-xs text-gray-800 focus:border-indigo-500 focus:outline-none ${
                                      isRtl ? "text-right" : ""
                                    }`}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                      Button CTA Text
                                    </label>
                                    <Input
                                      value={(sec.content as any)?.ctaText || "Shop Now"}
                                      onChange={(e) => updateVisualSection(sIdx, "ctaText", e.target.value)}
                                      dir={isRtl ? "rtl" : "ltr"}
                                      placeholder="Shop Now"
                                      className={`text-xs ${isRtl ? "text-right" : ""}`}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                      Badge / Tag
                                    </label>
                                    <Input
                                      value={(sec.content as any)?.badgeText || ""}
                                      onChange={(e) => updateVisualSection(sIdx, "badgeText", e.target.value)}
                                      dir={isRtl ? "rtl" : "ltr"}
                                      placeholder="e.g. Limited Deal"
                                      className={`text-xs ${isRtl ? "text-right" : ""}`}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                    Section Header (Optional)
                                  </label>
                                  <Input
                                    value={(sec.content as any)?.title || ""}
                                    onChange={(e) => updateVisualSection(sIdx, "title", e.target.value)}
                                    dir={isRtl ? "rtl" : "ltr"}
                                    placeholder="e.g. Featured Pick"
                                    className={`text-xs ${isRtl ? "text-right" : ""}`}
                                  />
                                </div>
                                <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 flex items-center justify-between">
                                  <span>Dynamic Price: {activeCurrency} (Rate: {storeRates[activeCurrency] || 1}x)</span>
                                  <span className="font-mono text-[10px] text-indigo-600">ID: {(sec.content as any)?.productId || "snapshot"}</span>
                                </div>
                              </div>
                            )}

                            {blockType === "product-grid" && (
                              <div className="space-y-2.5 text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                      Grid Header
                                    </label>
                                    <Input
                                      value={(sec.content as any)?.title || ""}
                                      onChange={(e) => updateVisualSection(sIdx, "title", e.target.value)}
                                      dir={isRtl ? "rtl" : "ltr"}
                                      placeholder="Featured Collection"
                                      className={`text-xs ${isRtl ? "text-right" : ""}`}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                      Grid Subtitle
                                    </label>
                                    <Input
                                      value={(sec.content as any)?.subtitle || ""}
                                      onChange={(e) => updateVisualSection(sIdx, "subtitle", e.target.value)}
                                      dir={isRtl ? "rtl" : "ltr"}
                                      placeholder="Handpicked essentials"
                                      className={`text-xs ${isRtl ? "text-right" : ""}`}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                    Card Button CTA
                                  </label>
                                  <Input
                                    value={(sec.content as any)?.ctaText || "Shop Now"}
                                    onChange={(e) => updateVisualSection(sIdx, "ctaText", e.target.value)}
                                    dir={isRtl ? "rtl" : "ltr"}
                                    placeholder="Shop Now"
                                    className={`text-xs ${isRtl ? "text-right" : ""}`}
                                  />
                                </div>
                                {Array.isArray((sec.content as any)?.items || (sec.content as any)?.products) && ((sec.content as any)?.items || (sec.content as any)?.products).length > 0 && (
                                  <div className="space-y-1.5 pt-1">
                                    <label className="text-[11px] font-bold text-gray-700 block">
                                      Grid Items ({activeLocale.toUpperCase()} Titles):
                                    </label>
                                    {((sec.content as any)?.items || (sec.content as any)?.products).map((item: any, itmIdx: number) => (
                                      <div key={item.id || itmIdx} className="p-2 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold">
                                          <span>Item #{itmIdx + 1}</span>
                                          <span className="font-mono">{item.price ? `${activeCurrency} ${item.price}` : ""}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1.5">
                                          <div className="col-span-2">
                                            <Input
                                              value={item.name || ""}
                                              onChange={(e) => updateProductGridItem(sIdx, itmIdx, "name", e.target.value)}
                                              dir={isRtl ? "rtl" : "ltr"}
                                              placeholder="Product name..."
                                              className={`text-xs bg-white ${isRtl ? "text-right" : ""}`}
                                            />
                                          </div>
                                          <div>
                                            <Input
                                              value={item.badge || ""}
                                              onChange={(e) => updateProductGridItem(sIdx, itmIdx, "badge", e.target.value)}
                                              dir={isRtl ? "rtl" : "ltr"}
                                              placeholder="Badge (e.g. Hot)"
                                              className={`text-xs bg-white ${isRtl ? "text-right" : ""}`}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {(blockType === "banner" || blockType === "coupon") && (
                              <div className="space-y-2 text-xs">
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                    Banner Text / Headline
                                  </label>
                                  <Input
                                    value={sec.content?.headline || sec.content?.text || ""}
                                    onChange={(e) => updateVisualSection(sIdx, "headline", e.target.value)}
                                    dir={isRtl ? "rtl" : "ltr"}
                                    placeholder="Special announcement..."
                                    className={`text-xs ${isRtl ? "text-right" : ""}`}
                                  />
                                </div>
                                {sec.content?.couponCode !== undefined && (
                                  <div>
                                    <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                      Coupon Code
                                    </label>
                                    <Input
                                      value={sec.content?.couponCode || ""}
                                      onChange={(e) => updateVisualSection(sIdx, "couponCode", e.target.value)}
                                      placeholder="DISCOUNT20"
                                      className="text-xs font-mono"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {blockType === "footer" && (
                              <div className="space-y-2 text-xs">
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                                    Footer Note / Company Address
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={sec.content?.address || sec.content?.text || ""}
                                    onChange={(e) => updateVisualSection(sIdx, "address", e.target.value)}
                                    dir={isRtl ? "rtl" : "ltr"}
                                    placeholder="Company info..."
                                    className={`w-full rounded-lg border border-gray-200 p-2 text-xs text-gray-800 focus:border-indigo-500 focus:outline-none ${
                                      isRtl ? "text-right" : ""
                                    }`}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Simple Format Body Textarea, CTA, and Sign-off */
                  <>
                    {/* Body Textarea & Variable Pills (Simple Format) */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1 pb-1">
                        <Label htmlFor="camp-body" className="text-xs font-bold text-gray-700">
                          Email Body Content <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex flex-wrap gap-1 text-[11px] items-center">
                          <span className="text-gray-400 text-[10px] font-semibold">Tokens:</span>
                          {AVAILABLE_TOKENS.map((item) => (
                            <button
                              key={item.token}
                              type="button"
                              onClick={() => insertToken(item.token)}
                              title={`Insert ${item.label} (e.g. ${item.example})`}
                              className="rounded bg-gray-100 hover:bg-indigo-100 hover:text-indigo-800 text-gray-700 px-1.5 py-0.5 font-mono text-[10px] transition border border-gray-200"
                            >
                              +{item.token}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        ref={textareaRef}
                        id="camp-body"
                        rows={9}
                        dir={isRtl ? "rtl" : "ltr"}
                        className={`w-full rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y font-sans leading-relaxed ${
                          isRtl ? "text-right" : ""
                        }`}
                        value={activeBody}
                        onChange={(e) => handleBodyChange(e.target.value)}
                        placeholder="Write your email here, load a template, or click '✨ Write with AI'..."
                      />
                    </div>

                    {/* CTA Button Settings */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableCta}
                            onChange={(e) => {
                              setEnableCta(e.target.checked);
                              if (selectedTemplateId) setIsModifiedFromTemplate(true);
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Include Call-to-Action Button</span>
                        </label>
                      </div>

                      {enableCta && (
                        <div className="grid gap-3 sm:grid-cols-2 pt-1">
                          <div>
                            <Label htmlFor="camp-cta" className="text-[11px] text-gray-600 block mb-1">
                              Button Text
                            </Label>
                            <Input
                              id="camp-cta"
                              value={ctaText}
                              onChange={(e) => {
                                setCtaText(e.target.value);
                                if (selectedTemplateId) setIsModifiedFromTemplate(true);
                              }}
                              placeholder="e.g. Explore Collection"
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <Label htmlFor="camp-url" className="text-[11px] text-gray-600 block mb-1">
                              Button Target URL
                            </Label>
                            <Input
                              id="camp-url"
                              value={ctaUrl}
                              onChange={(e) => {
                                setCtaUrl(e.target.value);
                                if (selectedTemplateId) setIsModifiedFromTemplate(true);
                              }}
                              placeholder="/products or https://..."
                              className="text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sign-off Block */}
                    <div>
                      <Label htmlFor="camp-signoff" className="text-xs font-bold text-gray-700 block mb-1">
                        Sign-off / Signature
                      </Label>
                      <textarea
                        id="camp-signoff"
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none resize-none font-sans"
                        value={signOff}
                        onChange={(e) => {
                          setSignOff(e.target.value);
                          if (selectedTemplateId) setIsModifiedFromTemplate(true);
                        }}
                        placeholder="Warm regards,\nThe Findora Team"
                      />
                    </div>
                  </>
                )}

                {/* Offer & Timing Section */}
                <div className="grid gap-3 sm:grid-cols-2 pt-1">
                  <div>
                    <Label htmlFor="camp-coupon" className="text-xs font-bold text-gray-700 block mb-1">
                      Promo / Coupon Code (Optional)
                    </Label>
                    <Input
                      id="camp-coupon"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="e.g. VIP20"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="camp-schedule" className="text-xs font-bold text-gray-700 block mb-1">
                      Schedule Delivery (Leave empty to send now)
                    </Label>
                    <Input
                      id="camp-schedule"
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Cooldown Bypass Checkbox */}
                <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bypassCooldown}
                      onChange={(e) => setBypassCooldown(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Priority 1-on-1 Contact (Bypass cooldown timer)</span>
                  </label>
                  <p className="text-[10px] text-gray-500 ml-5 mt-0.5">
                    Ensures direct individual emails reach the recipient immediately without being delayed by bulk campaign cooldowns.
                  </p>
                </div>
              </div>

              {/* Right Column: AI Assistant & Product Attachment */}
              <div className="space-y-4 rounded-xl border border-gray-200 bg-slate-50/70 p-4 text-xs">
                {/* AI Assistant Card */}
                <div>
                  <h4 className="flex items-center gap-1.5 font-bold text-gray-900 text-xs mb-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    AI Copywriter & Polish
                  </h4>

                  <div className="space-y-2.5">
                    <div>
                      <Label htmlFor="ai-goal" className="text-[11px] text-gray-600 mb-1 block">
                        Goal / Purpose
                      </Label>
                      <Input
                        id="ai-goal"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="e.g. Follow up on cart & offer 15% off"
                        className="text-xs bg-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="ai-tone" className="text-[11px] text-gray-600 mb-1 block">
                        Tone
                      </Label>
                      <Input
                        id="ai-tone"
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        placeholder="e.g. VIP, warm, concise, friendly"
                        className="text-xs bg-white"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isGeneratingAi}
                      onClick={handleWriteWithAi}
                      className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 justify-center"
                    >
                      {isGeneratingAi ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Generate Draft with AI</span>
                    </Button>

                    {/* Quick AI Polish Buttons */}
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                        1-Click AI Polish:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          disabled={isGeneratingAi || !body.trim()}
                          onClick={() => handleImproveAi("more_persuasive")}
                          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-indigo-50 text-[11px] text-gray-700 font-medium text-left transition disabled:opacity-50"
                        >
                          ⚡ More Persuasive
                        </button>
                        <button
                          type="button"
                          disabled={isGeneratingAi || !body.trim()}
                          onClick={() => handleImproveAi("shorter")}
                          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-indigo-50 text-[11px] text-gray-700 font-medium text-left transition disabled:opacity-50"
                        >
                          ✂️ Concise & Short
                        </button>
                        <button
                          type="button"
                          disabled={isGeneratingAi || !body.trim()}
                          onClick={() => handleImproveAi("more_friendly")}
                          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-indigo-50 text-[11px] text-gray-700 font-medium text-left transition disabled:opacity-50"
                        >
                          😊 Friendlier Tone
                        </button>
                        <button
                          type="button"
                          disabled={isGeneratingAi || !body.trim()}
                          onClick={() => handleImproveAi("fix_grammar")}
                          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-indigo-50 text-[11px] text-gray-700 font-medium text-left transition disabled:opacity-50"
                        >
                          🔍 Fix Grammar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attach Catalog Product */}
                <div className="pt-3 border-t border-gray-200">
                  <h4 className="font-bold text-gray-900 text-xs mb-2 flex items-center justify-between">
                    <span>Feature Catalog Product</span>
                    {selectedProduct && (
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(null)}
                        className="text-[10px] text-red-600 font-bold hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </h4>

                  {selectedProduct ? (
                    <div className="p-2.5 bg-white border border-gray-200 rounded-xl space-y-1.5">
                      <p className="font-bold text-gray-900 truncate">{selectedProduct.name}</p>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-semibold text-indigo-600 font-mono">
                          ${selectedProduct.pricing?.price ?? "N/A"}
                        </span>
                        {selectedProduct.pricing?.compareAtPrice && (
                          <span className="line-through text-gray-400 font-mono text-[10px]">
                            ${selectedProduct.pricing.compareAtPrice}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Input
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search product name or SKU..."
                        className="text-xs bg-white mb-2"
                      />

                      {isSearchingProduct && (
                        <p className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Searching products...
                        </p>
                      )}

                      {productResults.length > 0 && (
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {productResults.map((p) => (
                            <button
                              key={p._id}
                              type="button"
                              onClick={() => {
                                setSelectedProduct(p);
                                setProductSearch("");
                                setProductResults([]);
                                if (!ctaUrl || ctaUrl === "/products") {
                                  setCtaUrl(`/products/${p.slug}`);
                                }
                              }}
                              className="w-full text-left p-1.5 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition text-xs flex items-center justify-between"
                            >
                              <span className="truncate font-medium text-gray-800">{p.name}</span>
                              <span className="text-indigo-600 font-mono text-[10px] shrink-0 ml-1">
                                ${p.pricing?.price ?? ""}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Recipient Details Mini-Card */}
                <div className="pt-3 border-t border-gray-200 text-[11px] space-y-1 text-gray-600">
                  <span className="font-bold text-gray-800 block">Outreach Specs:</span>
                  <div className="flex items-center justify-between">
                    <span>Target Audience:</span>
                    <span className="font-semibold text-gray-900">{leads.length} lead(s)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Currency Context:</span>
                    <span className="font-semibold font-mono text-gray-900">{activeCurrency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Locale:</span>
                    <span className="font-semibold text-gray-900">{localeConfig[activeLocale]?.label || activeLocale.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE LEAD PREVIEW */}
          {tab === "preview" && (
            <div className="p-6 space-y-4 bg-slate-100 min-h-[500px]">
              <div className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-xl">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-gray-900">Simulating Recipient:</span>
                  <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold border border-indigo-100">
                    {primaryLead?.firstName || "Sarah"} ({primaryLead?.email || "sarah@example.com"})
                  </span>
                  <span className="text-gray-500 font-mono text-[11px]">
                    Currency: {activeCurrency} (Rate: {storeRates[activeCurrency] || 1})
                  </span>
                </div>

                {/* Device Viewport Toggle */}
                <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                      previewDevice === "desktop"
                        ? "bg-white text-indigo-600 shadow-2xs"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop (600px)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                      previewDevice === "mobile"
                        ? "bg-white text-indigo-600 shadow-2xs"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile (375px)</span>
                  </button>
                </div>
              </div>

              {/* Subject Bar in Preview */}
              <div className="bg-white border border-gray-200 rounded-t-xl px-4 py-2.5 text-xs space-y-1" dir={isRtl ? "rtl" : "ltr"}>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-400 w-16 shrink-0">Subject:</span>
                  <span className="font-bold text-gray-900">
                    {activeSubject.replace(/\{\{firstName\}\}/gi, primaryLead?.firstName || "Sarah")}
                  </span>
                </div>
                {activePreviewText && (
                  <div className="flex items-start gap-2 text-[11px] text-gray-500">
                    <span className="font-semibold text-gray-400 w-16 shrink-0">Preheader:</span>
                    <span>{activePreviewText}</span>
                  </div>
                )}
              </div>

              {/* Iframe Viewport */}
              <div className="flex justify-center">
                <div
                  className={`bg-white rounded-b-xl shadow-lg transition-all duration-300 overflow-hidden ${
                    previewDevice === "mobile" ? "w-[375px] h-[560px]" : "w-full max-w-2xl h-[580px]"
                  }`}
                >
                  <iframe
                    title="Live Lead Preview"
                    srcDoc={previewHtml}
                    className="w-full h-full border-none bg-white"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI QUALITY REVIEW */}
          {tab === "review" && (
            <div className="p-6 space-y-6">
              {isReviewingAi ? (
                <div className="flex h-64 flex-col items-center justify-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <p className="text-xs text-gray-500">
                    Evaluating subject lines, spam flags, tone, and call-to-actions…
                  </p>
                </div>
              ) : aiReviewResult ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-slate-50 p-4">
                    <div>
                      <h4 className="text-base font-bold text-gray-900">Content Health Assessment</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Tone: {aiReviewResult.toneAssessment}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black text-indigo-600">
                        {aiReviewResult.clarityScore}
                      </span>
                      <span className="text-xs text-gray-400">/100</span>
                    </div>
                  </div>

                  {aiReviewResult.warnings.length > 0 && (
                    <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <h5 className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        Attention Flags ({aiReviewResult.warnings.length}):
                      </h5>
                      <ul className="list-inside list-disc space-y-1 text-xs text-amber-800">
                        {aiReviewResult.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiReviewResult.suggestions.length > 0 && (
                    <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
                      <h5 className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Optimization Recommendations:
                      </h5>
                      <ul className="list-inside list-disc space-y-1 text-xs text-gray-600">
                        {aiReviewResult.suggestions.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 text-xs">
                  Click AI Quality Review to evaluate this draft.
                </div>
              )}
            </div>
          )}

          {/* Test Email Bar */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Send Test Email:</span>
              <Input
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="your.email@company.com"
                className="text-xs h-7 w-52 bg-white"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSendingTest || !testEmailAddress.trim()}
                onClick={handleSendTestEmail}
                className="h-7 text-xs"
              >
                {isSendingTest ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                Dispatch Test
              </Button>
            </div>

            <div className="text-[11px] text-gray-400">
              {leads.length} recipient lead(s) ready
            </div>
          </div>

          {/* Dialog Footer with the 3-Way Action Engine */}
          <DialogFooter className="border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSaveAsModalOpen(true)}
                title="Save current composition as a brand-new reusable template"
                className="gap-1.5 text-xs text-indigo-700 bg-white hover:bg-indigo-50 border-indigo-200 font-semibold"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Save as New Template</span>
              </Button>

              {selectedTemplateId && isModifiedFromTemplate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSavingTemplate}
                  onClick={handleSaveTemplateOnly}
                  className="text-xs text-gray-700"
                >
                  <Save className="w-3.5 h-3.5 mr-1 text-gray-500" />
                  Save Changes to Template
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>

              {/* If a library template was loaded, offer Send Without Saving vs Save & Send */}
              {selectedTemplateId ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting || !subject.trim() || !body.trim()}
                    onClick={handleSendWithoutSaving}
                    title="Send this customized copy to this lead without modifying the master library template"
                    className="text-xs font-semibold border-gray-300 text-gray-800 hover:bg-gray-100"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Send className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                    )}
                    <span>Send Without Saving</span>
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting || !subject.trim() || !body.trim()}
                    onClick={handleSaveAndSend}
                    title="Update master library template and send email"
                    className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    <span>Save & Send</span>
                  </Button>
                </>
              ) : (
                /* Standard Send when composing custom */
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting || !subject.trim() || !body.trim()}
                  onClick={handleSendWithoutSaving}
                  className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-1.5 px-4"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {scheduleDate
                      ? "Schedule Email"
                      : `Send Email Now (${leads.length})`}
                  </span>
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Selector Modal */}
      <TemplateSelectorModal
        open={templateSelectorOpen}
        onOpenChange={setTemplateSelectorOpen}
        onSelectTemplate={handleLoadTemplate}
      />

      {/* Save As New Template Modal */}
      <Dialog open={saveAsModalOpen} onOpenChange={setSaveAsModalOpen}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-xl border border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 text-base font-bold">
              <Save className="w-4 h-4 text-indigo-600" />
              Save As New Reusable Template
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <p className="text-gray-500 leading-relaxed">
              Register this customized email format permanently into your template library so you can reuse it for future leads and outreach campaigns.
            </p>

            <div>
              <label className="text-[11px] font-bold text-gray-700 mb-1 block">
                Template Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g. VIP Customer Personal Follow-up"
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 mb-1 block">
                Category
              </label>
              <select
                value={newTemplateCategory}
                onChange={(e) => setNewTemplateCategory(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="general_promotion">General Promotion</option>
                <option value="flash_sale">Flash Sale</option>
                <option value="new_arrivals">New Arrivals</option>
                <option value="welcome_series">Welcome Series</option>
                <option value="re_engagement">Re-engagement</option>
                <option value="abandoned_cart">Abandoned Cart</option>
                <option value="newsletter">Newsletter</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 mb-1 block">
                Description (Optional)
              </label>
              <textarea
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="Brief summary or purpose of this template..."
                rows={2}
                className="w-full text-xs rounded-lg border border-gray-200 p-2 text-gray-800 focus:border-indigo-500 focus:outline-none resize-none font-sans"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSaveAsModalOpen(false)}
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSavingTemplate || !newTemplateName.trim()}
                onClick={() => handleSaveAsNewTemplate(false)}
                className="text-xs"
              >
                {isSavingTemplate ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Save Template Only
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isSavingTemplate || !newTemplateName.trim()}
                onClick={() => handleSaveAsNewTemplate(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                {isSavingTemplate ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Save & Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
