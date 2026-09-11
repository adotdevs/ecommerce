"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Monitor,
  Smartphone,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  RotateCcw,
  BookOpen,
  Tag,
  ExternalLink,
  Info,
  Languages,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ds/modal";
import { createSimpleEmailDocument, STARTER_SIMPLE_TEMPLATES, type StarterSimpleTemplate } from "@/lib/email/document-defaults";
import { renderEmailDocument } from "@/lib/email/document-renderer";
import type { EmailDocument, LocalizedEmailVariant } from "@/lib/email/document-schema";
import { localeConfig } from "@/config/locales";

export interface SimpleTemplateData {
  id?: string;
  name: string;
  subject: string;
  previewText?: string;
  bodyText: string;
  buttonText?: string;
  buttonUrl?: string;
  signOff?: string;
  tags?: string[];
  templateType: "simple";
  translations?: Record<string, LocalizedEmailVariant>;
}

interface SimpleTemplateEditorProps {
  templateId?: string;
  initialData?: Partial<SimpleTemplateData>;
  onSave?: (data: SimpleTemplateData & { emailDocument: EmailDocument; previewHtml: string }) => Promise<void>;
  onApplyToCampaign?: (data: { subject: string; emailDocument: EmailDocument; bodyText: string }) => void;
  isCampaignMode?: boolean;
  backUrl?: string;
}

const AVAILABLE_VARIABLES = [
  { token: "{{firstName}}", label: "First Name", example: "Sarah" },
  { token: "{{lastName}}", label: "Last Name", example: "Jenkins" },
  { token: "{{storeName}}", label: "Store Name", example: "Apex Store" },
  { token: "{{email}}", label: "Recipient Email", example: "sarah@example.com" },
  { token: "{{unsubscribeUrl}}", label: "Unsubscribe Link", example: "https://.../unsubscribe" },
];

export function SimpleTemplateEditor({
  templateId,
  initialData,
  onSave,
  onApplyToCampaign,
  isCampaignMode = false,
  backUrl = "/admin/campaigns/templates",
}: SimpleTemplateEditorProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Form State
  const [name, setName] = useState(initialData?.name || "Simple Outreach Note");
  const [subject, setSubject] = useState(initialData?.subject || "A quick note for {{firstName}}");
  const [previewText, setPreviewText] = useState(initialData?.previewText || "Important update regarding your account");
  const [bodyText, setBodyText] = useState(
    initialData?.bodyText ||
      `Hi {{firstName}},\n\nI wanted to personally reach out and say thank you for being part of {{storeName}}.\n\nWe have a special announcement and wanted to make sure you were the first to know.\n\nPlease feel free to reply directly to this email if you have any questions or feedback.`
  );
  const [enableButton, setEnableButton] = useState(Boolean(initialData?.buttonText && initialData?.buttonUrl));
  const [buttonText, setButtonText] = useState(initialData?.buttonText || "Explore Our Collection");
  const [buttonUrl, setButtonUrl] = useState(initialData?.buttonUrl || "/products");
  const [signOff, setSignOff] = useState(initialData?.signOff || "Warm regards,\nThe {{storeName}} Team");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initialData?.tags || ["simple", "personal"]);

  // UI state
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [personalizePreview, setPersonalizePreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testSentSuccess, setTestSentSuccess] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null);

  // Save as new template modal state
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState("general_promotion");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [savingNewTemplate, setSavingNewTemplate] = useState(false);
  const [saveNewSuccess, setSaveNewSuccess] = useState(false);

  // Localization State
  const [activeLocale, setActiveLocale] = useState<string>("en");
  const [translations, setTranslations] = useState<Record<string, LocalizedEmailVariant>>(
    (initialData as any)?.translations || (initialData as any)?.emailDocument?.translations || {}
  );
  const [isTranslating, setIsTranslating] = useState(false);

  // Direction & active values per language
  const isRtl = activeLocale === "ar" || activeLocale === "ur";
  const currentVariant = activeLocale === "en" ? undefined : translations[activeLocale];
  const activeSubject = activeLocale === "en" ? subject : (currentVariant?.subject ?? subject);
  const activePreviewText = activeLocale === "en" ? previewText : (currentVariant?.previewText ?? previewText);
  const activeBodyText = activeLocale === "en" ? bodyText : (currentVariant?.bodyText ?? bodyText);

  const handleSubjectChange = (val: string) => {
    if (activeLocale === "en") {
      setSubject(val);
    } else {
      setTranslations((prev) => ({
        ...prev,
        [activeLocale]: {
          ...(prev[activeLocale] || {
            locale: activeLocale,
            previewText: activePreviewText,
            bodyText: activeBodyText,
            direction: isRtl ? "rtl" : "ltr",
          }),
          subject: val,
          updatedAt: new Date().toISOString(),
        },
      }));
    }
  };

  const handlePreviewTextChange = (val: string) => {
    if (activeLocale === "en") {
      setPreviewText(val);
    } else {
      setTranslations((prev) => ({
        ...prev,
        [activeLocale]: {
          ...(prev[activeLocale] || {
            locale: activeLocale,
            subject: activeSubject,
            bodyText: activeBodyText,
            direction: isRtl ? "rtl" : "ltr",
          }),
          previewText: val,
          updatedAt: new Date().toISOString(),
        },
      }));
    }
  };

  const handleBodyChange = (val: string) => {
    if (activeLocale === "en") {
      setBodyText(val);
    } else {
      setTranslations((prev) => ({
        ...prev,
        [activeLocale]: {
          ...(prev[activeLocale] || {
            locale: activeLocale,
            subject: activeSubject,
            previewText: activePreviewText,
            direction: isRtl ? "rtl" : "ltr",
          }),
          bodyText: val,
          updatedAt: new Date().toISOString(),
        },
      }));
    }
  };

  // Storage key for auto-saving simple draft
  const draftKey = useMemo(() => {
    return templateId ? `simple_template_draft_${templateId}` : "simple_template_working_draft";
  }, [templateId]);

  // Load local draft on mount if available and not explicitly provided
  useEffect(() => {
    if (typeof window === "undefined" || initialData?.bodyText) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.bodyText) {
          setName(parsed.name || name);
          setSubject(parsed.subject || subject);
          setPreviewText(parsed.previewText || previewText);
          setBodyText(parsed.bodyText);
          if (parsed.buttonText) {
            setButtonText(parsed.buttonText);
            setEnableButton(true);
          }
          if (parsed.buttonUrl) setButtonUrl(parsed.buttonUrl);
          if (parsed.signOff) setSignOff(parsed.signOff);
          if (parsed.tags) setTags(parsed.tags);
          if (parsed.translations) setTranslations(parsed.translations);
          setLastAutoSaved(new Date(parsed.updatedAt || Date.now()).toLocaleTimeString());
        }
      }
    } catch {
      // ignore
    }
  }, [draftKey]);

  // Auto-save to localStorage debounced
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            name,
            subject,
            previewText,
            bodyText,
            buttonText: enableButton ? buttonText : "",
            buttonUrl: enableButton ? buttonUrl : "",
            signOff,
            tags,
            translations,
            updatedAt: new Date().toISOString(),
          })
        );
        setLastAutoSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch {
        // ignore
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [draftKey, name, subject, previewText, bodyText, enableButton, buttonText, buttonUrl, signOff, tags, translations]);

  // Construct EmailDocument
  const emailDocument = useMemo<EmailDocument>(() => {
    const doc = createSimpleEmailDocument(subject, bodyText, {
      previewText,
      buttonText: enableButton ? buttonText : undefined,
      buttonUrl: enableButton ? buttonUrl : undefined,
      signOff,
    });
    if (Object.keys(translations).length > 0) {
      doc.translations = translations;
    }
    return doc;
  }, [subject, bodyText, previewText, enableButton, buttonText, buttonUrl, signOff, translations]);

  // AI Translate Action
  const handleTranslateToActiveLocale = async () => {
    if (activeLocale === "en") return;
    setIsTranslating(true);
    try {
      const res = await fetch("/api/v1/admin/email/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetLocale: activeLocale,
          sourceLocale: "en",
          subject: emailDocument.subject,
          previewText: emailDocument.previewText,
          bodyText: emailDocument.bodyText,
          sections: emailDocument.sections,
          document: emailDocument,
          preserveTokens: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to translate template.");
      }
      const variant: LocalizedEmailVariant = data.variant || data.data?.variant;
      if (variant) {
        setTranslations((prev) => ({
          ...prev,
          [activeLocale]: variant,
        }));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error translating template");
    } finally {
      setIsTranslating(false);
    }
  };

  // Render HTML preview
  const renderResult = useMemo(() => {
    try {
      const personalization = personalizePreview
        ? {
            firstName: "Sarah",
            lastName: "Jenkins",
            email: "sarah.jenkins@example.com",
            storeName: "Apex Store",
            unsubscribeUrl: "#unsubscribe",
          }
        : undefined;

      return renderEmailDocument(emailDocument, {
        personalization,
        targetLocale: activeLocale,
        direction: isRtl ? "rtl" : "ltr",
      });
    } catch (err) {
      return {
        subject: activeSubject,
        previewText: activePreviewText,
        html: `<div style="padding: 24px; color: #dc2626; font-family: sans-serif;">Failed to render email: ${
          err instanceof Error ? err.message : "Unknown error"
        }</div>`,
        text: activeBodyText,
        unsubscribeUrl: "#",
        missingVariables: [],
      };
    }
  }, [emailDocument, personalizePreview, activeLocale, isRtl, activeSubject, activePreviewText, activeBodyText]);

  // Insert variable tag at cursor
  const insertVariable = (variableToken: string) => {
    if (!textareaRef.current) {
      handleBodyChange(activeBodyText + " " + variableToken);
      return;
    }
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + variableToken + after;
    handleBodyChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variableToken.length, start + variableToken.length);
    }, 0);
  };

  const handleApplyPreset = (preset: StarterSimpleTemplate) => {
    setName(preset.name);
    setSubject(preset.subject);
    setPreviewText(preset.previewText || "");
    setBodyText(preset.bodyText);
    if (preset.buttonText && preset.buttonUrl) {
      setEnableButton(true);
      setButtonText(preset.buttonText);
      setButtonUrl(preset.buttonUrl);
    } else {
      setEnableButton(false);
    }
    if (preset.signOff) {
      setSignOff(preset.signOff);
    }
    setShowPresetModal(false);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const val = tagInput.trim().toLowerCase();
      if (!tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMessage("Please give your template a name.");
      return;
    }
    if (!subject.trim()) {
      setErrorMessage("Subject line cannot be empty.");
      return;
    }
    if (!bodyText.trim()) {
      setErrorMessage("Email body text cannot be empty.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const payload: SimpleTemplateData & { emailDocument: EmailDocument; previewHtml: string; translations?: Record<string, LocalizedEmailVariant> } = {
      id: templateId,
      name: name.trim(),
      subject: subject.trim(),
      previewText: previewText.trim(),
      bodyText,
      buttonText: enableButton ? buttonText.trim() : undefined,
      buttonUrl: enableButton ? buttonUrl.trim() : undefined,
      signOff: signOff.trim(),
      tags,
      templateType: "simple",
      translations: Object.keys(translations).length > 0 ? translations : undefined,
      emailDocument,
      previewHtml: renderResult.html,
    };

    try {
      if (onSave) {
        await onSave(payload);
      } else {
        const method = templateId ? "PUT" : "POST";
        const url = templateId
          ? `/api/v1/admin/email/templates/${templateId}`
          : `/api/v1/admin/email/templates`;

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.message || "Failed to save simple template.");
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (!templateId && !onSave) {
        router.push("/admin/campaigns/templates");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error saving template.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsNew = async () => {
    if (!newTemplateName.trim()) {
      alert("Please enter a new template name.");
      return;
    }
    setSavingNewTemplate(true);
    try {
      const res = await fetch("/api/v1/admin/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          templateType: "simple",
          category: newTemplateCategory,
          description: newTemplateDescription.trim() || undefined,
          subjectTemplate: subject.trim(),
          previewTextTemplate: previewText.trim() || undefined,
          bodyTemplate: bodyText,
          ctaTemplate: enableButton ? buttonText.trim() : undefined,
          ctaUrlTemplate: enableButton ? buttonUrl.trim() : undefined,
          emailDocument,
          translations: Object.keys(translations).length > 0 ? translations : undefined,
          tags,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save template");
      setSaveNewSuccess(true);
      setName(newTemplateName.trim());
      setTimeout(() => {
        setSaveNewSuccess(false);
        setSaveAsModalOpen(false);
        setNewTemplateName("");
        setNewTemplateDescription("");
      }, 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save new template");
    } finally {
      setSavingNewTemplate(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) return;
    setTestSending(true);
    setTestSentSuccess(false);
    try {
      const res = await fetch("/api/v1/admin/email/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: testEmail.trim(),
          emailDocument,
          personalization: {
            firstName: "Valued",
            lastName: "Customer",
            storeName: "Our Store",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send test email");
      setTestSentSuccess(true);
      setTimeout(() => {
        setTestModalOpen(false);
        setTestSentSuccess(false);
      }, 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send test email");
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 overflow-hidden font-sans">
      {/* Top Navigation & Action Header */}
      <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between gap-4 shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href={backUrl}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-md transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </Link>

          <div className="h-4 w-px bg-gray-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Simple / Text
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template Name..."
              className="text-sm font-semibold text-gray-900 bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded px-2 py-1 outline-none transition w-48 sm:w-72"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-save status indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-gray-500 mr-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Draft auto-saved {lastAutoSaved ? `at ${lastAutoSaved}` : "locally"}</span>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowPresetModal(true)}
            className="gap-1.5 text-xs text-gray-700 hover:text-gray-900 border-gray-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Load Preset</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setTestModalOpen(true)}
            className="gap-1.5 text-xs text-gray-700 hover:text-gray-900 border-gray-200"
          >
            <Send className="w-3.5 h-3.5 text-gray-500" />
            <span className="hidden sm:inline">Send Test</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setNewTemplateName(name.includes("Copy") ? name : `${name} (New)`);
              setSaveAsModalOpen(true);
            }}
            title="Save as new reusable template in library"
            className="gap-1.5 text-xs text-indigo-700 bg-white hover:bg-indigo-50 border-indigo-200 font-semibold shadow-2xs"
          >
            <Save className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Save as New Template</span>
          </Button>

          {isCampaignMode && onApplyToCampaign ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onApplyToCampaign({ subject, emailDocument, bodyText })}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5"
            >
              <Check className="w-3.5 h-3.5" />
              Use in Campaign
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={saving}
              onClick={handleSave}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 shadow-sm"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Template"}
            </Button>
          )}
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Column: Form Controls & Markdown/Text Editor */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-5 max-w-2xl mx-auto w-full space-y-5">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Language & Translation Control Bar */}
            <div className="p-3 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-indigo-100 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-bold text-gray-900">Language & Translation</span>
                  {isRtl && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      ⇄ RTL
                    </span>
                  )}
                  {activeLocale !== "en" && currentVariant && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ Translated
                    </span>
                  )}
                  {activeLocale !== "en" && !currentVariant && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                      Untranslated (Using EN)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={activeLocale}
                  onChange={(e) => setActiveLocale(e.target.value)}
                  className="flex-1 h-8 text-xs font-medium rounded-lg border border-gray-200 bg-white px-2.5 text-gray-800 focus:border-indigo-500 focus:outline-none shadow-2xs"
                >
                  <option value="en">🇺🇸 English (Master)</option>
                  {Object.entries(localeConfig)
                    .filter(([c]) => c !== "en")
                    .map(([code, meta]) => {
                      const isTr = !!translations[code];
                      const rtl = code === "ar" || code === "ur";
                      return (
                        <option key={code} value={code}>
                          {meta.label} ({meta.nativeLabel}){rtl ? " [RTL]" : ""}
                          {isTr ? " • ✓ Translated" : ""}
                        </option>
                      );
                    })}
                </select>

                {activeLocale !== "en" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTranslateToActiveLocale}
                    disabled={isTranslating}
                    className="h-8 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 font-bold shrink-0"
                  >
                    {isTranslating ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Wand2 className="w-3 h-3 mr-1 text-indigo-600" />
                    )}
                    {currentVariant ? "Re-Translate" : "Translate (AI)"}
                  </Button>
                )}
              </div>
            </div>

            {/* Subject Line Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Email Subject Line <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-gray-500">
                  {activeSubject.length} chars {activeSubject.length > 70 && <span className="text-amber-600 font-medium">(might clip)</span>}
                </span>
              </div>
              <Input
                type="text"
                value={activeSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                dir={isRtl ? "rtl" : "ltr"}
                placeholder="e.g., Quick question for you, {{firstName}}..."
                className={`w-full text-sm font-medium border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${isRtl ? "text-right" : ""}`}
              />
            </div>

            {/* Preheader / Preview Text Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Preheader Snippet
                </label>
                <span className="text-[11px] text-gray-400">Preview in recipient inbox</span>
              </div>
              <Input
                type="text"
                value={activePreviewText}
                onChange={(e) => handlePreviewTextChange(e.target.value)}
                dir={isRtl ? "rtl" : "ltr"}
                placeholder="e.g., Important update regarding your access..."
                className={`w-full text-xs border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${isRtl ? "text-right" : ""}`}
              />
            </div>

            {/* Dynamic Tokens Insertion Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Insert Personalization Variable:
                </span>
                <span className="text-[10px] text-gray-400">Click to insert at cursor</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_VARIABLES.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => insertVariable(v.token)}
                    className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/70 transition"
                    title={`Inserts ${v.token} (e.g. ${v.example})`}
                  >
                    <span>{v.token}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Body Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Email Message Body <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-gray-400">Clean text formatting • Blank lines create paragraphs</span>
              </div>
              <textarea
                ref={textareaRef}
                rows={12}
                value={activeBodyText}
                onChange={(e) => handleBodyChange(e.target.value)}
                dir={isRtl ? "rtl" : "ltr"}
                placeholder="Write your email body here..."
                className={`w-full p-3.5 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-normal leading-relaxed resize-y min-h-[220px] ${
                  isRtl ? "text-right" : ""
                }`}
              />
            </div>

            {/* Optional Call to Action Button Toggle */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Include Call-to-Action Button</h4>
                  <p className="text-[11px] text-gray-500">Adds an optional, clean action button below your text</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableButton}
                    onChange={(e) => setEnableButton(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {enableButton && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-700">Button Label</label>
                    <Input
                      type="text"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      placeholder="e.g., Claim Your Gift"
                      className="text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-700">Destination URL</label>
                    <Input
                      type="text"
                      value={buttonUrl}
                      onChange={(e) => setButtonUrl(e.target.value)}
                      placeholder="e.g., /products or https://..."
                      className="text-xs bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sign-Off Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Sign-Off / Valediction
              </label>
              <textarea
                rows={2}
                value={signOff}
                onChange={(e) => setSignOff(e.target.value)}
                placeholder="e.g., Warm regards, The Apex Team"
                className="w-full p-2.5 text-xs text-gray-800 bg-white border border-gray-300 rounded-lg shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none leading-normal resize-none"
              />
            </div>

            {/* Tags & Categorization */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-gray-500" />
                Template Tags
              </label>
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[40px]">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] font-medium bg-white text-gray-700 px-2 py-0.5 rounded border border-gray-200 shadow-2xs"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-gray-400 hover:text-red-500 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type tag and press enter..."
                  className="text-xs bg-transparent border-none outline-none text-gray-700 placeholder:text-gray-400 flex-1 min-w-[140px] px-1"
                />
              </div>
            </div>

            {/* Compliance Footer Note */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-[11px] text-slate-600">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p>
                A standard CAN-SPAM / GDPR compliant unsubscribe link and sender address will automatically be appended to all simple emails upon dispatch.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Responsive Preview */}
        <div className="hidden lg:flex lg:w-1/2 flex-col bg-slate-100 overflow-hidden">
          {/* Preview Toolbar */}
          <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">Inbox Preview</span>
              <span className="text-gray-300">|</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-600 select-none">
                <input
                  type="checkbox"
                  checked={personalizePreview}
                  onChange={(e) => setPersonalizePreview(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Simulate sample lead (Sarah)</span>
              </label>
            </div>

            {/* Device Toggle */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => setDevice("desktop")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                  device === "desktop"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Desktop (560px max width)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDevice("mobile")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                  device === "mobile"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Mobile (375px width)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
            </div>
          </div>

          {/* Email Inbox Simulation Bar */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 text-xs space-y-1">
            <div className="flex items-center gap-2 text-gray-500 text-[11px]">
              <span className="font-semibold text-gray-700">From:</span>
              <span>Apex Support &lt;hello@apexstore.com&gt;</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-[11px]">
              <span className="font-semibold text-gray-700">To:</span>
              <span>{personalizePreview ? "Sarah Jenkins <sarah.jenkins@example.com>" : "{{email}}"}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-900 font-bold text-xs pt-0.5 truncate">
              <span className="text-gray-500 font-medium text-[11px]">Subject:</span>
              <span>{renderResult.subject || "(No subject)"}</span>
            </div>
          </div>

          {/* Rendered HTML Container */}
          <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start">
            <div
              className={`bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden transition-all duration-200 ${
                device === "mobile" ? "w-[375px]" : "w-[560px] max-w-full"
              }`}
            >
              <iframe
                title="Email Preview"
                srcDoc={renderResult.html}
                className="w-full min-h-[500px] border-none"
                style={{ height: "650px" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Starter Presets Modal */}
      <Modal open={showPresetModal} onOpenChange={setShowPresetModal}>
        <ModalContent className="max-w-2xl p-6">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2 text-gray-900 text-base font-bold">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Choose a Starter Simple Template
            </ModalTitle>
          </ModalHeader>
          <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {STARTER_SIMPLE_TEMPLATES.map((preset) => (
              <div
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className="p-4 rounded-xl border border-gray-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 cursor-pointer transition flex flex-col gap-2 group"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition">
                    {preset.name}
                  </h4>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {preset.category}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{preset.description}</p>
                <div className="text-[11px] font-mono text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 line-clamp-2">
                  Subject: {preset.subject}
                </div>
              </div>
            ))}
          </div>
        </ModalContent>
      </Modal>

      {/* Send Test Email Modal */}
      <Modal open={testModalOpen} onOpenChange={setTestModalOpen}>
        <ModalContent className="max-w-md p-6">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2 text-gray-900 text-base font-bold">
              <Send className="w-4 h-4 text-indigo-600" />
              Send Test Email
            </ModalTitle>
          </ModalHeader>
          <div className="mt-4 space-y-4">
            <p className="text-xs text-gray-600">
              Send a test copy of this simple email to verify how it appears in actual inboxes.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Recipient Email</label>
              <Input
                type="email"
                placeholder="you@company.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="text-xs"
              />
            </div>
            {testSentSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Test email dispatched successfully! Check your inbox.</span>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setTestModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={testSending || !testEmail.trim()}
                onClick={handleSendTest}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {testSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {testSending ? "Sending..." : "Dispatch Test"}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      {/* Save as New Template Modal */}
      <Modal open={saveAsModalOpen} onOpenChange={setSaveAsModalOpen}>
        <ModalContent className="max-w-md p-6">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2 text-gray-900 text-base font-bold">
              <Save className="w-4 h-4 text-indigo-600" />
              Save As New Template
            </ModalTitle>
          </ModalHeader>

          <div className="space-y-4 py-3 text-xs">
            <p className="text-gray-500 leading-relaxed">
              Save this text email format permanently into your template library under a custom name. Unsaved edits remain safely in your browser working draft.
            </p>

            <div>
              <label className="text-[11px] font-bold text-gray-700 mb-1 block">
                Template Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g. Founder Note - VIP Outreach"
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
                className="w-full text-xs rounded-lg border border-gray-200 p-2 text-gray-800 focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex items-start gap-1.5">
              <span className="font-bold text-slate-700">Auto-save note:</span>
              <span>Your working draft is auto-saved locally. Saving as a template registers it permanently in the database for future campaigns.</span>
            </div>

            {saveNewSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                Template successfully saved to your library!
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSaveAsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={savingNewTemplate || !newTemplateName.trim()}
              onClick={handleSaveAsNew}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {savingNewTemplate ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                "Save Template"
              )}
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
