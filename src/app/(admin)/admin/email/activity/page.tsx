"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { Badge } from "@/components/ds/badge";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
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
  Download,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/components/ds/utils";

interface ActivityMessage {
  _id: string;
  campaignId?: string;
  campaignName?: string;
  recipientEmail: string;
  recipientName?: string;
  status: string;
  subjectSnapshot: string;
  renderedHtmlSnapshot?: string;
  sentAt?: string;
  failedAt?: string;
  lastAttemptAt?: string;
  lastErrorMessage?: string;
  lastSmtpCode?: number;
  clickCount?: number;
  createdAt: string;
}

export default function EmailActivityPage() {
  const { accessToken } = useAuthStore();
  const [messages, setMessages] = useState<ActivityMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [viewingHtml, setViewingHtml] = useState<string | null>(null);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }),
    [accessToken]
  );

  const loadActivity = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
      });
      if (statusFilter) params.set("status", statusFilter);
      if (query.trim()) params.set("query", query.trim());

      const res = await fetch(`/api/v1/admin/email/activity?${params}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.items ?? []);
        setPages(data.data.pages ?? 1);
        setTotal(data.data.total ?? 0);
      } else {
        toastError("Failed to load activity", data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, statusFilter, query, authHeaders]);

  useEffect(() => {
    if (accessToken) {
      loadActivity();
    }
  }, [accessToken, loadActivity]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (query.trim()) params.set("query", query.trim());
    params.set("export", "csv");
    window.open(`/api/v1/admin/email/activity?${params.toString()}`, "_blank");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Back button & Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="pl-0 text-muted-foreground">
          <Link href="/admin/campaigns">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Campaigns
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Email Outreach Activity
            </h1>
            <p className="mt-1 text-small text-muted-foreground">
              Comprehensive audit log of every email outreach attempt, delivery, bounce, and click.
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export Full CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label>Search by recipient or subject</Label>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                setQuery(search);
              }}
            >
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search email, name, subject..."
              />
              <Button type="submit" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <div>
            <Label>Status</Label>
            <select
              className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 text-small"
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value);
              }}
            >
              <option value="">All Statuses</option>
              <option value="SENT">Delivered / Sent</option>
              <option value="FAILED">Delivery Failed</option>
              <option value="PENDING">Pending in Queue</option>
              <option value="SUPPRESSED">Suppressed / Blocked</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardHeader className="border-b border-border bg-secondary/30 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Activity Logs ({total.toLocaleString()})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-[var(--radius-sm)]" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No activity matching the specified criteria.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {messages.map((msg) => {
                const isSent = msg.status === "SENT";
                const isFailed = msg.status === "FAILED";

                return (
                  <div
                    key={msg._id}
                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-secondary/15 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {msg.recipientEmail}
                        </span>
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
                        {msg.campaignName && (
                          <Badge variant="outline" className="text-[11px]">
                            {msg.campaignId ? (
                              <Link
                                href={`/admin/campaigns/${msg.campaignId}`}
                                className="hover:underline"
                              >
                                {msg.campaignName}
                              </Link>
                            ) : (
                              msg.campaignName
                            )}
                          </Badge>
                        )}
                        {msg.clickCount && msg.clickCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            <MousePointerClick className="h-3 w-3" />
                            {msg.clickCount} clicks
                          </span>
                        ) : null}
                      </div>

                      <p className="truncate text-[13px] text-muted-foreground">
                        <span className="font-medium text-foreground/80">Subject:</span>{" "}
                        {msg.subjectSnapshot}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span>
                          {msg.sentAt
                            ? `Sent ${new Date(msg.sentAt).toLocaleString()}`
                            : `Logged ${new Date(msg.createdAt).toLocaleString()}`}
                        </span>
                        {isFailed && msg.lastErrorMessage && (
                          <>
                            <span>•</span>
                            <span className="text-destructive font-mono">
                              {msg.lastSmtpCode ? `[${msg.lastSmtpCode}] ` : ""}
                              {msg.lastErrorMessage}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {msg.renderedHtmlSnapshot && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-[12px]"
                          onClick={() => setViewingHtml(msg.renderedHtmlSnapshot || "")}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-small text-muted-foreground">
          Page {page} of {pages} ({total.toLocaleString()} total entries)
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Email Snapshot Modal */}
      <Dialog open={!!viewingHtml} onOpenChange={(open) => !open && setViewingHtml(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delivered Email Snapshot</DialogTitle>
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
