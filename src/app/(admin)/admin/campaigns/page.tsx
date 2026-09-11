"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { Badge } from "@/components/ds/badge";
import { Skeleton } from "@/components/ds/skeleton";
import { toast, toastError } from "@/hooks/use-toast";
import {
  Send,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Settings,
  ListFilter,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
  BarChart3,
  Mail,
  DollarSign,
  Users,
} from "lucide-react";
import { EmailComposer, type SelectedLeadContext } from "@/components/admin/email/EmailComposer";
import { cn } from "@/components/ds/utils";

interface CampaignItem {
  _id: string;
  name: string;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "PAUSED" | "CANCELLED" | "FAILED";
  subject: string;
  previewText?: string;
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

interface QuotaStatus {
  dailyLimit: number;
  sentToday: number;
  remainingToday: number;
  resetAt: string;
}

export default function AdminCampaignsPage() {
  const { accessToken } = useAuthStore();
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerLeads, setComposerLeads] = useState<SelectedLeadContext[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }),
    [accessToken]
  );

  const loadCampaigns = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch("/api/v1/admin/email/campaigns?limit=50", {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.data.items ?? []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [accessToken, authHeaders]);

  const loadSettingsAndQuota = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch("/api/v1/admin/email/settings", {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setQuota(data.data.quota);
        setIsPaused(!!data.data.settings?.isMarketingPaused);
      }
    } catch (e) {
      console.error(e);
    }
  }, [accessToken, authHeaders]);

  useEffect(() => {
    if (accessToken) {
      setLoading(true);
      Promise.all([loadCampaigns(), loadSettingsAndQuota()]).finally(() => {
        setLoading(false);
      });
    }
  }, [accessToken, loadCampaigns, loadSettingsAndQuota]);

  const handleToggleEmergencyPause = async () => {
    if (!accessToken) return;
    setTogglingPause(true);
    const willPause = !isPaused;
    try {
      const res = await fetch("/api/v1/admin/email/settings", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          isMarketingPaused: willPause,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsPaused(willPause);
        toast({
          variant: willPause ? "error" : "success",
          title: willPause ? "Marketing Outreach Paused" : "Marketing Outreach Resumed",
          description: willPause
            ? "Emergency kill switch active. All queue workers and outbound promotional emails are halted."
            : "Outreach resumes within configured daily rate limits.",
        });
      } else {
        toastError("Failed to update kill switch", data.error);
      }
    } catch (e) {
      toastError("Error", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setTogglingPause(false);
    }
  };

  const handlePrepareToday = async () => {
    setLoadingEligible(true);
    try {
      const res = await fetch("/api/v1/admin/email/next-eligible?limit=10", {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!data.success) {
        toastError("Could not fetch eligible leads", data.error);
        return;
      }
      if (!data.data.leads || data.data.leads.length === 0) {
        toast({
          variant: "warning",
          title: "No leads currently eligible",
          description:
            data.data.quota?.remainingToday === 0
              ? "Daily limit reached. Resets at midnight UTC."
              : "All leads with valid email are either in 14-day cooldown or unsubscribed.",
        });
        return;
      }
      setComposerLeads(
        data.data.leads.map((l: any) => ({
          _id: l._id,
          email: l.email,
          firstName: l.firstName,
          lastName: l.lastName,
          emailSentCount: l.emailSentCount,
          lastEmailSentAt: l.lastEmailSentAt,
          isSuppressed: l.isSuppressed,
        }))
      );
      setIsComposerOpen(true);
    } catch (e) {
      toastError("Failed to fetch eligible leads", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoadingEligible(false);
    }
  };

  const filteredCampaigns = useMemo(() => {
    if (statusFilter === "ALL") return campaigns;
    if (statusFilter === "ACTIVE") {
      return campaigns.filter((c) => c.status === "SENDING" || c.status === "SCHEDULED");
    }
    return campaigns.filter((c) => c.status === statusFilter);
  }, [campaigns, statusFilter]);

  const totalDelivered = useMemo(
    () => campaigns.reduce((acc, c) => acc + (c.deliveredCount || 0), 0),
    [campaigns]
  );
  const totalSent = useMemo(
    () => campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0),
    [campaigns]
  );
  const totalRevenue = useMemo(
    () => campaigns.reduce((acc, c) => acc + (c.attributedRevenue || 0), 0),
    [campaigns]
  );
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 100;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Email Campaigns</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              AI Outreach
            </span>
          </div>
          <p className="mt-1 text-muted-foreground text-small">
            Plan, compose, and safely dispatch targeted outreach to your leads within daily rate limits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/email/activity">
              <BarChart3 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              Activity Log
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/settings/email">
              <Settings className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              Settings
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loadingEligible}
            onClick={handlePrepareToday}
            className="border-purple-500/40 text-purple-600 hover:bg-purple-500/10 dark:text-purple-400"
          >
            {loadingEligible ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            Prepare Today&apos;s 10
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setComposerLeads([]);
              setIsComposerOpen(true);
            }}
          >
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            Quick Composer
          </Button>
          <Button
            variant="primary"
            size="sm"
            asChild
            className="shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Link href="/admin/campaigns/new">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Visual Email Designer
            </Link>
          </Button>
        </div>
      </div>

      {/* Emergency Pause Warning Banner */}
      {isPaused && (
        <div className="flex flex-col items-start justify-between gap-4 rounded-[var(--radius-sm)] border border-destructive/40 bg-destructive/10 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-destructive">Emergency Kill Switch Activated</p>
              <p className="text-[13px] text-muted-foreground">
                Marketing outreach is currently paused. No promotional emails will be sent until resumed.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={togglingPause}
            onClick={handleToggleEmergencyPause}
          >
            {togglingPause ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Resume Outreach
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Daily Quota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums">
                {quota ? quota.sentToday : "—"} / {quota ? quota.dailyLimit : 10}
              </span>
              <Badge variant={quota && quota.remainingToday > 0 ? "secondary" : "destructive"}>
                {quota ? `${quota.remainingToday} left` : "—"}
              </Badge>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${
                    quota
                      ? Math.min(100, Math.round((quota.sentToday / (quota.dailyLimit || 1)) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Protects sender domain reputation. Max 10/day default.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Delivery Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums">{deliveryRate}%</span>
              <span className="flex items-center text-[12px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                {totalDelivered.toLocaleString()} delivered
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Across all campaigns ({totalSent.toLocaleString()} total dispatched)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Campaigns Created
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums">{campaigns.length}</span>
              <Badge variant="outline">
                {campaigns.filter((c) => c.status === "SENT").length} completed
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Targeted outreach batches with verified SMTP logging
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Attributed Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums">
                ${totalRevenue.toFixed(2)}
              </span>
              <span className="flex items-center text-[12px] text-primary">
                <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
                Tracked Orders
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Direct checkout conversions via outreach click tokens
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Campaign Directory */}
      <Card className="overflow-hidden">
        <div className="border-b border-border bg-gradient-to-br from-secondary/50 to-background px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              <span className="text-small font-medium">Filter by Status:</span>
              <div className="flex flex-wrap gap-1">
                {(["ALL", "ACTIVE", "SENT", "DRAFT", "PAUSED", "CANCELLED"] as const).map(
                  (tab) => (
                    <Button
                      key={tab}
                      variant={statusFilter === tab ? "primary" : "ghost"}
                      size="sm"
                      className="h-7 px-2.5 text-[11px]"
                      onClick={() => setStatusFilter(tab)}
                    >
                      {tab === "ALL" ? "All Campaigns" : tab}
                    </Button>
                  )
                )}
              </div>
            </div>

            {!isPaused && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] text-muted-foreground hover:text-destructive"
                onClick={handleToggleEmergencyPause}
              >
                Emergency Kill Switch
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-[var(--radius-sm)]" />
              ))}
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="py-16 text-center">
              <Mail className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 font-medium text-foreground">No campaigns found</p>
              <p className="mt-1 text-small text-muted-foreground">
                {statusFilter === "ALL"
                  ? "Get started by generating your first AI outreach batch."
                  : `No campaigns currently in status '${statusFilter}'.`}
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setComposerLeads([]);
                  setIsComposerOpen(true);
                }}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Compose Campaign
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredCampaigns.map((camp) => {
                const isLive = camp.status === "SENDING";
                const isSent = camp.status === "SENT";
                const isFailed = camp.status === "FAILED";
                const isPausedStatus = camp.status === "PAUSED";
                const isDraft = camp.status === "DRAFT";

                return (
                  <div
                    key={camp._id}
                    className="flex flex-col gap-4 p-5 transition-colors hover:bg-secondary/20 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/campaigns/${camp._id}`}
                          className="font-semibold text-foreground hover:underline"
                        >
                          {camp.name}
                        </Link>

                        {/* Status Badge */}
                        {isLive ? (
                          <Badge className="animate-pulse bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            <Clock className="mr-1 h-3 w-3" />
                            Sending
                          </Badge>
                        ) : isSent ? (
                          <Badge variant="success">✓ Sent</Badge>
                        ) : isFailed ? (
                          <Badge variant="destructive">Failed</Badge>
                        ) : isPausedStatus ? (
                          <Badge variant="secondary">Paused</Badge>
                        ) : (
                          <Badge variant="outline">{camp.status}</Badge>
                        )}

                        {camp.productName && (
                          <Badge variant="secondary" className="text-[11px]">
                            {camp.productName}
                          </Badge>
                        )}
                      </div>

                      <p className="truncate text-[13px] text-muted-foreground">
                        <span className="font-medium text-foreground/80">Subject:</span>{" "}
                        {camp.subject}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span>Created {new Date(camp.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>
                          <strong className="text-foreground">{camp.sentCount}</strong> /{" "}
                          {camp.totalRecipients} sent
                        </span>
                        {camp.failedCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-destructive font-medium">
                              {camp.failedCount} failed
                            </span>
                          </>
                        )}
                        {camp.clickCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-primary font-medium">
                              {camp.clickCount} clicks
                            </span>
                          </>
                        )}
                        {camp.attributedOrdersCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              {camp.attributedOrdersCount} orders (${camp.attributedRevenue.toFixed(2)})
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/campaigns/${camp._id}`}>
                          {isLive ? (
                            <>
                              <Play className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                              Processing Desk
                            </>
                          ) : (
                            "View Details"
                          )}
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Embedded Email Composer */}
      <EmailComposer
        open={isComposerOpen}
        onOpenChange={setIsComposerOpen}
        leads={composerLeads}
        onSuccess={() => {
          loadCampaigns();
          loadSettingsAndQuota();
        }}
      />
    </div>
  );
}
