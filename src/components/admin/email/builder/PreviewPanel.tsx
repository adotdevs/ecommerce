"use client";

import { useState, useMemo } from "react";
import {
  Monitor,
  Smartphone,
  Code,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Inbox,
} from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ds/modal";
import { Button } from "@/components/ds/button";
import type { EmailDocument } from "@/lib/email/document-schema";
import { renderEmailDocument } from "@/lib/email/document-renderer";
import { validateEmailDocument } from "@/lib/email/document-validation";

interface PreviewPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: EmailDocument;
}

export function PreviewPanel({ open, onOpenChange, document }: PreviewPanelProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState<"preview" | "inbox" | "html" | "text" | "validation">("preview");
  const [copied, setCopied] = useState(false);

  // Render document to HTML and text
  const renderResult = useMemo(() => {
    try {
      return renderEmailDocument(document, {
        personalization: {
          firstName: "Alex",
          lastName: "Morgan",
          email: "alex.morgan@example.com",
        },
        baseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      });
    } catch (err) {
      return {
        html: `<div style="padding: 20px; color: red;">Render error: ${err instanceof Error ? err.message : "Unknown error"}</div>`,
        text: "Error rendering email text",
        subject: document.subject,
        previewText: document.previewText || "",
        unsubscribeUrl: "#",
        missingVariables: [],
      };
    }
  }, [document]);

  // Run validation
  const validation = useMemo(() => {
    return validateEmailDocument(document);
  }, [document]);

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(renderResult.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const iframeWidth = device === "mobile" ? "375px" : "100%";

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <ModalTitle className="text-base font-bold text-gray-900">Email Preview</ModalTitle>
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setDevice("desktop")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition ${
                  device === "desktop"
                    ? "bg-white text-gray-900 shadow-sm font-semibold"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setDevice("mobile")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition ${
                  device === "mobile"
                    ? "bg-white text-gray-900 shadow-sm font-semibold"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile
              </button>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 mr-8">
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === "preview"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Visual
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("inbox")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1 ${
                activeTab === "inbox"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              Inbox View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("html")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1 ${
                activeTab === "html"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              HTML
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("text")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1 ${
                activeTab === "text"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Plain Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("validation")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1 ${
                activeTab === "validation"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {validation.isValid ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              )}
              Validation
              {validation.warnings.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                  {validation.warnings.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Email Headers Meta bar */}
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs text-gray-600 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 truncate">
            <span className="font-semibold text-gray-500">Subject:</span>
            <span className="text-gray-900 font-medium truncate">
              {renderResult.subject || "(Empty Subject)"}
            </span>
            {renderResult.previewText && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500 truncate text-[11px]">
                  {renderResult.previewText}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-gray-400 font-mono">
              ~{(new Blob([renderResult.html]).size / 1024).toFixed(1)} KB
            </span>
            {activeTab === "html" && (
              <Button size="sm" variant="secondary" onClick={handleCopyHtml} className="gap-1 h-7 text-xs">
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy HTML"}
              </Button>
            )}
          </div>
        </div>

        {/* Main View Area */}
        <div className="flex-1 overflow-hidden bg-gray-100 flex items-center justify-center p-4">
          {activeTab === "preview" && (
            <div
              style={{ width: iframeWidth }}
              className="h-full bg-white rounded-xl shadow-lg border border-gray-300 overflow-hidden transition-all duration-200 flex flex-col"
            >
              <iframe
                title="Email Preview"
                srcDoc={renderResult.html}
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
              />
            </div>
          )}

          {activeTab === "inbox" && (
            <div className="w-full max-w-2xl bg-white p-6 rounded-xl border border-gray-200 overflow-y-auto space-y-6 shadow-sm">
              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">Inbox Appearance Simulator</h4>
                <p className="text-gray-500 text-xs">
                  See how your Subject and Preheader snippet render across popular mail clients.
                </p>
              </div>

              {/* Gmail Desktop Row */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Gmail (Desktop Client)
                </span>
                <div className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-xs transition flex items-center gap-3 text-xs">
                  <div className="w-4 h-4 border border-gray-300 rounded flex-shrink-0" />
                  <div className="w-4 h-4 text-gray-300 flex-shrink-0">★</div>
                  <span className="font-bold text-gray-900 w-36 truncate flex-shrink-0">
                    Findora Store
                  </span>
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-bold text-gray-900 mr-2">
                      {document.subject || "(No subject provided)"}
                    </span>
                    <span className="text-gray-500">
                      - {document.previewText || "View our latest collection online today."}
                    </span>
                  </div>
                  <span className="text-gray-400 text-[11px] flex-shrink-0 font-medium">10:42 AM</span>
                </div>
              </div>

              {/* Apple Mail / iOS Notification */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Apple Mail / iOS Lockscreen Notification
                </span>
                <div className="bg-slate-900/90 backdrop-blur-md text-white p-4 rounded-2xl max-w-md shadow-lg border border-slate-700/50 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                      <div className="w-4 h-4 rounded bg-indigo-500 flex items-center justify-center text-[9px] text-white">
                        ✉
                      </div>
                      FINDORA
                    </div>
                    <span>now</span>
                  </div>
                  <p className="font-bold text-xs text-white truncate">
                    {document.subject || "Special announcement for you"}
                  </p>
                  <p className="text-[11px] text-slate-300 line-clamp-2">
                    {document.previewText || "Check out our newest drops and special discounts inside this email."}
                  </p>
                </div>
              </div>

              {/* Character Count Diagnostics */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block mb-0.5">Subject Length</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {document.subject.length} <span className="text-xs text-gray-400 font-normal">characters</span>
                  </span>
                  <span className={`text-[10px] block mt-0.5 ${document.subject.length <= 50 ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}`}>
                    {document.subject.length <= 50 ? "✓ Optimal for mobile inboxes" : "⚠️ Might truncate on some phones"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Preheader Length</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {(document.previewText || "").length} <span className="text-xs text-gray-400 font-normal">characters</span>
                  </span>
                  <span className={`text-[10px] block mt-0.5 ${(document.previewText || "").length <= 90 ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}`}>
                    {(document.previewText || "").length <= 90 ? "✓ Clean snippet length" : "⚠️ Will truncate beyond 90 chars"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "html" && (
            <div className="w-full h-full bg-gray-900 text-gray-100 p-4 rounded-xl font-mono text-xs overflow-auto">
              <pre className="whitespace-pre-wrap">{renderResult.html}</pre>
            </div>
          )}

          {activeTab === "text" && (
            <div className="w-full h-full bg-white p-6 rounded-xl border border-gray-200 font-mono text-xs overflow-auto text-gray-800">
              <pre className="whitespace-pre-wrap">{renderResult.text}</pre>
            </div>
          )}

          {activeTab === "validation" && (
            <div className="w-full h-full max-w-2xl bg-white p-6 rounded-xl border border-gray-200 overflow-auto space-y-4">
              <div className="flex items-center gap-2">
                {validation.isValid ? (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    Email is ready to send!
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5" />
                    Please fix blocking errors before sending
                  </div>
                )}
              </div>

              {validation.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-red-800 uppercase tracking-wider">
                    Blocking Errors
                  </h4>
                  <div className="space-y-1">
                    {validation.errors.map((err, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-700"
                      >
                        • {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-semibold text-xs text-amber-800 uppercase tracking-wider">
                    Recommendations & Warnings
                  </h4>
                  <div className="space-y-1">
                    {validation.warnings.map((w, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800"
                      >
                        ⚠️ {w}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {renderResult.missingVariables.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800">
                  <span className="font-semibold">Detected personalization tokens:</span>{" "}
                  {renderResult.missingVariables.join(", ")}
                </div>
              )}
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
