"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Undo2,
  Redo2,
  Monitor,
  Smartphone,
  Eye,
  Send,
  Sparkles,
  Save,
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
  ZoomIn,
  Wand2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ds/button";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ds/modal";
import { Input } from "@/components/ds/input";
import { useAuthStore } from "@/stores/auth-store";
import type { DeviceMode, CanvasZoom } from "./types";
import type { SaveStatus } from "./useAutoSave";
import type { EmailDocument } from "@/lib/email/document-schema";

interface ToolbarActionsProps {
  document: EmailDocument;
  deviceMode: DeviceMode;
  onDeviceModeChange: (mode: DeviceMode) => void;
  zoom?: CanvasZoom;
  onZoomChange?: (zoom: CanvasZoom) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  onUpdateSubject: (subject: string) => void;
  onUpdatePreviewText: (previewText: string) => void;
  onOpenPreview: () => void;
  onOpenAiDesign: () => void;
  onContinueToSend?: () => void;
  isSavingCampaign?: boolean;
}

export function ToolbarActions({
  document,
  deviceMode,
  onDeviceModeChange,
  zoom = "100",
  onZoomChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveStatus,
  lastSavedAt,
  onUpdateSubject,
  onUpdatePreviewText,
  onOpenPreview,
  onOpenAiDesign,
  onContinueToSend,
  isSavingCampaign = false,
}: ToolbarActionsProps) {
  const { accessToken } = useAuthStore();
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  // Quick AI Subject generator state
  const [generatingSubjects, setGeneratingSubjects] = useState(false);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [suggestedSubjects, setSuggestedSubjects] = useState<string[]>([]);

  const subjectCharCount = (document.subject || "").length;
  const previewCharCount = (document.previewText || "").length;

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      setTestResult({ success: false, message: "Please enter a valid recipient email" });
      return;
    }

    setTestSending(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/v1/admin/email/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          recipientEmail: testEmail.trim(),
          subject: document.subject || "Email Outreach Test",
          previewText: document.previewText,
          emailDocument: document,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, message: `Test email dispatched to ${testEmail}` });
      } else {
        setTestResult({
          success: false,
          message: data.error || data.message || "Failed to send test email",
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Delivery failed",
      });
    } finally {
      setTestSending(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return;
    setTemplateSaving(true);
    try {
      const res = await fetch("/api/v1/admin/email/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          name: templateName.trim(),
          subjectTemplate: document.subject || "Template Subject",
          previewTextTemplate: document.previewText,
          emailDocument: document,
        }),
      });

      if (res.ok) {
        setTemplateSaved(true);
        setTimeout(() => {
          setTemplateSaved(false);
          setTemplateModalOpen(false);
        }, 1500);
      }
    } catch {
      // Handled
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleQuickAiSubjects = async () => {
    setGeneratingSubjects(true);
    setSubjectDropdownOpen(true);
    try {
      const res = await fetch("/api/v1/admin/email/ai/subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          headline: document.subject || "Special Member Offer",
          bodySnippet: document.previewText || "Exclusive styles and savings inside.",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data?.options)) {
        setSuggestedSubjects(data.data.options.map((o: any) => o.subject));
      } else {
        // High quality fallback options
        setSuggestedSubjects([
          `⚡ Exclusive: ${document.subject || "Your Handpicked Seasonal Edit"}`,
          `Only for you, {{firstName}}: Private member access unlocked`,
          `Don't miss this: Up to 40% off our curated collection`,
          `Inside: What's trending right now (plus a special treat)`,
          `A fresh look for the season: Handcrafted luxury essentials`,
        ]);
      }
    } catch {
      setSuggestedSubjects([
        `⚡ Exclusive: ${document.subject || "Your Handpicked Seasonal Edit"}`,
        `Only for you, {{firstName}}: Private member access unlocked`,
        `Don't miss this: Up to 40% off our curated collection`,
      ]);
    } finally {
      setGeneratingSubjects(false);
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 px-4 flex items-center justify-between gap-3 flex-shrink-0 z-20 shadow-xs">
        {/* Left: Breadcrumbs & Subject Editor */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href="/admin/campaigns"
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition flex items-center gap-1 text-xs font-semibold flex-shrink-0"
            title="Back to Campaigns"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden lg:inline text-gray-400 font-normal">Campaigns /</span>
            <span className="hidden sm:inline">Studio</span>
          </Link>

          {/* Subject & Snippet Inputs with Live Counter & AI Quick Button */}
          <div className="flex-1 max-w-lg min-w-0 bg-gray-50 hover:bg-gray-100/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 border border-gray-200 rounded-xl px-3 py-1 transition relative">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={document.subject}
                onChange={(e) => onUpdateSubject(e.target.value)}
                placeholder="Subject: Enter high-converting subject line..."
                className="text-xs font-bold text-gray-900 bg-transparent border-none focus:outline-none w-full truncate"
              />
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  className={`text-[9px] font-mono font-bold px-1 rounded ${
                    subjectCharCount <= 60
                      ? "text-emerald-700 bg-emerald-100/80"
                      : "text-amber-700 bg-amber-100"
                  }`}
                  title="Optimal email subject length is under 60 characters for mobile inboxes."
                >
                  {subjectCharCount}/60
                </span>

                <button
                  type="button"
                  onClick={handleQuickAiSubjects}
                  title="Generate AI Subject Lines"
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100/80 px-1.5 py-0.5 rounded transition flex items-center gap-0.5"
                >
                  <Wand2 className="w-2.5 h-2.5" />
                  AI
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 mt-0.5">
              <input
                type="text"
                value={document.previewText || ""}
                onChange={(e) => onUpdatePreviewText(e.target.value)}
                placeholder="Preheader: Engaging preview snippet shown in inbox..."
                className="text-[11px] text-gray-500 bg-transparent border-none focus:outline-none w-full truncate"
              />
              <span className="text-[9px] font-mono text-gray-400 flex-shrink-0">
                {previewCharCount}/90
              </span>
            </div>

            {/* AI Suggested Subjects Dropdown */}
            {subjectDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-indigo-100 p-2 z-50 text-xs space-y-1">
                <div className="flex items-center justify-between pb-1 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase">
                  <span>AI Subject Recommendations</span>
                  <button
                    type="button"
                    onClick={() => setSubjectDropdownOpen(false)}
                    className="text-gray-400 hover:text-gray-700 font-bold"
                  >
                    ✕
                  </button>
                </div>
                {generatingSubjects ? (
                  <div className="p-3 text-center text-xs text-indigo-600 flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating catchy angles...
                  </div>
                ) : (
                  suggestedSubjects.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onUpdateSubject(s);
                        setSubjectDropdownOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-indigo-50 text-gray-800 hover:text-indigo-700 transition flex items-center justify-between text-xs"
                    >
                      <span className="truncate">{s}</span>
                      <span className="text-[9px] font-bold text-indigo-500 flex-shrink-0 ml-2">
                        Apply
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Device Viewport, Zoom & Undo/Redo */}
        <div className="flex items-center gap-2">
          {/* Device Toggle */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => onDeviceModeChange("desktop")}
              title="Desktop View (600px)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition text-xs font-semibold ${
                deviceMode === "desktop"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => onDeviceModeChange("mobile")}
              title="Mobile View (375px)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition text-xs font-semibold ${
                deviceMode === "mobile"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Mobile</span>
            </button>
          </div>

          {/* Canvas Zoom Dropdown */}
          {onZoomChange && (
            <div className="hidden xl:flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg border border-gray-200 text-xs">
              <ZoomIn className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={zoom}
                onChange={(e) => onZoomChange(e.target.value as CanvasZoom)}
                className="bg-transparent border-none text-[11px] font-semibold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="100">100%</option>
                <option value="90">90%</option>
                <option value="80">80%</option>
                <option value="75">75%</option>
                <option value="fit">Fit Screen</option>
              </select>
            </div>
          )}

          <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-600 transition"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-600 transition"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* AutoSave Indicator */}
          <div className="text-[11px] text-gray-400 ml-1 hidden 2xl:flex items-center gap-1">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <span className="text-gray-400 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                Draft saved {lastSavedAt ? lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
              </span>
            )}
            {saveStatus === "unsaved" && (
              <span className="text-amber-500">• Unsaved</span>
            )}
          </div>
        </div>

        {/* Right: Actions Cluster */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenAiDesign}
            className="gap-1.5 text-xs text-indigo-700 hover:text-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200 font-bold shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Magic Studio</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setTestModalOpen(true)}
            className="gap-1 text-xs text-gray-700 hover:text-gray-900 border-gray-200"
          >
            <Send className="w-3.5 h-3.5 text-gray-500" />
            <span className="hidden sm:inline">Send Test</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenPreview}
            className="gap-1 text-xs text-gray-700 hover:text-gray-900 border-gray-200"
          >
            <Eye className="w-3.5 h-3.5 text-gray-500" />
            <span className="hidden sm:inline">Preview</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setTemplateModalOpen(true)}
            title="Save as reusable template"
            className="gap-1 text-xs text-gray-700 hover:text-gray-900 border-gray-200"
          >
            <Save className="w-3.5 h-3.5 text-gray-500" />
          </Button>

          {onContinueToSend && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isSavingCampaign}
              onClick={onContinueToSend}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm px-3.5"
            >
              {isSavingCampaign ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Review & Send
            </Button>
          )}
        </div>
      </header>

      {/* Send Test Email Modal */}
      <Modal open={testModalOpen} onOpenChange={setTestModalOpen}>
        <ModalContent className="max-w-md p-6">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2 text-gray-900 text-base font-bold">
              <Send className="w-4 h-4 text-indigo-600" />
              Send Test Email
            </ModalTitle>
          </ModalHeader>

          <div className="space-y-4 py-3 text-xs">
            <p className="text-gray-500 leading-relaxed">
              Send a real preview rendering of this email directly to your inbox to inspect mobile styling, link tracking, and font rendering.
            </p>

            <div>
              <label className="text-[11px] font-bold text-gray-700 mb-1 block">
                Recipient Email
              </label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your.name@company.com"
                className="text-xs"
              />
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setTestModalOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={testSending || !testEmail}
              onClick={handleSendTest}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {testSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Dispatching...
                </>
              ) : (
                "Send Test Now"
              )}
            </Button>
          </div>
        </ModalContent>
      </Modal>

      {/* Save Template Modal */}
      <Modal open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <ModalContent className="max-w-md p-6">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2 text-gray-900 text-base font-bold">
              <Save className="w-4 h-4 text-indigo-600" />
              Save As Reusable Template
            </ModalTitle>
          </ModalHeader>

          <div className="space-y-4 py-3 text-xs">
            <p className="text-gray-500 leading-relaxed">
              Save this email layout to your library so you or your marketing team can launch future campaigns using this structure in seconds.
            </p>

            <div>
              <label className="text-[11px] font-bold text-gray-700 mb-1 block">
                Template Name
              </label>
              <Input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. VIP Member Flash Sale Template"
                className="text-xs"
              />
            </div>

            {templateSaved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                Template successfully saved to library!
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setTemplateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={templateSaving || !templateName.trim()}
              onClick={handleSaveAsTemplate}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {templateSaving ? (
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
    </>
  );
}
