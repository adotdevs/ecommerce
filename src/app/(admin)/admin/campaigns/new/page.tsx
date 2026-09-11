"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EmailBuilder } from "@/components/admin/email/builder";
import type { EmailDocument } from "@/lib/email/document-schema";
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
} from "lucide-react";

interface EligibleLead {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  source?: string;
}

export default function NewCampaignBuilderPage() {
  const router = useRouter();
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<EmailDocument | null>(null);

  const [campaignName, setCampaignName] = useState("");
  const [audienceMode, setAudienceMode] = useState<"next_eligible" | "all_eligible">("next_eligible");
  const [leadsCount, setLeadsCount] = useState(10);
  const [eligibleLeads, setEligibleLeads] = useState<EligibleLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [sendImmediately, setSendImmediately] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleContinueToSend = (doc: EmailDocument) => {
    setCurrentDoc(doc);
    if (!campaignName) {
      setCampaignName(doc.subject || "Marketing Campaign");
    }
    setAudienceModalOpen(true);
  };

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
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to launch campaign");
      }

      toast({
        variant: "success",
        title: "Campaign Created",
        description: sendImmediately
          ? `Campaign launched to ${eligibleLeads.length} recipients!`
          : `Campaign scheduled for delivery.`,
      });

      const campaignId = data.data?.campaign?._id;
      if (campaignId) {
        router.push(`/admin/campaigns/${campaignId}`);
      } else {
        router.push("/admin/campaigns");
      }
    } catch (err) {
      toastError("Launch Failed", err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 left-0 md:left-64 z-30 bg-gray-100 flex flex-col overflow-hidden">
      <EmailBuilder
        onContinueToSend={handleContinueToSend}
        isSavingCampaign={isSubmitting}
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
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="text-xs max-w-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setAudienceModalOpen(false)}
            >
              Back to Design
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isSubmitting || eligibleLeads.length === 0}
              onClick={handleLaunchCampaign}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {sendImmediately ? "Launch Outreach Now" : "Schedule Campaign"}
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
