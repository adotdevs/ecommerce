"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmailBuilder } from "@/components/admin/email/builder";
import { SimpleTemplateEditor, type SimpleTemplateData } from "@/components/admin/email/SimpleTemplateEditor";
import { TemplateSelectorModal, type SelectedTemplateResult } from "@/components/admin/email/TemplateSelectorModal";
import type { EmailDocument } from "@/lib/email/document-schema";
import {
  STARTER_TEMPLATES,
  STARTER_SIMPLE_TEMPLATES,
  createDefaultEmailDocument,
  createSimpleEmailDocument,
} from "@/lib/email/document-defaults";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ds/modal";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { toast, toastError } from "@/hooks/use-toast";
import {
  Send,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  Layout,
  FileText,
  Eye,
} from "lucide-react";
import { PreSendVisualConfirmationModal } from "@/components/admin/email/PreSendVisualConfirmationModal";

interface EligibleLead {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  source?: string;
}

function NewCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const templateIdParam = searchParams.get("templateId");
  const presetIdParam = searchParams.get("presetId");
  const simplePresetIdParam = searchParams.get("simplePresetId");
  const modeParam = searchParams.get("mode");

  // Campaign Mode: Visual vs Simple
  const [composerMode, setComposerMode] = useState<"visual" | "simple">(
    simplePresetIdParam || modeParam === "simple" ? "simple" : "visual"
  );

  // Template selector modal
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  // Initial loaded document/simple data
  const [initialDoc, setInitialDoc] = useState<EmailDocument | undefined>(undefined);
  const [simpleData, setSimpleData] = useState<Partial<SimpleTemplateData> | undefined>(undefined);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Audience & Send Modal state
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<EmailDocument | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [audienceMode, setAudienceMode] = useState<"next_eligible" | "all_eligible">("next_eligible");
  const [leadsCount, setLeadsCount] = useState(10);
  const [eligibleLeads, setEligibleLeads] = useState<EligibleLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [sendImmediately, setSendImmediately] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load preset or template if query params present
  useEffect(() => {
    if (templateIdParam) {
      setLoadingTemplate(true);
      fetch(`/api/v1/admin/email/templates/${templateIdParam}`)
        .then((res) => res.json())
        .then((data) => {
          const tpl = data.template || data.data?.template;
          if (tpl) {
            if (tpl.templateType === "simple") {
              setComposerMode("simple");
              setSimpleData({
                name: tpl.name,
                subject: tpl.subject || tpl.emailDocument?.subject,
                previewText: tpl.emailDocument?.previewText,
                bodyText: tpl.bodyTemplate || "",
                tags: tpl.tags,
                templateType: "simple",
              });
            } else {
              setComposerMode("visual");
              if (tpl.emailDocument) {
                setInitialDoc(tpl.emailDocument);
              }
            }
          }
        })
        .catch((err) => console.error("Failed to load template:", err))
        .finally(() => setLoadingTemplate(false));
    } else if (presetIdParam) {
      const preset = STARTER_TEMPLATES.find((p) => p.id === presetIdParam);
      if (preset) {
        setComposerMode("visual");
        setInitialDoc(preset.document);
      }
    } else if (simplePresetIdParam) {
      const simplePreset = STARTER_SIMPLE_TEMPLATES.find((p) => p.id === simplePresetIdParam);
      if (simplePreset) {
        setComposerMode("simple");
        setSimpleData({
          name: simplePreset.name,
          subject: simplePreset.subject,
          previewText: simplePreset.previewText,
          bodyText: simplePreset.bodyText,
          buttonText: simplePreset.buttonText,
          buttonUrl: simplePreset.buttonUrl,
          signOff: simplePreset.signOff,
          templateType: "simple",
        });
      }
    }
  }, [templateIdParam, presetIdParam, simplePresetIdParam]);

  // Load audience when modal opens
  const fetchAudience = useCallback(async (count: number) => {
    setLoadingLeads(true);
    try {
      const res = await fetch(`/api/v1/admin/email/next-eligible?count=${count}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setEligibleLeads(data.data?.leads || []);
      } else {
        setEligibleLeads([]);
      }
    } catch {
      setEligibleLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  useEffect(() => {
    if (audienceModalOpen) {
      const count = audienceMode === "next_eligible" ? leadsCount : 50;
      fetchAudience(count);
    }
  }, [audienceModalOpen, audienceMode, leadsCount, fetchAudience]);

  // Handler from Visual Studio
  const handleContinueToSendVisual = (doc: EmailDocument) => {
    setCurrentDoc(doc);
    if (!campaignName) {
      setCampaignName(doc.subject || "Marketing Campaign");
    }
    setAudienceModalOpen(true);
  };

  // Handler from Simple Template Editor
  const handleContinueToSendSimple = (data: {
    subject: string;
    emailDocument: EmailDocument;
    bodyText: string;
  }) => {
    setCurrentDoc(data.emailDocument);
    if (!campaignName) {
      setCampaignName(data.subject || "Personal Outreach");
    }
    setAudienceModalOpen(true);
  };

  // Handle template selection from TemplateSelectorModal
  const handleSelectTemplate = (result: SelectedTemplateResult) => {
    if (result.templateType === "simple") {
      setComposerMode("simple");
      setSimpleData({
        name: result.name,
        subject: result.subject,
        bodyText: result.bodyText || "",
        templateType: "simple",
      });
    } else {
      setComposerMode("visual");
      setInitialDoc(result.emailDocument);
    }
    setTemplateSelectorOpen(false);
  };

  // Launch campaign
  const handleLaunchCampaign = async () => {
    if (!currentDoc) return;
    if (!campaignName.trim()) {
      toastError("Campaign Name Required", "Please enter a name for this campaign.");
      return;
    }
    if (eligibleLeads.length === 0) {
      toastError("No Recipients", "No eligible recipients found for this send.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: campaignName.trim(),
        subject: currentDoc.subject || "Special Offer",
        previewText: currentDoc.previewText || "",
        emailDocument: currentDoc,
        leadIds: eligibleLeads.map((l) => l._id),
        sendImmediately,
        scheduledAt: !sendImmediately && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      };

      const res = await fetch("/api/v1/admin/email/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create and dispatch campaign.");
      }

      // Discard working drafts on success
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("email_builder_working_draft");
          localStorage.removeItem("simple_template_working_draft");
        } catch {
          // ignore
        }
      }

      toast({
        variant: "success",
        title: sendImmediately ? "Campaign Dispatched" : "Campaign Scheduled",
        description: sendImmediately
          ? `Queued delivery for ${eligibleLeads.length} leads.`
          : `Campaign scheduled for ${new Date(scheduledAt).toLocaleString()}`,
      });

      setAudienceModalOpen(false);
      setConfirmationModalOpen(false);
      router.push("/admin/campaigns");
    } catch (err) {
      toastError("Launch Failed", err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingTemplate) {
    return (
      <div className="fixed inset-0 left-0 md:left-64 z-30 bg-gray-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-xs font-semibold text-gray-500">Loading template into campaign...</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 left-0 md:left-64 z-30 bg-gray-100 flex flex-col overflow-hidden">
      {/* Mode Switcher Banner */}
      <div className="h-10 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Outreach Format:</span>
          <div className="inline-flex rounded-md bg-slate-800 p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setComposerMode("visual")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                composerMode === "visual"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Layout className="w-3 h-3" />
              <span>Visual Studio</span>
            </button>
            <button
              type="button"
              onClick={() => setComposerMode("simple")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                composerMode === "simple"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Simple & Personal</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setTemplateSelectorOpen(true)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 px-2.5 py-1 rounded border border-indigo-700/60 transition"
        >
          <Layers className="w-3 h-3 text-indigo-400" />
          <span>Switch / Pick Template</span>
        </button>
      </div>

      {/* Main Composer Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {composerMode === "visual" ? (
          <EmailBuilder
            key={`visual_${initialDoc?.subject || "default"}`}
            initialDocument={initialDoc}
            onContinueToSend={handleContinueToSendVisual}
            isSavingCampaign={isSubmitting}
            onOpenTemplatePicker={() => setTemplateSelectorOpen(true)}
            backUrl="/admin/campaigns"
          />
        ) : (
          <SimpleTemplateEditor
            key={`simple_${simpleData?.subject || "default"}`}
            initialData={simpleData}
            isCampaignMode={true}
            onApplyToCampaign={handleContinueToSendSimple}
            backUrl="/admin/campaigns"
          />
        )}
      </div>

      {/* Global Template Selector Modal */}
      <TemplateSelectorModal
        open={templateSelectorOpen}
        onOpenChange={setTemplateSelectorOpen}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Audience Selection & Schedule Modal */}
      <Modal open={audienceModalOpen} onOpenChange={setAudienceModalOpen}>
        <ModalContent className="max-w-xl max-h-[85vh] flex flex-col p-6">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2 text-gray-900">
              <Users className="w-5 h-5 text-indigo-600" />
              Campaign Audience & Delivery
            </ModalTitle>
          </ModalHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1 text-xs">
            {/* Campaign Name */}
            <div>
              <label className="font-semibold text-gray-800 text-xs mb-1 block">
                Internal Campaign Name
              </label>
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Summer Clearance Sale — Batch 1"
                className="text-xs"
              />
            </div>

            {/* Audience Type */}
            <div className="space-y-2">
              <label className="font-semibold text-gray-800 text-xs block">
                Select Target Audience
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAudienceMode("next_eligible");
                    setLeadsCount(10);
                  }}
                  className={`p-3 rounded-lg border text-left transition ${
                    audienceMode === "next_eligible"
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-900"
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <p className="font-bold text-xs">Today&apos;s Next Eligible</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    10 leads prioritized by activity & cooldown
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAudienceMode("all_eligible");
                    setLeadsCount(50);
                  }}
                  className={`p-3 rounded-lg border text-left transition ${
                    audienceMode === "all_eligible"
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-900"
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <p className="font-bold text-xs">Larger Batch (50 Leads)</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Highest-ranking uncontacted leads
                  </p>
                </button>
              </div>
            </div>

            {/* Leads Preview */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">
                  Recipients ({eligibleLeads.length})
                </span>
                {loadingLeads && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />}
              </div>

              {eligibleLeads.length > 0 ? (
                <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-gray-100 pr-1">
                  {eligibleLeads.map((l) => (
                    <div key={l._id} className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-gray-800 truncate">
                        {[l.firstName, l.lastName].filter(Boolean).join(" ") || l.email}
                      </span>
                      <span className="text-gray-400 font-mono">{l.email}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-[11px]">
                  {loadingLeads ? "Checking eligible audience..." : "No eligible leads found."}
                </p>
              )}
            </div>

            {/* Delivery Schedule */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="font-semibold text-gray-800 text-xs block">Delivery Timing</label>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={sendImmediately}
                    onChange={() => setSendImmediately(true)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-gray-800">Send Immediately</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={!sendImmediately}
                    onChange={() => setSendImmediately(false)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-gray-800">Schedule for Later</span>
                </label>
              </div>

              {!sendImmediately && (
                <div className="pt-2">
                  <label className="text-[11px] text-gray-600 block mb-1">Select Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md text-xs w-full focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setAudienceModalOpen(false)}
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isSubmitting || eligibleLeads.length === 0}
                onClick={handleLaunchCampaign}
                className="text-xs text-gray-700 border-gray-300"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Send className="w-3 h-3 mr-1" />
                )}
                <span>Quick Launch</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isSubmitting || eligibleLeads.length === 0}
                onClick={() => {
                  if (!campaignName.trim()) {
                    toastError("Campaign Name Required", "Please enter a name for this campaign.");
                    return;
                  }
                  setAudienceModalOpen(false);
                  setConfirmationModalOpen(true);
                }}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Confirm Final Visuals</span>
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      {/* Pre-Send Multilingual & Currency Visual Confirmation Modal */}
      {currentDoc && (
        <PreSendVisualConfirmationModal
          open={confirmationModalOpen}
          onOpenChange={setConfirmationModalOpen}
          document={currentDoc}
          onUpdateDocument={(updated) => setCurrentDoc(updated)}
          onConfirmLaunch={handleLaunchCampaign}
          isSubmitting={isSubmitting}
          campaignName={campaignName}
          recipientCount={eligibleLeads.length}
        />
      )}
    </div>
  );
}

export default function NewCampaignBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 left-0 md:left-64 z-30 bg-gray-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <NewCampaignContent />
    </Suspense>
  );
}
