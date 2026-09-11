"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { Badge } from "@/components/ds/badge";
import { Skeleton } from "@/components/ds/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ds/modal";
import { toast, toastError } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Play,
  RotateCcw,
  XCircle,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Sparkles,
  ExternalLink,
  Mail,
  MousePointerClick,
  DollarSign,
  ShieldCheck,
  Ban,
} from "lucide-react";
import { cn } from "@/components/ds/utils";

interface CampaignDetail {
  _id: string;
  name: string;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "PAUSED" | "CANCELLED" | "FAILED";
  subject: string;
  previewText?: string;
  renderedHtmlSnapshot?: string;
  plainTextSnapshot?: string;
  productId?: string;
  productName?: string;
  productPrice?: number;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  suppressedCount: number;
  clickCount: number;
  attributedOrdersCount: number;
  attributedRevenue: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface RecipientMessage {
  _id: string;
  recipientEmail: string;
  recipientName?: string;
  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED" | "SUPPRESSED";
  attemptsCount: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  lastErrorMessage?: string;
  lastSmtpCode?: number;
  sentAt?: string;
  failedAt?: string;
  clickCount?: number;
  lastClickedAt?: string;
  renderedHtmlSnapshot?: string;
  subjectSnapshot?: string;
}

interface ClickAnalytics {
  totalClicks: number;
  byLinkType: Record<string, number>;
  byProduct: Array<{ name: string; count: number }>;
  topLinks: Array<{ url: string; count: number }>;
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: campaignId } = use(params);
  const router = useRouter();
  const { accessToken } = useAuthStore();

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [messages, setMessages] = useState<RecipientMessage[]>([]);
  const [clickAnalytics, setClickAnalytics] = useState<ClickAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [viewingHtml, setViewingHtml] = useState<string | null>(null);
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<{
    messageId?: string;
    text?: string;
    explanation?: string;
    suggestion?: string;
  } | null>(null);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }),
    [accessToken]
  );

  const loadCampaign = useCallback(async () => {
    if (!accessToken || !campaignId) return;
    try {
      const res = await fetch(`/api/v1/admin/email/campaigns/${campaignId}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setCampaign(data.data.campaign);
        setMessages(data.data.messages ?? []);
        if (data.data.clickAnalytics) {
          setClickAnalytics(data.data.clickAnalytics);
        }
      } else {
        toastError("Failed to load campaign", data.error);
      }
    } catch (e) {
      console.error(e);
    }
  }, [accessToken, campaignId, authHeaders]);

  useEffect(() => {
    if (accessToken && campaignId) {
      setLoading(true);
      loadCampaign().finally(() => setLoading(false));
    }
  }, [accessToken, campaignId, loadCampaign]);

  // Auto-poll if campaign is actively sending
  useEffect(() => {
    if (campaign?.status === "SENDING") {
      const interval = setInterval(() => {
        loadCampaign();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [campaign?.status, loadCampaign]);

  // Actions
  const handleProcessBatch = async () => {
    if (!campaignId) return;
    setProcessingBatch(true);
    try {
      const res = await fetch(`/api/v1/admin/email/campaigns/${campaignId}/process`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ batchSize: 10 }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          variant: "success",
          title: "Batch Processed",
          description: `Sent: ${data.data.sent}, Failed: ${data.data.failed}, Remaining: ${data.data.remaining}`,
        });
        loadCampaign();
      } else {
        toastError("Batch processing error", data.error);
      }
    } catch (e) {
      toastError("Error", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setProcessingBatch(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!campaignId) return;
    setRetrying(true);
    try {
      const res = await fetch(`/api/v1/admin/email/campaigns/${campaignId}/retry`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        toast({
          variant: "success",
          title: `Queued ${data.data.requeuedCount} messages for retry`,
        });
        loadCampaign();
      } else {
        toastError("Retry failed", data.error);
      }
    } catch (e) {
      toastError("Error", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRetrying(false);
    }
  };

  const handleCancelRemaining = async () => {
    if (!campaignId) return;
    if (!confirm("Are you sure you want to cancel all unsent messages in this campaign?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/v1/admin/email/campaigns/${campaignId}/cancel`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        toast({
          variant: "success",
          title: `Cancelled ${data.data.cancelledCount} messages`,
        });
        loadCampaign();
      } else {
        toastError("Cancellation failed", data.error);
      }
    } catch (e) {
      toastError("Error", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setCancelling(false);
    }
  };

  const handleExplainFailure = async (msg: RecipientMessage) => {
    setExplainingId(msg._id);
    try {
      const res = await fetch("/api/v1/admin/email/ai/explain-failure", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          errorMessage: msg.lastErrorMessage || "Unknown delivery failure",
          smtpCode: msg.lastSmtpCode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiExplanation({
          messageId: msg._id,
          text: data.data.explanation,
        });
      } else {
        toastError("AI explanation failed", data.error);
      }
    } catch (e) {
      toastError("Error", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setExplainingId(null);
    }
  };

  const handleExportCsv = () => {
    if (!messages.length) return;
    const headers = [
      "Recipient Email",
      "Recipient Name",
      "Status",
      "Attempts",
      "Sent At",
      "Error Message",
      "SMTP Code",
      "Clicks",
    ];
    const rows = messages.map((m) => [
      `"${m.recipientEmail}"`,
      `"${m.recipientName || ""}"`,
      m.status,
      m.attemptsCount,
      m.sentAt || "",
      `"${(m.lastErrorMessage || "").replace(/"/g, '""')}"`,
      m.lastSmtpCode || "",
      m.clickCount || 0,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `campaign-${campaign?.name || campaignId}-recipients.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !campaign) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-10 w-48 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-44 w-full rounded-[var(--radius-sm)]" />
        <Skeleton className="h-96 w-full rounded-[var(--radius-sm)]" />
      </div>
    );
  }

  const percentComplete =
    campaign.totalRecipients > 0
      ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Back button & Title */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="pl-0 text-muted-foreground">
          <Link href="/admin/campaigns">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Campaigns
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {campaign.name}
              </h1>
              <Badge
                variant={
                  campaign.status === "SENT"
                    ? "success"
                    : campaign.status === "SENDING"
                    ? "secondary"
                    : campaign.status === "FAILED"
                    ? "destructive"
                    : "outline"
                }
                className={campaign.status === "SENDING" ? "animate-pulse" : ""}
              >
                {campaign.status}
              </Badge>
            </div>
            <p className="mt-1 text-small text-muted-foreground">
              Created {new Date(campaign.createdAt).toLocaleString()}
              {campaign.startedAt ? ` • Started ${new Date(campaign.startedAt).toLocaleString()}` : ""}
              {campaign.completedAt ? ` • Completed ${new Date(campaign.completedAt).toLocaleString()}` : ""}
            </p>
          </div>

          {/* Action desk buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-indigo-500/40 text-indigo-600 hover:bg-indigo-500/10"
            >
              <Link href={`/admin/campaigns/${campaignId}/edit`}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Visual Designer
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewingHtml(campaign.renderedHtmlSnapshot || "")}
              disabled={!campaign.renderedHtmlSnapshot}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              View Content
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={!messages.length}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>
            {campaign.failedCount > 0 && campaign.status !== "CANCELLED" && (
              <Button
                variant="outline"
                size="sm"
                disabled={retrying}
                onClick={handleRetryFailed}
                className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
              >
                {retrying ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                )}
                Retry Failed
              </Button>
            )}
            {campaign.status !== "SENT" && campaign.status !== "CANCELLED" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cancelling}
                  onClick={handleCancelRemaining}
                  className="text-destructive hover:bg-destructive/10"
                >
                  {cancelling ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Cancel Unsent
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={processingBatch}
                  onClick={handleProcessBatch}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {processingBatch ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Process Batch
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress & Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="sm:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                Progress
              </CardTitle>
              <span className="text-small font-semibold tabular-nums text-foreground">
                {percentComplete}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground">
              <span>
                <strong className="text-foreground">{campaign.sentCount}</strong> /{" "}
                {campaign.totalRecipients} dispatched
              </span>
              <span>
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {campaign.deliveredCount}
                </strong>{" "}
                delivered
              </span>
              {campaign.failedCount > 0 && (
                <span className="text-destructive">
                  <strong>{campaign.failedCount}</strong> failed
                </span>
              )}
              {campaign.suppressedCount > 0 && (
                <span className="text-amber-600">
                  <strong>{campaign.suppressedCount}</strong> suppressed
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums">{campaign.clickCount}</span>
              <span className="flex items-center text-[12px] text-primary">
                <MousePointerClick className="mr-1 h-3.5 w-3.5" />
                Clicks
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Verified email link clicks through outreach tracking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Conversion Attribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums">
                ${campaign.attributedRevenue.toFixed(2)}
              </span>
              <Badge variant="outline">{campaign.attributedOrdersCount} orders</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Orders tied directly to campaign click tokens
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Snapshot Information Banner */}
      <Card>
        <CardContent className="grid gap-4 py-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Subject Line
            </p>
            <p className="font-semibold text-foreground">{campaign.subject}</p>
            {campaign.previewText && (
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                <span className="font-medium">Preview:</span> {campaign.previewText}
              </p>
            )}
          </div>
          {campaign.productName && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Featured Product
              </p>
              <p className="font-semibold text-foreground">
                {campaign.productName}{" "}
                {campaign.productPrice ? `($${campaign.productPrice.toFixed(2)})` : ""}
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Product link was included in CTA with tracked attribution
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Click Intelligence & Attribution */}
      {clickAnalytics && clickAnalytics.totalClicks > 0 && (
        <Card>
          <CardHeader className="border-b border-border bg-secondary/30 py-3.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-indigo-600" />
                Link Click Intelligence & Attribution ({clickAnalytics.totalClicks} clicks)
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                HMAC Signed Tracking
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 grid gap-6 md:grid-cols-3">
            {/* By Link Type */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                By Link Type
              </p>
              <div className="space-y-2">
                {Object.entries(clickAnalytics.byLinkType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-gray-700 dark:text-gray-300">{type}</span>
                    <Badge variant="secondary" className="font-bold">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* By Product */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                By Product
              </p>
              {clickAnalytics.byProduct.length > 0 ? (
                <div className="space-y-2">
                  {clickAnalytics.byProduct.map((p) => (
                    <div key={p.name} className="flex items-center justify-between text-xs">
                      <span className="truncate max-w-[180px] text-gray-700 dark:text-gray-300">
                        {p.name}
                      </span>
                      <Badge variant="secondary" className="font-bold">
                        {p.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No product-specific clicks yet.</p>
              )}
            </div>

            {/* Top Destination URLs */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Top Destinations
              </p>
              <div className="space-y-2">
                {clickAnalytics.topLinks.slice(0, 5).map((l) => (
                  <div key={l.url} className="flex items-center justify-between text-xs gap-2">
                    <span className="truncate font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                      {l.url}
                    </span>
                    <Badge variant="secondary" className="font-bold flex-shrink-0">
                      {l.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recipient Messages Table */}
      <Card>
        <CardHeader className="border-b border-border bg-secondary/30 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Recipient Queue ({messages.length})
            </CardTitle>
            <span className="text-[12px] text-muted-foreground">
              Atomic queue worker items with SMTP attempt history
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {messages.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No recipient message records found for this campaign.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {messages.map((msg) => {
                const isFailed = msg.status === "FAILED";
                const isSent = msg.status === "SENT";
                const isPending = msg.status === "PENDING";
                const isProcessing = msg.status === "PROCESSING";

                return (
                  <div key={msg._id} className="p-4 transition-colors hover:bg-secondary/15">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">
                            {msg.recipientEmail}
                          </p>
                          {msg.recipientName && (
                            <span className="text-[12px] text-muted-foreground">
                              ({msg.recipientName})
                            </span>
                          )}
                          <Badge
                            variant={
                              isSent
                                ? "success"
                                : isFailed
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {msg.status}
                          </Badge>
                          {msg.clickCount && msg.clickCount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              <MousePointerClick className="h-3 w-3" />
                              {msg.clickCount} clicks
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                          <span>
                            Attempts: <strong>{msg.attemptsCount}</strong> / {msg.maxAttempts}
                          </span>
                          {msg.sentAt && (
                            <span>Sent: {new Date(msg.sentAt).toLocaleTimeString()}</span>
                          )}
                          {msg.lastAttemptAt && (
                            <span>Last try: {new Date(msg.lastAttemptAt).toLocaleTimeString()}</span>
                          )}
                        </div>

                        {/* Error diagnostics */}
                        {isFailed && msg.lastErrorMessage && (
                          <div className="mt-2 rounded-[var(--radius-sm)] border border-destructive/30 bg-destructive/5 p-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[12px] font-mono text-destructive">
                                {msg.lastSmtpCode ? `[SMTP ${msg.lastSmtpCode}] ` : ""}
                                {msg.lastErrorMessage}
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px] text-purple-600 hover:bg-purple-500/10 dark:text-purple-400"
                                disabled={explainingId === msg._id}
                                onClick={() => handleExplainFailure(msg)}
                              >
                                {explainingId === msg._id ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <Sparkles className="mr-1 h-3 w-3" />
                                )}
                                Explain with AI
                              </Button>
                            </div>

                            {/* AI Explanation Accordion */}
                            {aiExplanation?.messageId === msg._id && (
                              <div className="mt-2 rounded border border-purple-500/30 bg-purple-500/5 p-2.5 text-[12px] text-foreground">
                                <div className="flex items-center gap-1.5 font-semibold text-purple-700 dark:text-purple-300">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  AI Diagnosis &amp; Remedy
                                </div>
                                <p className="mt-1 whitespace-pre-line text-muted-foreground">
                                  {aiExplanation.text}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {msg.renderedHtmlSnapshot && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-[12px]"
                            onClick={() => setViewingHtml(msg.renderedHtmlSnapshot || "")}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            View Email
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Snapshot Modal */}
      <Dialog open={!!viewingHtml} onOpenChange={(open) => !open && setViewingHtml(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Content Snapshot</DialogTitle>
          </DialogHeader>
          <div className="rounded-[var(--radius-sm)] border border-border bg-white p-4">
            <div
              className="prose prose-sm max-w-none text-slate-900"
              dangerouslySetInnerHTML={{ __html: viewingHtml || "" }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
