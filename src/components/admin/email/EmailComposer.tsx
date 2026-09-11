"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ds/modal";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Badge } from "@/components/ds/badge";
import { toast, toastError } from "@/hooks/use-toast";
import {
  Sparkles,
  Send,
  Eye,
  Smartphone,
  Monitor,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  ChevronDown,
} from "lucide-react";

export interface SelectedLeadContext {
  _id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  emailSentCount?: number;
  lastEmailSentAt?: string;
  isSuppressed?: boolean;
}

interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: SelectedLeadContext[];
  onSuccess?: () => void;
  initialSubject?: string;
  initialBody?: string;
}

interface ProductItem {
  _id: string;
  name: string;
  slug: string;
  pricing?: { price: number; compareAtPrice?: number };
  media?: { url: string }[];
  description?: string;
}

export function EmailComposer({
  open,
  onOpenChange,
  leads,
  onSuccess,
  initialSubject = "",
  initialBody = "",
}: EmailComposerProps) {
  const [tab, setTab] = useState<"edit" | "preview" | "review">("edit");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Campaign Form State
  const [campaignName, setCampaignName] = useState("");
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("premium, warm, and professional");
  const [subject, setSubject] = useState(initialSubject);
  const [previewText, setPreviewText] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState(initialBody);
  const [ctaText, setCtaText] = useState("Shop Collection");
  const [ctaUrl, setCtaUrl] = useState("/products");
  const [couponCode, setCouponCode] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");

  // Product Selector State
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<ProductItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);

  // AI & Operation Loading States
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isGeneratingSubjects, setIsGeneratingSubjects] = useState(false);
  const [subjectOptions, setSubjectOptions] = useState<Array<{ subject: string; angle: string }>>([]);
  const [isReviewingAi, setIsReviewingAi] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState<{
    clarityScore: number;
    toneAssessment: string;
    warnings: string[];
    suggestions: string[];
  } | null>(null);

  // Dry Run & Test Email
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [dryRunData, setDryRunData] = useState<{
    rendered: { html: string; text: string; missingVariables: string[] };
    dryRun: {
      totalSelected: number;
      eligibleCount: number;
      excludedCount: number;
      excluded: Array<{ leadId: string; email?: string; name: string; reasons: string[] }>;
    };
  } | null>(null);

  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search product catalog
  useEffect(() => {
    if (!productSearch.trim()) {
      setProductResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingProduct(true);
      try {
        const res = await fetch(`/api/v1/products?q=${encodeURIComponent(productSearch)}&limit=5`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.items)) {
          setProductResults(data.data.items);
        }
      } catch {
        // Ignore search errors
      } finally {
        setIsSearchingProduct(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch]);

  // Set default campaign name when opened
  useEffect(() => {
    if (open && !campaignName) {
      const now = new Date();
      setCampaignName(`Outreach - ${now.toLocaleDateString()}`);
    }
  }, [open, campaignName]);

  // Trigger Dry Run whenever preview tab is opened
  const fetchDryRunPreview = async () => {
    setIsDryRunning(true);
    try {
      const res = await fetch("/api/v1/admin/email/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject || "Special Announcement",
          previewText,
          headline,
          body: body || "We have something special for you.",
          ctaText,
          ctaUrl,
          couponCode,
          leadIds: leads.map((l) => l._id),
          product: selectedProduct
            ? {
                name: selectedProduct.name,
                image: selectedProduct.media?.[0]?.url,
                price: selectedProduct.pricing?.price,
                salePrice: selectedProduct.pricing?.compareAtPrice,
                url: `/products/${selectedProduct.slug}`,
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDryRunData(data.data);
      }
    } catch {
      toastError("Preview failed", "Could not render preview.");
    } finally {
      setIsDryRunning(false);
    }
  };

  // AI Generation
  const handleWriteWithAi = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/v1/admin/email/ai/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          tone,
          couponCode,
          product: selectedProduct
            ? {
                name: selectedProduct.name,
                description: selectedProduct.description,
                price: selectedProduct.pricing?.price,
                salePrice: selectedProduct.pricing?.compareAtPrice,
              }
            : undefined,
          leadContext:
            leads.length === 1
              ? {
                  firstName: leads[0].firstName,
                  previousEmailsCount: leads[0].emailSentCount || 0,
                }
              : undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.draft) {
        const d = data.data.draft;
        setSubject(d.subject);
        setPreviewText(d.previewText);
        setHeadline(d.headline);
        setBody(d.body);
        if (d.ctaText) setCtaText(d.ctaText);
        toast({ variant: "success", title: "AI Draft Generated" });
      } else {
        toastError("AI Generation Failed", data.error || "Please try again or edit manually.");
      }
    } catch {
      toastError("AI Generation Error", "Network error during AI generation.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // AI Subject Line Generator
  const handleGenerateSubjects = async () => {
    setIsGeneratingSubjects(true);
    try {
      const res = await fetch("/api/v1/admin/email/ai/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: selectedProduct?.name,
          headline,
          bodySnippet: body,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.options)) {
        setSubjectOptions(data.data.options);
      } else {
        toastError("Could not generate subjects", data.error);
      }
    } catch {
      toastError("Error", "Failed to generate subject options.");
    } finally {
      setIsGeneratingSubjects(false);
    }
  };

  // AI Improve action
  const handleImproveAi = async (
    action: "shorter" | "more_premium" | "more_friendly" | "more_persuasive" | "less_salesy" | "improve_cta" | "fix_grammar"
  ) => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/v1/admin/email/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentDraft: { subject, previewText, headline, body, ctaText },
          action,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.draft) {
        const d = data.data.draft;
        setSubject(d.subject);
        setPreviewText(d.previewText);
        setHeadline(d.headline);
        setBody(d.body);
        if (d.ctaText) setCtaText(d.ctaText);
        toast({ variant: "success", title: `Applied: ${action.replace("_", " ")}` });
      } else {
        toastError("Improvement failed", data.error);
      }
    } catch {
      toastError("Error", "Could not improve draft.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // AI Pre-Send Review
  const handlePreSendReview = async () => {
    setIsReviewingAi(true);
    try {
      const res = await fetch("/api/v1/admin/email/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, previewText, headline, body, ctaText }),
      });
      const data = await res.json();
      if (data.success && data.data?.review) {
        setAiReviewResult(data.data.review);
        setTab("review");
      } else {
        toastError("Review failed", data.error);
      }
    } catch {
      toastError("Error", "Could not complete AI review.");
    } finally {
      setIsReviewingAi(false);
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      toastError("Enter email address", "Please provide a valid recipient for the test email.");
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await fetch("/api/v1/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: testEmailAddress.trim(),
          subject,
          previewText,
          headline,
          body,
          ctaText,
          ctaUrl,
          couponCode,
          product: selectedProduct
            ? {
                name: selectedProduct.name,
                image: selectedProduct.media?.[0]?.url,
                price: selectedProduct.pricing?.price,
                salePrice: selectedProduct.pricing?.compareAtPrice,
                url: `/products/${selectedProduct.slug}`,
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ variant: "success", title: "Test Email Sent", description: data.data.message });
      } else {
        toastError("Test Send Failed", data.error);
      }
    } catch {
      toastError("Error", "Could not send test email.");
    } finally {
      setIsSendingTest(false);
    }
  };

  // Submit and Queue Campaign
  const handleConfirmAndSend = async () => {
    if (!subject.trim()) {
      toastError("Subject required", "Please provide an email subject line.");
      return;
    }
    if (!body.trim()) {
      toastError("Body required", "Please write the email content.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/admin/email/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName.trim(),
          objective: goal || "Promotional Outreach",
          subject: subject.trim(),
          previewText: previewText.trim(),
          headline: headline.trim(),
          body: body.trim(),
          ctaText: ctaText.trim(),
          ctaUrl: ctaUrl.trim(),
          couponCode: couponCode.trim(),
          productId: selectedProduct?._id,
          productSnapshot: selectedProduct
            ? {
                name: selectedProduct.name,
                slug: selectedProduct.slug,
                price: selectedProduct.pricing?.price,
                salePrice: selectedProduct.pricing?.compareAtPrice,
                image: selectedProduct.media?.[0]?.url,
                description: selectedProduct.description,
                url: `/products/${selectedProduct.slug}`,
              }
            : undefined,
          leadIds: leads.map((l) => l._id),
          sendImmediately: !scheduleDate,
          scheduledAt: scheduleDate || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({
          variant: "success",
          title: "Outreach Campaign Created",
          description: `${data.data.eligibleCount} email(s) queued for delivery.`,
        });
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toastError("Failed to launch campaign", data.error);
      }
    } catch {
      toastError("Error", "Network error launching campaign.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Insert Variable Token helper
  const insertToken = (token: string) => {
    setBody((prev) => `${prev} {{${token}}}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto p-0 sm:max-h-[90vh]">
        <DialogHeader className="border-b border-border bg-card px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-bold">Email Outreach Composer</DialogTitle>
              <p className="text-small text-muted-foreground">
                Targeting{" "}
                <strong className="text-foreground">{leads.length} selected lead(s)</strong>
                {leads.length === 1 && leads[0].email ? ` (${leads[0].email})` : ""}
              </p>
            </div>

            <div className="flex gap-1.5 rounded-lg border border-border bg-secondary/50 p-1">
              <Button
                variant={tab === "edit" ? "primary" : "outline"}
                size="sm"
                onClick={() => setTab("edit")}
              >
                Compose
              </Button>
              <Button
                variant={tab === "preview" ? "primary" : "outline"}
                size="sm"
                onClick={() => {
                  setTab("preview");
                  fetchDryRunPreview();
                }}
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Preview & Dry Run
              </Button>
              <Button
                variant={tab === "review" ? "primary" : "outline"}
                size="sm"
                onClick={handlePreSendReview}
                disabled={isReviewingAi}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                AI Quality Review
              </Button>
            </div>
          </div>
        </DialogHeader>

        {tab === "edit" && (
          <div className="grid gap-6 p-6 md:grid-cols-3">
            {/* Left 2 Columns: Composition */}
            <div className="space-y-4 md:col-span-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 text-xs text-indigo-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Looking for full layout, multi-product, and block design control?</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-7 border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-100 text-[11px] shrink-0"
                >
                  <Link href="/admin/campaigns/new">Open Visual Designer</Link>
                </Button>
              </div>

              <div>
                <Label htmlFor="camp-name">Campaign Name</Label>
                <Input
                  id="camp-name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Weekend Flash Sale"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="camp-subject">Subject Line *</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={handleGenerateSubjects}
                    disabled={isGeneratingSubjects}
                  >
                    {isGeneratingSubjects ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 h-3 w-3 text-amber-500" />
                    )}
                    Generate Ideas
                  </Button>
                </div>
                <Input
                  id="camp-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line for recipient inbox..."
                />

                {/* Subject Suggestions Dropdown */}
                {subjectOptions.length > 0 && (
                  <div className="mt-2 space-y-1.5 rounded-lg border border-amber-500/20 bg-amber-50/50 p-2.5 dark:bg-amber-950/20">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                      AI Suggested Angles:
                    </p>
                    {subjectOptions.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        className="flex w-full items-center justify-between rounded p-1.5 text-left text-small text-foreground hover:bg-amber-100/60 dark:hover:bg-amber-900/40"
                        onClick={() => setSubject(opt.subject)}
                      >
                        <span>{opt.subject}</span>
                        <Badge variant="outline" className="text-[9px] uppercase">
                          {opt.angle.replace("_", " ")}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="camp-preview">Preview Text (Preheader)</Label>
                <Input
                  id="camp-preview"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Short preview snippet shown in inbox..."
                />
              </div>

              <div>
                <Label htmlFor="camp-headline">Hero Headline</Label>
                <Input
                  id="camp-headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Crafted for your weekend upgrade."
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 pb-1">
                  <Label htmlFor="camp-body">Email Body *</Label>
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    <span className="text-muted-foreground">Tokens:</span>
                    {["firstName", "productName", "productPrice", "salePrice", "discount", "couponCode"].map(
                      (token) => (
                        <button
                          key={token}
                          type="button"
                          onClick={() => insertToken(token)}
                          className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-foreground hover:bg-primary/20"
                        >
                          +{token}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <textarea
                  id="camp-body"
                  rows={8}
                  className="w-full rounded-[var(--radius-sm)] border border-border bg-background p-3 text-small text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your email here or use '✨ Write with AI'..."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="camp-cta">CTA Button Text</Label>
                  <Input
                    id="camp-cta"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="e.g. Shop Collection"
                  />
                </div>
                <div>
                  <Label htmlFor="camp-url">CTA Target Link</Label>
                  <Input
                    id="camp-url"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="/products or https://findora.market/..."
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="camp-coupon">Optional Promo Code</Label>
                  <Input
                    id="camp-coupon"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="e.g. WEEKEND20"
                  />
                </div>
                <div>
                  <Label htmlFor="camp-schedule">Schedule Delivery (Optional)</Label>
                  <Input
                    id="camp-schedule"
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: AI Assistant & Product Attach */}
            <div className="space-y-5 rounded-xl border border-border bg-secondary/30 p-4">
              <div>
                <h4 className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Assistant
                </h4>
                <p className="text-[12px] text-muted-foreground">
                  Generates copywriting grounded in real product facts.
                </p>
              </div>

              {/* Product Selector */}
              <div className="space-y-2">
                <Label>Featured Product</Label>
                {selectedProduct ? (
                  <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-2 text-small">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{selectedProduct.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        ${selectedProduct.pricing?.price || 0}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => {
                        setSelectedProduct(null);
                        setProductSearch("");
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search product to promote..."
                    />
                    {isSearchingProduct && (
                      <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                    )}

                    {productResults.length > 0 && (
                      <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                        {productResults.map((p) => (
                          <button
                            key={p._id}
                            type="button"
                            className="flex w-full items-center gap-2 p-2 text-left text-small hover:bg-secondary"
                            onClick={() => {
                              setSelectedProduct(p);
                              setProductResults([]);
                              setCtaUrl(`/products/${p.slug}`);
                            }}
                          >
                            <span className="truncate">{p.name}</span>
                            <span className="ml-auto shrink-0 text-muted-foreground">
                              ${p.pricing?.price}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="ai-goal">Campaign Goal</Label>
                <Input
                  id="ai-goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. 20% discount on summer bags"
                />
              </div>

              <div>
                <Label htmlFor="ai-tone">Tone & Style</Label>
                <select
                  id="ai-tone"
                  className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 text-small"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                >
                  <option value="premium, warm, and professional">Premium & Warm</option>
                  <option value="minimalist luxury and refined">Minimalist Luxury</option>
                  <option value="friendly, casual, and energetic">Friendly & Casual</option>
                  <option value="direct value and high conversion">Direct & High Conversion</option>
                </select>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={handleWriteWithAi}
                disabled={isGeneratingAi}
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Drafting with AI…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Write with AI
                  </>
                )}
              </Button>

              {/* Refinement Actions */}
              <div className="space-y-1.5 border-t border-border pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick Refinements:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { action: "shorter", label: "Shorter" },
                    { action: "more_premium", label: "Premium" },
                    { action: "more_persuasive", label: "Persuasive" },
                    { action: "less_salesy", label: "Less Salesy" },
                    { action: "improve_cta", label: "Stronger CTA" },
                    { action: "fix_grammar", label: "Polish Grammar" },
                  ].map((btn) => (
                    <Button
                      key={btn.action}
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => handleImproveAi(btn.action as unknown as Parameters<typeof handleImproveAi>[0])}
                      disabled={isGeneratingAi || !body.trim()}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Test Send Section */}
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Test Email:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="your@email.com"
                    className="h-8 text-small"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest}
                  >
                    {isSendingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send Test"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Preview & Dry Run */}
        {tab === "preview" && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={previewDevice === "desktop" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setPreviewDevice("desktop")}
                >
                  <Monitor className="mr-1.5 h-4 w-4" />
                  Desktop
                </Button>
                <Button
                  variant={previewDevice === "mobile" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setPreviewDevice("mobile")}
                >
                  <Smartphone className="mr-1.5 h-4 w-4" />
                  Mobile (375px)
                </Button>
              </div>

              {dryRunData?.rendered.missingVariables && dryRunData.rendered.missingVariables.length > 0 && (
                <Badge variant="destructive">
                  Missing: {dryRunData.rendered.missingVariables.join(", ")}
                </Badge>
              )}
            </div>

            {/* Dry Run Audience Breakdown */}
            {dryRunData && (
              <div className="grid gap-3 rounded-lg border border-border bg-secondary/30 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-[12px] text-muted-foreground">Total Selected</p>
                  <p className="text-xl font-bold">{dryRunData.dryRun.totalSelected}</p>
                </div>
                <div>
                  <p className="text-[12px] text-emerald-600 font-medium">Eligible To Send</p>
                  <p className="text-xl font-bold text-emerald-600">{dryRunData.dryRun.eligibleCount}</p>
                </div>
                <div>
                  <p className="text-[12px] text-amber-600 font-medium">Excluded</p>
                  <p className="text-xl font-bold text-amber-600">{dryRunData.dryRun.excludedCount}</p>
                </div>
              </div>
            )}

            {/* HTML Render Frame */}
            {isDryRunning ? (
              <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : dryRunData?.rendered?.html ? (
              <div
                className={`mx-auto overflow-hidden rounded-xl border border-border shadow-md transition-all ${
                  previewDevice === "mobile" ? "max-w-[390px]" : "w-full"
                }`}
              >
                <iframe
                  title="Email Preview"
                  srcDoc={dryRunData.rendered.html}
                  className="h-[520px] w-full border-none bg-white"
                />
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                Click Preview to render template.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: AI Quality Review */}
        {tab === "review" && (
          <div className="p-6 space-y-6">
            {isReviewingAi ? (
              <div className="flex h-64 flex-col items-center justify-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-small text-muted-foreground">
                  Evaluating subject, deliverability, tone, and claims…
                </p>
              </div>
            ) : aiReviewResult ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-4">
                  <div>
                    <h4 className="text-lg font-bold">Content Health Assessment</h4>
                    <p className="text-small text-muted-foreground">
                      Tone: {aiReviewResult.toneAssessment}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-primary">
                      {aiReviewResult.clarityScore}
                    </span>
                    <span className="text-small text-muted-foreground">/100</span>
                  </div>
                </div>

                {aiReviewResult.warnings.length > 0 && (
                  <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-50/60 p-4 dark:bg-amber-950/20">
                    <h5 className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4" />
                      Attention Flags ({aiReviewResult.warnings.length}):
                    </h5>
                    <ul className="list-inside list-disc space-y-1 text-small text-amber-900 dark:text-amber-300">
                      {aiReviewResult.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiReviewResult.suggestions.length > 0 && (
                  <div className="space-y-2 rounded-xl border border-border bg-card p-4">
                    <h5 className="flex items-center gap-1.5 font-semibold text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Improvement Recommendations:
                    </h5>
                    <ul className="list-inside list-disc space-y-1 text-small text-muted-foreground">
                      {aiReviewResult.suggestions.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                Click AI Quality Review to evaluate this draft.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t border-border bg-card px-6 py-4">
          <div className="flex w-full items-center justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>

            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={handleConfirmAndSend}
                disabled={isSubmitting || !subject.trim() || !body.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Launching Campaign…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {scheduleDate ? "Schedule Campaign" : `Launch Campaign (${leads.length})`}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
