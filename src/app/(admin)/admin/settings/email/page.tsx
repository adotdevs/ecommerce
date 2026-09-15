"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Textarea } from "@/components/ds/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ds/card";
import { Badge } from "@/components/ds/badge";
import { Switch } from "@/components/ds/switch";
import { Skeleton } from "@/components/ds/skeleton";
import { toast, toastError } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Mail,
  RotateCcw,
  Sliders,
} from "lucide-react";

export default function EmailOutreachSettingsPage() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");

  const [form, setForm] = useState({
    dailyLimit: 10,
    cooldownDays: 14,
    maxRetries: 2,
    retryDelayMinutes: 30,
    defaultSenderName: "Findora Store",
    defaultSenderEmail: "shop@findora.market",
    defaultReplyTo: "support@findora.market",
    defaultFooterCopy: "You received this email because you subscribed to updates from Findora.",
    companyAddress: "Findora Market, 100 Market St.",
    defaultTestRecipient: "",
    defaultUtmSource: "email",
    defaultUtmMedium: "campaign",
    isAiAssistanceEnabled: true,
    isMarketingPaused: false,
  });

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }),
    [accessToken]
  );

  const loadSettings = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/email/settings", {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success && data.data.settings) {
        const s = data.data.settings;
        setForm({
          dailyLimit: s.dailyLimit ?? 10,
          cooldownDays: s.cooldownDays ?? 14,
          maxRetries: s.maxRetries ?? 2,
          retryDelayMinutes: s.retryDelayMinutes ?? 30,
          defaultSenderName: s.defaultSenderName ?? "Findora Store",
          defaultSenderEmail: s.defaultSenderEmail ?? "shop@findora.market",
          defaultReplyTo: s.defaultReplyTo ?? "support@findora.market",
          defaultFooterCopy:
            s.defaultFooterCopy ??
            "You received this email because you subscribed to updates from Findora.",
          companyAddress: s.companyAddress ?? "Findora Market, 100 Market St.",
          defaultTestRecipient: s.defaultTestRecipient ?? "",
          defaultUtmSource: s.defaultUtmSource ?? "email",
          defaultUtmMedium: s.defaultUtmMedium ?? "campaign",
          isAiAssistanceEnabled: s.isAiAssistanceEnabled ?? true,
          isMarketingPaused: s.isMarketingPaused ?? false,
        });
        if (s.defaultTestRecipient) {
          setTestEmailAddress(s.defaultTestRecipient);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeaders]);

  useEffect(() => {
    if (accessToken) {
      loadSettings();
    }
  }, [accessToken, loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/email/settings", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          ...form,
          defaultTestRecipient: testEmailAddress || form.defaultTestRecipient,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          variant: "success",
          title: "Settings Saved",
          description: "Outreach parameters and sender defaults have been updated.",
        });
      } else {
        toastError("Failed to save settings", data.error);
      }
    } catch (err) {
      toastError("Error", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      toastError("Recipient required", "Enter an email address to receive the test message.");
      return;
    }
    setTestingSmtp(true);
    try {
      const res = await fetch("/api/v1/admin/email/test", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          recipientEmail: testEmailAddress.trim(),
          subject: "Findora SMTP Configuration Test",
          bodyText: "This is a live test email sent from your Findora ecommerce outreach system.",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          variant: "success",
          title: "Test Email Dispatched",
          description: `Delivered to ${testEmailAddress}. Check your inbox or spam folder.`,
        });
      } else {
        toastError("SMTP Test Failed", data.error);
      }
    } catch (err) {
      toastError("Error", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setTestingSmtp(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-48 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-sm)]" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-sm)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
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
              Email Outreach Settings
            </h1>
            <p className="mt-1 text-small text-muted-foreground">
              Configure daily dispatch rate limits, cooldown periods, sender signatures, and emergency safeguards.
            </p>
          </div>

          <Button
            type="submit"
            form="settings-form"
            variant="primary"
            size="sm"
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save Settings
          </Button>
        </div>
      </div>

      {/* Emergency Kill Switch Banner */}
      <Card className={form.isMarketingPaused ? "border-destructive/50 bg-destructive/5" : ""}>
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                form.isMarketingPaused
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {form.isMarketingPaused ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">Emergency Kill Switch</p>
              <p className="text-[12px] text-muted-foreground">
                Instantly pause all outbound marketing emails across all campaigns and workers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-muted-foreground">
              {form.isMarketingPaused ? "PAUSED" : "ACTIVE"}
            </span>
            <Switch
              checked={form.isMarketingPaused}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, isMarketingPaused: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <form id="settings-form" onSubmit={handleSave} className="space-y-6">
        {/* Rate Limiting & Safety */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              Rate Limits &amp; Anti-Spam Safeguards
            </CardTitle>
            <CardDescription>
              Enforce strict outbound thresholds to keep your SMTP server IP and domain reputation pristine.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Daily Outreach Limit (Emails / Day)</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={form.dailyLimit}
                onChange={(e) =>
                  setForm({ ...form, dailyLimit: parseInt(e.target.value) || 10 })
                }
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Default 10 emails/day. Resets automatically at 00:00 UTC.
              </p>
            </div>

            <div>
              <Label>Lead Cooldown Period (Days)</Label>
              <Input
                type="number"
                min={0}
                max={90}
                value={form.cooldownDays}
                onChange={(e) =>
                  setForm({ ...form, cooldownDays: parseInt(e.target.value) || 14 })
                }
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Default 14 days. Minimum days that must elapse before a lead can receive another email.
              </p>
            </div>

            <div>
              <Label>Max Retry Attempts</Label>
              <Input
                type="number"
                min={0}
                max={5}
                value={form.maxRetries}
                onChange={(e) =>
                  setForm({ ...form, maxRetries: parseInt(e.target.value) || 2 })
                }
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Maximum automatic retry attempts for transient 4xx errors (hard bounces are never retried).
              </p>
            </div>

            <div>
              <Label>Retry Delay (Minutes)</Label>
              <Input
                type="number"
                min={5}
                max={1440}
                value={form.retryDelayMinutes}
                onChange={(e) =>
                  setForm({ ...form, retryDelayMinutes: parseInt(e.target.value) || 30 })
                }
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Delay interval before attempting a failed message again.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sender Identity & Compliance Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Sender Identity &amp; Compliance Defaults
            </CardTitle>
            <CardDescription>
              Defaults applied when rendering outbound campaigns, CAN-SPAM legal footers, and tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Sender Name</Label>
              <Input
                value={form.defaultSenderName}
                onChange={(e) => setForm({ ...form, defaultSenderName: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Sender Email Address</Label>
              <Input
                type="email"
                value={form.defaultSenderEmail}
                onChange={(e) => setForm({ ...form, defaultSenderEmail: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Reply-To Email</Label>
              <Input
                type="email"
                value={form.defaultReplyTo}
                onChange={(e) => setForm({ ...form, defaultReplyTo: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Company Physical Address</Label>
              <Input
                value={form.companyAddress}
                onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Required by CAN-SPAM and international anti-spam regulations.
              </p>
            </div>

            <div className="sm:col-span-2">
              <Label>Footer Unsubscribe Notice</Label>
              <Textarea
                rows={2}
                value={form.defaultFooterCopy}
                onChange={(e) => setForm({ ...form, defaultFooterCopy: e.target.value })}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tracking & AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Analytics &amp; AI Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Default UTM Source</Label>
              <Input
                value={form.defaultUtmSource}
                onChange={(e) => setForm({ ...form, defaultUtmSource: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Default UTM Medium</Label>
              <Input
                value={form.defaultUtmMedium}
                onChange={(e) => setForm({ ...form, defaultUtmMedium: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border p-4 sm:col-span-2">
              <div>
                <p className="font-medium text-foreground">AI Copywriting Assistant</p>
                <p className="text-[12px] text-muted-foreground">
                  Enable GPT-4o-mini inside the email composer for drafting, subject line scoring, and pre-send quality checks.
                </p>
              </div>
              <Switch
                checked={form.isAiAssistanceEnabled}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isAiAssistanceEnabled: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Live SMTP Diagnostic Test Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-primary" />
            Live SMTP Connection Test
          </CardTitle>
          <CardDescription>
            Verify that your production SMTP server credentials and DKIM/SPF setup are operational by sending a live test email.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="email"
            placeholder="admin@yourdomain.com"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
            className="flex-1 bg-background"
          />
          <Button
            type="button"
            variant="outline"
            disabled={testingSmtp || !testEmailAddress.trim()}
            onClick={handleSendTestEmail}
            className="shrink-0"
          >
            {testingSmtp ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            Send Live Test
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
