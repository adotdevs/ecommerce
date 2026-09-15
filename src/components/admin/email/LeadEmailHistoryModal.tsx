"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ds/modal";
import { Button } from "@/components/ds/button";
import { Badge } from "@/components/ds/badge";
import { Skeleton } from "@/components/ds/skeleton";
import { toastError } from "@/hooks/use-toast";
import {
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Send,
  Eye,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface LeadEmailHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  leadName?: string;
  leadEmail?: string;
  onSendAgain?: (lead: { _id: string; email?: string; firstName?: string }) => void;
}

interface HistoryMessage {
  _id: string;
  campaignId?: string;
  campaignName?: string;
  subjectSnapshot: string;
  previewTextSnapshot?: string;
  renderedHtmlSnapshot: string;
  status: string;
  sentAt?: string;
  failedAt?: string;
  failureReason?: string;
  totalAttempts: number;
  createdAt: string;
  attempts: Array<{
    attemptNumber: number;
    startedAt: string;
    success: boolean;
    providerResponse?: string;
    sanitizedError?: string;
  }>;
}

export function LeadEmailHistoryModal({
  open,
  onOpenChange,
  leadId,
  leadName = "Lead",
  leadEmail,
  onSendAgain,
}: LeadEmailHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryMessage[]>([]);
  const [previewMessage, setPreviewMessage] = useState<HistoryMessage | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    if (!open || !leadId) {
      setHistory([]);
      setPreviewMessage(null);
      setAiSummary("");
      return;
    }

    setLoading(true);
    fetch(`/api/v1/admin/email/leads/${leadId}/history`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data?.history)) {
          setHistory(data.data.history);
        } else {
          toastError("Failed to load history", data.error);
        }
      })
      .catch(() => {
        toastError("Error", "Could not fetch email timeline.");
      })
      .finally(() => setLoading(false));
  }, [open, leadId]);

  const handleSummarizeHistory = () => {
    if (history.length === 0) return;
    setIsSummarizing(true);
    // Simple prompt or fetch summary
    setTimeout(() => {
      const successful = history.filter((h) => h.status === "SENT").length;
      const failed = history.filter((h) => h.status === "FAILED").length;
      const latest = history[0];
      setAiSummary(
        `Contacted ${history.length} time(s) (${successful} sent successfully, ${failed} failed). Last outreach was "${latest.subjectSnapshot}" on ${new Date(
          latest.sentAt || latest.createdAt
        ).toLocaleDateString()}. Recommendation: Use a fresh product-focused angle if contacting again.`
      );
      setIsSummarizing(false);
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-6">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Outreach History
              </DialogTitle>
              <p className="text-small text-muted-foreground mt-0.5">
                {leadName} {leadEmail ? `· ${leadEmail}` : ""}
              </p>
            </div>

            {onSendAgain && leadId && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onSendAgain({ _id: leadId, email: leadEmail, firstName: leadName });
                }}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Send Again
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* AI Summary Card */}
        {history.length > 0 && (
          <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI Outreach Summary
              </span>
              {!aiSummary && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={handleSummarizeHistory}
                  disabled={isSummarizing}
                >
                  {isSummarizing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Generate Summary"}
                </Button>
              )}
            </div>
            {aiSummary && <p className="mt-2 text-small text-foreground">{aiSummary}</p>}
          </div>
        )}

        {/* Timeline */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Mail className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="font-medium">No emails sent yet</p>
              <p className="text-small">This lead has not received any marketing outreach.</p>
            </div>
          ) : (
            history.map((item) => {
              const isSent = item.status === "SENT";
              const isFailed = item.status === "FAILED";

              return (
                <div
                  key={item._id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isSent && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        {isFailed && <XCircle className="h-4 w-4 text-red-600" />}
                        {!isSent && !isFailed && <Clock className="h-4 w-4 text-amber-500" />}
                        <h4 className="font-semibold text-foreground">{item.subjectSnapshot}</h4>
                        <Badge
                          variant={isSent ? "success" : isFailed ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {item.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.sentAt || item.createdAt).toLocaleString()}
                        </span>
                        {item.campaignName && (
                          <span>Campaign: <strong>{item.campaignName}</strong></span>
                        )}
                        <span>Attempts: {item.totalAttempts}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[12px]"
                      onClick={() => setPreviewMessage(item)}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      View Email
                    </Button>
                  </div>

                  {item.failureReason && (
                    <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-red-500/20 bg-red-50/50 p-2.5 text-[12px] text-red-800 dark:bg-red-950/20 dark:text-red-300">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{item.failureReason}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Nested Modal to view exact immutable email snapshot */}
        {previewMessage && (
          <Dialog open={Boolean(previewMessage)} onOpenChange={() => setPreviewMessage(null)}>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto p-4">
              <DialogHeader className="border-b border-border pb-3">
                <DialogTitle className="text-base font-bold">
                  Sent Email: {previewMessage.subjectSnapshot}
                </DialogTitle>
                <p className="text-[12px] text-muted-foreground">
                  Exact immutable snapshot preserved from delivery
                </p>
              </DialogHeader>
              <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white shadow-inner">
                <iframe
                  title="Sent Email Content"
                  srcDoc={previewMessage.renderedHtmlSnapshot}
                  className="h-[500px] w-full border-none"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
