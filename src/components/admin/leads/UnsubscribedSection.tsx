"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { Badge } from "@/components/ds/badge";
import { Skeleton } from "@/components/ds/skeleton";
import { toast, toastError } from "@/hooks/use-toast";
import { cn } from "@/components/ds/utils";
import {
  UserX,
  Mail,
  RotateCcw,
  Search,
  Filter,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Plus,
  Send,
  Calendar,
  UserCheck,
  CheckCircle2,
  X,
  Loader2,
  Inbox,
} from "lucide-react";
import type { SelectedLeadContext } from "@/components/admin/email/EmailComposer";

interface SuppressionItem {
  _id: string;
  email: string;
  reason: string;
  source: string;
  blockedAt: string;
  blockedBy?: string;
  isPermanent: boolean;
  notes?: string;
  createdAt: string;
  lead?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    country?: string;
    phone?: string;
    phoneCountry?: string;
    brand?: string;
    emailSentCount?: number;
    lastEmailSentAt?: string;
  } | null;
}

interface SuppressionStats {
  total: number;
  unsubscribed: number;
  manualBlock: number;
  hardFailure: number;
  complaint: number;
  other: number;
}

interface UnsubscribedSectionProps {
  onSendEmail: (lead: SelectedLeadContext) => void;
  onStatsChange?: (stats: SuppressionStats) => void;
}

export function UnsubscribedSection({
  onSendEmail,
  onStatsChange,
}: UnsubscribedSectionProps) {
  const { accessToken } = useAuthStore();
  const [items, setItems] = useState<SuppressionItem[]>([]);
  const [stats, setStats] = useState<SuppressionStats>({
    total: 0,
    unsubscribed: 0,
    manualBlock: 0,
    hardFailure: 0,
    complaint: 0,
    other: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [queryTerm, setQueryTerm] = useState("");
  const [reasonFilter, setReasonFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Unsuppress in progress states
  const [actionInProgressEmail, setActionInProgressEmail] = useState<string | null>(null);

  // Manual Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualReason, setManualReason] = useState("MANUAL_BLOCK");
  const [manualNotes, setManualNotes] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }),
    [accessToken]
  );

  const loadSuppressions = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (reasonFilter && reasonFilter !== "ALL") {
        params.set("reason", reasonFilter);
      }
      if (queryTerm.trim()) {
        params.set("q", queryTerm.trim());
      }

      const res = await fetch(`/api/v1/admin/email/suppressions?${params.toString()}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items || []);
        setTotalPages(data.data.pages || 1);
        setTotalCount(data.data.total || 0);
        if (data.data.stats) {
          setStats(data.data.stats);
          if (onStatsChange) onStatsChange(data.data.stats);
        }
      } else {
        toastError("Failed to load unsubscribed list", data.error);
      }
    } catch (err) {
      toastError("Error", err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeaders, page, reasonFilter, queryTerm, onStatsChange]);

  useEffect(() => {
    loadSuppressions();
  }, [loadSuppressions]);

  // Handle Remove Unsubscribe (Unsuppress)
  const handleRemoveUnsubscribe = async (email: string, silent: boolean = false) => {
    setActionInProgressEmail(email);
    try {
      const res = await fetch(`/api/v1/admin/email/suppressions?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        if (!silent) {
          toast({
            variant: "success",
            title: "Unsubscribe Removed",
            description: `${email} is now eligible to receive emails again.`,
          });
        }
        // Remove locally from state for immediate snappy UI response
        setItems((prev) => prev.filter((i) => i.email.toLowerCase() !== email.toLowerCase()));
        setStats((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          unsubscribed: Math.max(0, prev.unsubscribed - 1),
        }));
        setTotalCount((prev) => Math.max(0, prev - 1));
        return data.data?.lead || null;
      } else {
        toastError("Failed to remove unsubscribe", data.error);
        return null;
      }
    } catch (err) {
      toastError("Error", err instanceof Error ? err.message : "Failed to unsuppress");
      return null;
    } finally {
      setActionInProgressEmail(null);
    }
  };

  // Handle Send Email Again:
  // 1. Automatically removes the unsubscribe status so the email won't be blocked.
  // 2. Prepares the lead context and triggers the EmailComposer.
  const handleSendEmailAgain = async (item: SuppressionItem) => {
    setActionInProgressEmail(item.email);
    try {
      // 1. Unsuppress first
      const restoredLead = await handleRemoveUnsubscribe(item.email, true);

      // 2. Construct lead context for EmailComposer
      const leadContext: SelectedLeadContext = {
        _id: item.lead?._id || restoredLead?._id || `temp-${Date.now()}`,
        email: item.email,
        firstName: item.lead?.firstName || restoredLead?.firstName || "",
        lastName: item.lead?.lastName || restoredLead?.lastName || "",
        country: item.lead?.country || restoredLead?.country || "",
        phone: item.lead?.phone || restoredLead?.phone || "",
        phoneCountry: item.lead?.phoneCountry || "",
        brand: item.lead?.brand || "",
        emailSentCount: item.lead?.emailSentCount || 0,
        isSuppressed: false,
      };

      toast({
        variant: "success",
        title: "Ready to Send",
        description: `Unsubscribe removed for ${item.email}. Opening email composer...`,
      });

      // 3. Open composer with this recipient
      onSendEmail(leadContext);
    } catch (err) {
      toastError("Error", err instanceof Error ? err.message : "Failed to prepare email send");
    } finally {
      setActionInProgressEmail(null);
    }
  };

  // Handle Manual Suppress Submit
  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail.trim()) {
      toastError("Email Required", "Please enter a valid email address.");
      return;
    }

    setSubmittingManual(true);
    try {
      const res = await fetch("/api/v1/admin/email/suppressions", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          email: manualEmail.trim(),
          reason: manualReason,
          notes: manualNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          variant: "success",
          title: "Email Suppressed",
          description: `${manualEmail.trim()} has been added to the suppression list.`,
        });
        setIsAddModalOpen(false);
        setManualEmail("");
        setManualNotes("");
        loadSuppressions();
      } else {
        toastError("Suppression Failed", data.error);
      }
    } catch (err) {
      toastError("Error", err instanceof Error ? err.message : "Failed to add suppression");
    } finally {
      setSubmittingManual(false);
    }
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case "UNSUBSCRIBED":
        return (
          <Badge variant="destructive" className="flex items-center gap-1 font-medium text-[11px] py-0.5 px-2">
            <UserX className="h-3 w-3" />
            Unsubscribed via Link
          </Badge>
        );
      case "MANUAL_BLOCK":
        return (
          <Badge variant="secondary" className="flex items-center gap-1 font-medium text-[11px] py-0.5 px-2 bg-amber-100 text-amber-900 border-amber-200">
            <ShieldAlert className="h-3 w-3 text-amber-700" />
            Admin Manual Block
          </Badge>
        );
      case "HARD_FAILURE":
        return (
          <Badge variant="destructive" className="flex items-center gap-1 font-medium text-[11px] py-0.5 px-2 bg-rose-100 text-rose-800 border-rose-200">
            <AlertTriangle className="h-3 w-3 text-rose-600" />
            Hard Delivery Bounce
          </Badge>
        );
      case "COMPLAINT":
        return (
          <Badge variant="secondary" className="flex items-center gap-1 font-medium text-[11px] py-0.5 px-2 bg-purple-100 text-purple-900 border-purple-200">
            <AlertTriangle className="h-3 w-3 text-purple-700" />
            Spam Complaint
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[11px] py-0.5 px-2">
            {reason.toLowerCase().replace(/_/g, " ")}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/80 bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Ineligible
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {stats.total.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Contacts suppressed from outreach
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <UserX className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Unsubscribed via Link
              </p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">
                {stats.unsubscribed.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Clicked unsubscribe in email
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Manual Admin Blocks
              </p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">
                {stats.manualBlock.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Blocked manually in CRM
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Bounced / Invalid
              </p>
              <h3 className="text-2xl font-bold text-slate-700 mt-1">
                {(stats.hardFailure + stats.complaint + stats.other).toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                SMTP delivery rejections
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border border-border/80 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
            <form
              className="flex items-center gap-2 flex-1 max-w-md"
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                setQueryTerm(search);
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by email, name, notes..."
                  className="pl-9 text-xs h-9"
                />
              </div>
              <Button type="submit" variant="outline" size="sm" className="h-9 text-xs">
                Search
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground hidden md:inline" />
              <select
                className="h-9 rounded-[var(--radius-sm)] border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={reasonFilter}
                onChange={(e) => {
                  setPage(1);
                  setReasonFilter(e.target.value);
                }}
              >
                <option value="ALL">All Reasons ({stats.total})</option>
                <option value="UNSUBSCRIBED">Unsubscribed via Link ({stats.unsubscribed})</option>
                <option value="MANUAL_BLOCK">Admin Blocked ({stats.manualBlock})</option>
                <option value="HARD_FAILURE">Bounced / Failed ({stats.hardFailure})</option>
                <option value="COMPLAINT">Spam Complaint ({stats.complaint})</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs gap-1.5"
              onClick={() => {
                setSearch("");
                setQueryTerm("");
                setReasonFilter("ALL");
                setPage(1);
                loadSuppressions();
              }}
              title="Refresh list"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="h-9 text-xs gap-1.5"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Suppression
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suppressed Email List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-[var(--radius-sm)]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border border-dashed border-border/80 p-8 text-center bg-card/50">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            No Unsubscribed or Suppressed Contacts
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {queryTerm || reasonFilter !== "ALL"
              ? "No contacts matched your search filter. Try clearing your filters."
              : "All your leads are currently eligible to receive outreach. None are unsubscribed or blocked."}
          </p>
          {(queryTerm || reasonFilter !== "ALL") && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs"
              onClick={() => {
                setSearch("");
                setQueryTerm("");
                setReasonFilter("ALL");
              }}
            >
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isProcessing = actionInProgressEmail === item.email;
            const leadName = item.lead
              ? [item.lead.firstName, item.lead.lastName].filter(Boolean).join(" ")
              : undefined;

            return (
              <Card
                key={item._id}
                className="border border-border/80 bg-card hover:border-border transition-all shadow-sm"
              >
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Left info: Email, Name, Badges, Notes */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/40">
                        {item.email}
                      </span>
                      {getReasonBadge(item.reason)}
                      {leadName && (
                        <Badge variant="outline" className="text-[11px] text-muted-foreground font-normal">
                          Lead: {leadName} {item.lead?.country ? `(${item.lead.country})` : ""}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground/70" />
                        Blocked: {new Date(item.blockedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {item.source && (
                        <span>
                          Source: <span className="font-medium text-foreground/80">{item.source}</span>
                        </span>
                      )}
                      {item.blockedBy && (
                        <span>
                          By: <span className="font-medium text-foreground/80">{item.blockedBy}</span>
                        </span>
                      )}
                      {item.notes && (
                        <span className="italic text-muted-foreground">
                          &ldquo;{item.notes}&rdquo;
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Remove Unsubscribe, Send Email Again */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-2.5 md:pt-0 border-border/50">
                    {/* Action 1: Remove Unsubscribe */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs gap-1.5 text-muted-foreground hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
                      disabled={isProcessing}
                      onClick={() => handleRemoveUnsubscribe(item.email)}
                      title="Remove from suppression list so recipient can receive marketing emails again"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      <span>Remove Unsubscribe</span>
                    </Button>

                    {/* Action 2: Send Email Again */}
                    <Button
                      size="sm"
                      variant="primary"
                      className="h-8 px-3 text-xs gap-1.5 shadow-sm"
                      disabled={isProcessing}
                      onClick={() => handleSendEmailAgain(item)}
                      title="Unsuppress this contact and open composer to send an email immediately"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span>Send Email Again</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Showing {items.length} of {totalCount} suppressed contacts
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground px-1">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Suppress Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex items-center gap-2.5">
              <div className="rounded-xl bg-destructive/10 p-2 text-destructive">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">
                  Add Email to Suppression List
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Prevent all automated and direct outreach to this address
                </p>
              </div>
            </div>

            <form onSubmit={handleAddSuppression} className="space-y-4 text-xs">
              <div>
                <Label htmlFor="manual-email" className="text-xs font-semibold block mb-1">
                  Email Address *
                </Label>
                <Input
                  id="manual-email"
                  type="email"
                  required
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="contact@example.com"
                  className="text-xs h-9"
                />
              </div>

              <div>
                <Label htmlFor="manual-reason" className="text-xs font-semibold block mb-1">
                  Suppression Reason
                </Label>
                <select
                  id="manual-reason"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full h-9 rounded-[var(--radius-sm)] border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="MANUAL_BLOCK">Admin Manual Block</option>
                  <option value="UNSUBSCRIBED">Unsubscribed</option>
                  <option value="HARD_FAILURE">Hard Delivery Failure / Bounced</option>
                  <option value="COMPLAINT">Spam Complaint</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div>
                <Label htmlFor="manual-notes" className="text-xs font-semibold block mb-1">
                  Notes / Reason Details (Optional)
                </Label>
                <Input
                  id="manual-notes"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. Requested removal via customer support chat"
                  className="text-xs h-9"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submittingManual}
                >
                  {submittingManual ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Add to Suppression List"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
