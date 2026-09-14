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
  status: "PENDING" | "QUEUED" | "PROCESSING" | "SENT" | "FAILED" | "RETRYING" | "CANCELLED" | "SUPPRESSED" | "BLOCKED";
  attemptsCount: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  lastErrorMessage?: string;
  lastSmtpCode?: number;
  failureCategory?: string;
  failureReason?: string;
  sentAt?: string;
  failedAt?: string;
  clickCount?: number;
  lastClickedAt?: string;
  renderedHtmlSnapshot?: string;
  subjectSnapshot?: string;
}

interface FailureSummaryItem {
  reason: string;
  category: string;
  count: number;
  sampleRecipients: string[];
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
  const [failureSummary, setFailureSummary] = useState<FailureSummaryItem[]>([]);
  const [recipientFilter, setRecipientFilter] = useState<"ALL" | "FAILED" | "SENT" | "PENDING">("ALL");
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
        if (data.data.failureSummary) {
          setFailureSummary(data.data.failureSummary);
        }
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

  const failedCount = useMemo(() => messages.filter((m) => m.status === "FAILED").length, [messages]);
  const sentCount = useMemo(() => messages.filter((m) => m.status === "SENT").length, [messages]);
  const pendingCount = useMemo(
    () => messages.filter((m) => m.status === "PENDING" || m.status === "PROCESSING").length,
    [messages]
  );

  const filteredMessages = useMemo(() => {
    if (recipientFilter === "ALL") return messages;
    if (recipientFilter === "FAILED") {
      return messages.filter((m) => m.status === "FAILED" || m.status === "CANCELLED");
    }
    if (recipientFilter === "SENT") {
      return messages.filter((m) => m.status === "SENT");
    }
    if (recipientFilter === "PENDING") {
      return messages.filter((m) => m.status === "PENDING" || m.status === "PROCESSING");
    }
    return messages;
  }, [messages, recipientFilter]);

  // Export Recipient Queue to CSV with failure diagnostics
  const handleExportCsv = () => {
    if (!messages.length) return;

    const headers = [
      "Recipient Email",
      "Recipient Name",
      "Status",
      "Attempts",
      "Sent At",
      "Failure Reason",
      "Failure Category",
      "SMTP Code",
      "Clicks",
    ];
    const rows = messages.map((m) => [
      `"${m.recipientEmail}"`,
      `"${m.recipientName || ""}"`,
      m.status,
      m.attemptsCount,
      m.sentAt || "",
      `"${(m.lastErrorMessage || m.failureReason || "").replace(/"/g, '""')}"`,
      `"${m.failureCategory || ""}"`,
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

      {/* Delivery Failures & Root Cause Analysis Card */}
      {(campaign.failedCount > 0 || failureSummary.length > 0 || failedCount > 0) && (
        <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
          <CardHeader className="pb-3 border-b border-destructive/20 bg-destructive/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="rounded-full bg-destructive/20 p-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-destructive flex items-center gap-2">
                    Email Delivery Failure Reasons
                    <Badge variant="destructive" className="text-[11px] px-2 py-0.5 font-mono">
                      {campaign.failedCount || failedCount} failed
                    </Badge>
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    SMTP server rejection reasons, connection timeouts, and mailbox delivery errors
                  </p>
                </div>
              </div>
              {campaign.status !== "CANCELLED" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={retrying}
                  onClick={handleRetryFailed}
                  className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10 text-xs font-semibold gap-1.5"
                >
                  {retrying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Retry All Failed
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-3.5 space-y-2.5">
            {failureSummary.length > 0 ? (
              failureSummary.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-background/90 p-3 text-xs shadow-xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Badge variant="destructive" className="mt-0.5 shrink-0 text-[10px] uppercase font-mono tracking-wider">
                      {item.category.replace(/_/g, " ")}
                    </Badge>
                    <div className="min-w-0">
                      <p className="font-mono text-[12px] font-bold text-destructive break-words">
                        {item.reason}
                      </p>
                      {item.sampleRecipients && item.sampleRecipients.length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Affected recipients: <span className="font-mono text-foreground/80">{item.sampleRecipients.join(", ")}</span>
                          {item.count > item.sampleRecipients.length
                            ? ` and ${item.count - item.sampleRecipients.length} more`
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 self-start sm:self-center font-bold text-xs bg-destructive/10 text-destructive border-destructive/20">
                    {item.count} recipient{item.count === 1 ? "" : "s"}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-destructive/20 bg-background/80 p-3 text-xs text-destructive font-mono">
                {messages.find((m) => m.lastErrorMessage || m.failureReason)?.lastErrorMessage ||
                  messages.find((m) => m.lastErrorMessage || m.failureReason)?.failureReason ||
                  "Delivery was rejected by destination mail server."}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recipient Messages Table */}
      <Card>
        <CardHeader className="border-b border-border bg-secondary/30 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Recipient Queue ({messages.length})
              </CardTitle>
              <p className="text-[12px] text-muted-foreground">
                Atomic queue worker items with SMTP attempt history and failure reasons
              </p>
            </div>
            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1">
              <Button
                variant={recipientFilter === "ALL" ? "primary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                onClick={() => setRecipientFilter("ALL")}
              >
                All ({messages.length})
              </Button>
              <Button
                variant={recipientFilter === "FAILED" ? "primary" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 px-2.5 text-[11px]",
                  failedCount > 0 && recipientFilter !== "FAILED" && "text-destructive font-bold"
                )}
                onClick={() => setRecipientFilter("FAILED")}
              >
                Failed ({failedCount})
              </Button>
              <Button
                variant={recipientFilter === "SENT" ? "primary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                onClick={() => setRecipientFilter("SENT")}
              >
                Sent ({sentCount})
              </Button>
              {pendingCount > 0 && (
                <Button
                  variant={recipientFilter === "PENDING" ? "primary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-[11px]"
                  onClick={() => setRecipientFilter("PENDING")}
                >
                  Pending ({pendingCount})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredMessages.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              {recipientFilter === "ALL"
                ? "No recipient message records found for this campaign."
                : `No messages match the filter '${recipientFilter}'.`}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredMessages.map((msg) => {
                const isFailed = msg.status === "FAILED";
                const isRetrying = msg.status === "RETRYING";
                const isSent = msg.status === "SENT";
                const failureText = msg.lastErrorMessage || msg.failureReason;

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
                                : isRetrying
                                ? "secondary"
                                : "secondary"
                            }
                            className={isRetrying ? "bg-amber-100 text-amber-900 border-amber-200" : ""}
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

                        {/* Error diagnostics & Failure Reason */}
                        {(isFailed || isRetrying || failureText) && (
                          <div className="mt-2.5 rounded-[var(--radius-sm)] border border-destructive/30 bg-destructive/5 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="flex items-center gap-1 text-[11px] font-bold text-destructive uppercase tracking-wider">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Failure Reason
                                </span>
                                {msg.failureCategory && (
                                  <Badge variant="destructive" className="text-[10px] font-mono py-0 px-1.5 uppercase">
                                    {msg.failureCategory.replace(/_/g, " ")}
                                  </Badge>
                                )}
                                {msg.lastSmtpCode && (
                                  <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 border-destructive/40 text-destructive">
                                    SMTP {msg.lastSmtpCode}
                                  </Badge>
                                )}
                              </div>
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

                            <p className="mt-1.5 text-[12px] font-mono text-destructive font-semibold break-words">
                              {msg.lastSmtpCode ? `[SMTP ${msg.lastSmtpCode}] ` : ""}
                              {failureText || "Delivery rejected by mail server"}
                            </p>

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
