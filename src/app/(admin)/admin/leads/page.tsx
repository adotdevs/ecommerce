"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ds/button";
import { Input } from "@/components/ds/input";
import { Label } from "@/components/ds/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds/card";
import { Badge } from "@/components/ds/badge";
import { Skeleton } from "@/components/ds/skeleton";
import { toast, toastError } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  UserX,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { EmailComposer, type SelectedLeadContext } from "@/components/admin/email/EmailComposer";
import { LeadEmailHistoryModal } from "@/components/admin/email/LeadEmailHistoryModal";
import { LeadFormModal } from "@/components/admin/leads/LeadFormModal";
import { UnsubscribedSection } from "@/components/admin/leads/UnsubscribedSection";
import {
  LEAD_TARGET_FIELDS,
  type LeadTargetField,
} from "@/lib/leads/fields";
import {
  formatBytes,
  MAX_LEADS_UPLOAD_BYTES,
} from "@/lib/leads/limits";
import {
  detectSourceFields,
  guessFieldMapping,
  parseLeadFile,
  type RawLeadRow,
} from "@/lib/leads/parse";
import { previewMappedLeads } from "@/lib/leads/map";
import {
  PHONE_COUNTRY_OPTIONS,
  phoneLengthOptionsForIso,
  getPhoneCountryByIso,
} from "@/lib/leads/phone-countries";
import { normalizeCountryName } from "@/lib/leads/countries";
import { cn } from "@/components/ds/utils";

interface LeadRow {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneCountry?: string;
  phoneDialCode?: string;
  phoneLength?: number;
  country?: string;
  brand?: string;
  address?: string;
  status?: string;
  agent?: string;
  notes?: string;
  tags?: string[];
  source?: string;
  createdAt?: string;
  emailSentCount?: number;
  lastEmailSentAt?: string;
  lastEmailStatus?: string;
  isSuppressed?: boolean;
  suppressionReason?: string;
  cooldownUntil?: string;
}

type MappingState = Record<string, LeadTargetField | "">;

const EMPTY_FILTERS = {
  country: "",
  phonePrefix: "",
  phoneCountry: "",
  phoneLength: "",
  requireValidPhoneLength: false,
  status: "",
  brand: "",
  requireEmail: false,
  requirePhone: false,
};

const CHUNK_SIZE = 2000;

function ProgressPanel({
  progress,
}: {
  progress: {
    label: string;
    percent: number;
    processed: number;
    total: number;
    left: number;
    detail?: string;
  };
}) {
  return (
    <div className="space-y-2 rounded-[var(--radius-sm)] border border-border bg-secondary/30 p-4">
      <div className="flex items-center justify-between gap-3 text-small">
        <span className="font-medium text-foreground">{progress.label}</span>
        <span className="tabular-nums text-muted-foreground">
          {progress.percent}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground">
        <span className="tabular-nums">
          {progress.processed.toLocaleString()} done ·{" "}
          {progress.left.toLocaleString()} left ·{" "}
          {progress.total.toLocaleString()} total
        </span>
        {progress.detail ? <span>{progress.detail}</span> : null}
      </div>
    </div>
  );
}

function initials(first?: string, last?: string, email?: string) {
  const a = (first?.[0] || email?.[0] || "?").toUpperCase();
  const b = (last?.[0] || "").toUpperCase();
  return `${a}${b}`;
}

function AdminLeadsPageContent() {
  const { accessToken } = useAuthStore();
  const searchParams = useSearchParams();
  const paramTab = searchParams.get("tab") as "import" | "directory" | "unsubscribed" | null;
  const [tab, setTab] = useState<"import" | "directory" | "unsubscribed">(
    paramTab && ["import", "directory", "unsubscribed"].includes(paramTab) ? paramTab : "import"
  );
  const [unsubscribedCount, setUnsubscribedCount] = useState<number>(0);

  const [fileName, setFileName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [parsedRows, setParsedRows] = useState<RawLeadRow[]>([]);
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [mapping, setMapping] = useState<MappingState>({});
  const [suggestedMapping, setSuggestedMapping] = useState<MappingState>({});
  const [sample, setSample] = useState<Record<string, unknown>[]>([]);
  const [importFilters, setImportFilters] = useState(EMPTY_FILTERS);
  const [fileBlob, setFileBlob] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [previewCounts, setPreviewCounts] = useState<{
    totalRows: number;
    invalid: number;
    filtered: number;
    eligibleEstimate: number;
  } | null>(null);
  const [lastImport, setLastImport] = useState<Record<string, unknown> | null>(
    null
  );
  const [progress, setProgress] = useState<{
    label: string;
    percent: number;
    processed: number;
    total: number;
    left: number;
    detail?: string;
  } | null>(null);

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [dirCountry, setDirCountry] = useState("");
  const [dirCountrySearch, setDirCountrySearch] = useState("");
  const [dirPhoneCountry, setDirPhoneCountry] = useState("");
  const [dirPhoneLength, setDirPhoneLength] = useState("");
  const [dirStatus, setDirStatus] = useState("");
  const [dirBrand, setDirBrand] = useState("");
  const [dirEmailStatus, setDirEmailStatus] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerLeads, setComposerLeads] = useState<SelectedLeadContext[]>([]);
  const [historyModalLead, setHistoryModalLead] = useState<LeadRow | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadRow | null>(null);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [facets, setFacets] = useState<{
    countries: { value: string; count: number; aliases?: string[] }[];
    phoneCountries: {
      value: string;
      count: number;
      label: string;
      dialCode: string;
      minLength?: number;
      maxLength?: number;
    }[];
    phoneLengths: { value: number; count: number }[];
    statuses: { value: string; count: number }[];
    brands: { value: string; count: number }[];
    total: number;
  } | null>(null);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }),
    [accessToken]
  );

  const filteredCountryOptions = useMemo(() => {
    const list = facets?.countries ?? [];
    const q = dirCountrySearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.value.toLowerCase().includes(q));
  }, [facets, dirCountrySearch]);

  const importPhoneLengths = useMemo(() => {
    if (!importFilters.phoneCountry) return [];
    return phoneLengthOptionsForIso(importFilters.phoneCountry);
  }, [importFilters.phoneCountry]);

  const loadFacets = useCallback(async () => {
    if (!accessToken) return;
    const res = await fetch("/api/v1/admin/leads/facets", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (data.success) setFacets(data.data);
  }, [accessToken]);

  const loadLeads = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "24",
      });
      if (query) params.set("q", query);
      if (dirCountry.trim()) params.set("country", dirCountry.trim());
      else if (dirCountrySearch.trim()) {
        params.set("countrySearch", dirCountrySearch.trim());
      }
      if (dirPhoneCountry.trim()) params.set("phoneCountry", dirPhoneCountry.trim());
      if (dirPhoneLength.trim()) params.set("phoneLength", dirPhoneLength.trim());
      if (dirStatus.trim()) params.set("status", dirStatus.trim());
      if (dirBrand.trim()) params.set("brand", dirBrand.trim());
      if (dirEmailStatus.trim()) params.set("emailStatus", dirEmailStatus.trim());

      const res = await fetch(`/api/v1/admin/leads?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!data.success) {
        toastError("Failed to load leads", data.error);
        return;
      }
      setLeads(data.data.items ?? []);
      setPages(data.data.pages ?? 1);
      setTotal(data.data.total ?? 0);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    page,
    query,
    dirCountry,
    dirCountrySearch,
    dirPhoneCountry,
    dirPhoneLength,
    dirStatus,
    dirBrand,
    dirEmailStatus,
  ]);

  const handleSendEmail = (lead: LeadRow) => {
    setComposerLeads([
      {
        _id: lead._id,
        email: lead.email,
        firstName: lead.firstName,
        lastName: lead.lastName,
        country: lead.country,
        phoneCountry: lead.phoneCountry,
        phone: lead.phone,
        emailSentCount: lead.emailSentCount,
        lastEmailSentAt: lead.lastEmailSentAt,
        isSuppressed: lead.isSuppressed,
        cooldownUntil: lead.cooldownUntil,
        brand: lead.brand,
      },
    ]);
    setIsComposerOpen(true);
  };

  const handleEmailSelected = () => {
    const chosen = leads
      .filter((l) => selected.has(l._id))
      .map((lead) => ({
        _id: lead._id,
        email: lead.email,
        firstName: lead.firstName,
        lastName: lead.lastName,
        country: lead.country,
        phoneCountry: lead.phoneCountry,
        phone: lead.phone,
        emailSentCount: lead.emailSentCount,
        lastEmailSentAt: lead.lastEmailSentAt,
        isSuppressed: lead.isSuppressed,
        cooldownUntil: lead.cooldownUntil,
        brand: lead.brand,
      }));
    if (!chosen.length) {
      toastError("No leads selected", "Please select at least one lead.");
      return;
    }
    setComposerLeads(chosen);
    setIsComposerOpen(true);
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
              ? "Daily limit reached. Resets tomorrow at midnight."
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

  const handleToggleBlock = async (lead: LeadRow) => {
    const willBlock = !lead.isSuppressed;
    const res = await fetch(`/api/v1/admin/email/leads/${lead._id}/block`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        block: willBlock,
        blocked: willBlock,
        reason: willBlock ? "MANUAL_BLOCK" : undefined,
      }),
    });
    const data = await res.json();
    if (data.success) {
      toast({
        variant: "success",
        title: willBlock ? "Lead blocked from emails" : "Lead unblocked",
      });
      loadLeads();
      loadFacets();
      // Also refresh suppressions count
      fetch("/api/v1/admin/email/suppressions?limit=1", {
        headers: authHeaders,
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data?.stats) {
            setUnsubscribedCount(d.data.stats.total || 0);
          }
        })
        .catch(() => {});
    } else {
      toastError("Failed to update status", data.error);
    }
  };

  const handleDeleteSingleLead = async (lead: LeadRow) => {
    const leadName =
      [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
      lead.email ||
      lead.phone ||
      "this lead";
    if (!confirm(`Are you sure you want to permanently delete ${leadName}?`)) return;

    try {
      const res = await fetch(`/api/v1/admin/leads/${lead._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.success) {
        toast({
          variant: "success",
          title: "Lead deleted",
          description: `Successfully deleted ${leadName}`,
        });
        loadLeads();
        loadFacets();
      } else {
        toastError("Delete failed", data.error || "Failed to delete lead");
      }
    } catch (err) {
      toastError("Delete failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  useEffect(() => {
    if (tab === "directory" && accessToken) {
      loadLeads();
      loadFacets();
    }
  }, [tab, accessToken, loadLeads, loadFacets]);

  const filtersPayload = () => ({
    country: importFilters.country || undefined,
    phonePrefix: importFilters.phonePrefix || undefined,
    phoneCountry: importFilters.phoneCountry || undefined,
    phoneLength: importFilters.phoneLength
      ? Number(importFilters.phoneLength)
      : undefined,
    requireValidPhoneLength: importFilters.requireValidPhoneLength || undefined,
    status: importFilters.status || undefined,
    brand: importFilters.brand || undefined,
    requireEmail: importFilters.requireEmail || undefined,
    requirePhone: importFilters.requirePhone || undefined,
  });

  const onFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_LEADS_UPLOAD_BYTES) {
      toastError(
        "File too large",
        `Max size is ${formatBytes(MAX_LEADS_UPLOAD_BYTES)} (file is ${formatBytes(file.size)})`
      );
      return;
    }

    setAnalyzing(true);
    setLastImport(null);
    setPreview([]);
    setPreviewCounts(null);
    setProgress({
      label: "Reading file",
      percent: 5,
      processed: 0,
      total: file.size,
      left: file.size,
      detail: formatBytes(file.size),
    });

    try {
      setFileBlob(file);
      setFileName(file.name);

      const text = await file.text();
      setProgress({
        label: "Parsing leads",
        percent: 55,
        processed: Math.round(file.size * 0.55),
        total: file.size,
        left: Math.round(file.size * 0.45),
        detail: formatBytes(file.size),
      });

      const rows = parseLeadFile(text, file.name);
      const fields = detectSourceFields(rows);
      const suggested = guessFieldMapping(fields);
      const next: MappingState = {};
      for (const field of fields) {
        next[field] = (suggested[field] as LeadTargetField) || "";
      }

      setParsedRows(rows);
      setRowCount(rows.length);
      setSourceFields(fields);
      setSample(rows.slice(0, 5) as Record<string, unknown>[]);
      setSuggestedMapping(next);
      setMapping(next);
      setProgress({
        label: "Ready to map",
        percent: 100,
        processed: rows.length,
        total: rows.length,
        left: 0,
        detail: `${rows.length.toLocaleString()} rows detected`,
      });
      toast({
        variant: "success",
        title: `Detected ${rows.length.toLocaleString()} rows`,
      });
    } catch (err) {
      toastError(
        "Analyze failed",
        err instanceof Error ? err.message : "Could not parse file"
      );
      setParsedRows([]);
      setSourceFields([]);
    } finally {
      setAnalyzing(false);
      setTimeout(() => setProgress(null), 1000);
    }
  };

  const runPreview = () => {
    if (!parsedRows.length) return;
    setAnalyzing(true);
    setProgress({
      label: "Building preview",
      percent: 30,
      processed: 0,
      total: parsedRows.length,
      left: parsedRows.length,
    });
    try {
      const result = previewMappedLeads(
        parsedRows,
        mapping,
        filtersPayload(),
        20
      );
      setPreview(result.preview as unknown as Record<string, unknown>[]);
      setPreviewCounts(result.counts);
      setProgress({
        label: "Preview ready",
        percent: 100,
        processed: result.counts.eligibleEstimate,
        total: result.counts.totalRows,
        left: 0,
      });
    } finally {
      setAnalyzing(false);
      setTimeout(() => setProgress(null), 800);
    }
  };

  const runImport = async () => {
    if (!parsedRows.length || !accessToken) return;
    if (!confirm(`Import ${parsedRows.length.toLocaleString()} leads from ${fileName}? Duplicates will be skipped.`)) {
      return;
    }

    setImporting(true);
    setLastImport(null);

    const totalRows = parsedRows.length;
    const chunks: RawLeadRow[][] = [];
    for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
      chunks.push(parsedRows.slice(i, i + CHUNK_SIZE));
    }

    const importBatchId = `imp_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const totals = {
      totalRows,
      mapped: 0,
      inserted: 0,
      skippedDuplicates: 0,
      skippedFiltered: 0,
      skippedInvalid: 0,
      errors: [] as string[],
      importBatchId,
    };

    setProgress({
      label: "Importing leads",
      percent: 0,
      processed: 0,
      total: totalRows,
      left: totalRows,
      detail: `0 / ${chunks.length} chunks`,
    });

    try {
      let processedRows = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setProgress({
          label: `Importing chunk ${i + 1} of ${chunks.length}`,
          percent: Math.round((processedRows / totalRows) * 100),
          processed: processedRows,
          total: totalRows,
          left: totalRows - processedRows,
          detail: `${chunk.length.toLocaleString()} rows in this chunk`,
        });

        const res = await fetch("/api/v1/admin/leads/import", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            mode: "import-chunk",
            rows: chunk,
            mapping,
            filters: filtersPayload(),
            source: fileName,
            importBatchId,
            chunkIndex: i,
            chunkTotal: chunks.length,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          toastError("Import failed", data.error || `Chunk ${i + 1} failed`);
          return;
        }

        totals.mapped += data.data.mapped ?? 0;
        totals.inserted += data.data.inserted ?? 0;
        totals.skippedDuplicates += data.data.skippedDuplicates ?? 0;
        totals.skippedFiltered += data.data.skippedFiltered ?? 0;
        totals.skippedInvalid += data.data.skippedInvalid ?? 0;
        if (Array.isArray(data.data.errors)) {
          totals.errors.push(...data.data.errors);
        }

        processedRows += chunk.length;
        setProgress({
          label: `Imported chunk ${i + 1} of ${chunks.length}`,
          percent: Math.round((processedRows / totalRows) * 100),
          processed: processedRows,
          total: totalRows,
          left: Math.max(totalRows - processedRows, 0),
          detail: `Inserted ${totals.inserted.toLocaleString()} · skipped ${totals.skippedDuplicates.toLocaleString()} dupes`,
        });
      }

      setProgress({
        label: "Import complete",
        percent: 100,
        processed: totalRows,
        total: totalRows,
        left: 0,
        detail: `Inserted ${totals.inserted.toLocaleString()}`,
      });
      setLastImport(totals);
      toast({
        variant: "success",
        title: `Inserted ${totals.inserted.toLocaleString()} leads`,
        description: `${totals.skippedDuplicates.toLocaleString()} duplicates skipped across ${chunks.length} chunks`,
      });
    } catch (err) {
      toastError(
        "Import failed",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setImporting(false);
    }
  };

  const restoreGuesses = () => setMapping({ ...suggestedMapping });
  const clearMapping = () => {
    const next: MappingState = {};
    for (const field of sourceFields) next[field] = "";
    setMapping(next);
  };

  const deleteSelected = async () => {
    if (!selected.size || !accessToken) return;
    if (!confirm(`Delete ${selected.size} lead(s)?`)) return;
    const res = await fetch("/api/v1/admin/leads", {
      method: "DELETE",
      headers: authHeaders,
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    const data = await res.json();
    if (data.success) {
      toast({ variant: "success", title: `Deleted ${data.data.deleted}` });
      loadLeads();
      loadFacets();
    } else {
      toastError("Delete failed", data.error);
    }
  };

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="mt-1 text-muted-foreground">
          Import CRM leads and filter by country or phone country code for
          campaigns.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={tab === "import" ? "primary" : "outline"}
          onClick={() => setTab("import")}
        >
          Import
        </Button>
        <Button
          variant={tab === "directory" ? "primary" : "outline"}
          onClick={() => setTab("directory")}
        >
          Directory
        </Button>
        <Button
          variant={tab === "unsubscribed" ? "primary" : "outline"}
          onClick={() => setTab("unsubscribed")}
          className="gap-1.5"
        >
          <UserX className="h-4 w-4" />
          Unsubscribed
          {unsubscribedCount > 0 && (
            <span className={cn(
              "ml-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold",
              tab === "unsubscribed"
                ? "bg-white/20 text-white"
                : "bg-destructive/15 text-destructive"
            )}>
              {unsubscribedCount}
            </span>
          )}
        </Button>
      </div>

      {tab === "import" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload file</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Label
                htmlFor="leads-file"
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-border px-6 py-10 text-center hover:bg-secondary/40",
                  (analyzing || importing) && "pointer-events-none opacity-60"
                )}
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-small font-medium">
                  {analyzing
                    ? "Parsing…"
                    : fileName
                      ? fileName
                      : "Drop JSON or CSV, or click to browse"}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  Mongo export JSON supported. Max{" "}
                  {formatBytes(MAX_LEADS_UPLOAD_BYTES)}.
                </span>
                <input
                  id="leads-file"
                  type="file"
                  accept=".json,.csv,application/json,text/csv"
                  className="hidden"
                  disabled={analyzing || importing}
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
              </Label>
              {progress && !importing && <ProgressPanel progress={progress} />}
              {rowCount > 0 && (
                <p className="text-small text-muted-foreground">
                  {rowCount.toLocaleString()} rows · {sourceFields.length}{" "}
                  fields · {mappedCount} mapped
                  {fileBlob ? ` · ${formatBytes(fileBlob.size)}` : ""}
                </p>
              )}
            </CardContent>
          </Card>

          {sourceFields.length > 0 && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <CardTitle>Field mapping</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={restoreGuesses}
                    >
                      Restore guesses
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearMapping}
                    >
                      Unselect all
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-small text-muted-foreground">
                    Map or skip columns. Each row needs an email or phone.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {sourceFields.map((field) => (
                      <div key={field} className="space-y-1">
                        <Label className="text-[12px] text-muted-foreground">
                          {field}
                          {sample[0]?.[field] != null && (
                            <span className="ml-2 font-normal opacity-70">
                              e.g. {String(sample[0][field]).slice(0, 40)}
                            </span>
                          )}
                        </Label>
                        <select
                          className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 text-small"
                          value={mapping[field] ?? ""}
                          onChange={(e) =>
                            setMapping((prev) => ({
                              ...prev,
                              [field]: e.target.value as LeadTargetField | "",
                            }))
                          }
                        >
                          <option value="">Skip</option>
                          {LEAD_TARGET_FIELDS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Import filters (optional)</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Country (lead field)</Label>
                    <Input
                      value={importFilters.country}
                      onChange={(e) =>
                        setImportFilters({
                          ...importFilters,
                          country: e.target.value,
                        })
                      }
                      placeholder="Exact country value"
                    />
                  </div>
                  <div>
                    <Label>Phone country</Label>
                    <select
                      className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 text-small"
                      value={importFilters.phoneCountry}
                      onChange={(e) =>
                        setImportFilters({
                          ...importFilters,
                          phoneCountry: e.target.value,
                          phonePrefix: e.target.value
                            ? getPhoneCountryByIso(e.target.value)?.dialCode ||
                              ""
                            : "",
                          phoneLength: "",
                        })
                      }
                    >
                      <option value="">Any phone country</option>
                      {PHONE_COUNTRY_OPTIONS.map((c) => (
                        <option key={c.iso} value={c.iso}>
                          {c.dialCode} · {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Phone length</Label>
                    <select
                      className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 text-small"
                      value={importFilters.phoneLength}
                      onChange={(e) =>
                        setImportFilters({
                          ...importFilters,
                          phoneLength: e.target.value,
                        })
                      }
                      disabled={!importPhoneLengths.length}
                    >
                      <option value="">Any length</option>
                      {importPhoneLengths.map((n) => (
                        <option key={n} value={String(n)}>
                          {n} digits
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Input
                      value={importFilters.status}
                      onChange={(e) =>
                        setImportFilters({
                          ...importFilters,
                          status: e.target.value,
                        })
                      }
                      placeholder="e.g. New"
                    />
                  </div>
                  <div>
                    <Label>Brand</Label>
                    <Input
                      value={importFilters.brand}
                      onChange={(e) =>
                        setImportFilters({
                          ...importFilters,
                          brand: e.target.value,
                        })
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 text-small sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={importFilters.requireValidPhoneLength}
                      onChange={(e) =>
                        setImportFilters({
                          ...importFilters,
                          requireValidPhoneLength: e.target.checked,
                        })
                      }
                    />
                    Only phones with valid length for selected phone country
                  </label>
                  <label className="flex items-center gap-2 text-small">
                    <input
                      type="checkbox"
                      checked={importFilters.requireEmail}
                      onChange={(e) =>
                        setImportFilters({
                          ...importFilters,
                          requireEmail: e.target.checked,
                        })
                      }
                    />
                    Require email
                  </label>
                  <label className="flex items-center gap-2 text-small">
                    <input
                      type="checkbox"
                      checked={importFilters.requirePhone}
                      onChange={(e) =>
                        setImportFilters({
                          ...importFilters,
                          requirePhone: e.target.checked,
                        })
                      }
                    />
                    Require phone
                  </label>
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={runPreview}
                  disabled={analyzing || importing}
                >
                  {analyzing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Preview
                </Button>
                <Button
                  type="button"
                  onClick={runImport}
                  disabled={analyzing || importing || mappedCount === 0}
                >
                  {importing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Import leads
                </Button>
              </div>

              {importing && progress && <ProgressPanel progress={progress} />}
              {!importing && lastImport && progress?.percent === 100 && (
                <ProgressPanel progress={progress} />
              )}

              {previewCounts && (
                <Card>
                  <CardHeader>
                    <CardTitle>Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        rows {previewCounts.totalRows}
                      </Badge>
                      <Badge variant="secondary">
                        eligible ~{previewCounts.eligibleEstimate}
                      </Badge>
                      <Badge variant="secondary">
                        invalid {previewCounts.invalid}
                      </Badge>
                      <Badge variant="secondary">
                        filtered {previewCounts.filtered}
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {preview.map((row, idx) => (
                        <div
                          key={idx}
                          className="rounded-[var(--radius-sm)] border border-border bg-card p-3"
                        >
                          <p className="font-medium">
                            {[row.firstName, row.lastName]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </p>
                          <p className="mt-1 text-[12px] text-muted-foreground">
                            {String(row.email ?? "no email")} ·{" "}
                            {String(row.phone ?? "no phone")}
                          </p>
                          <p className="text-[12px] text-muted-foreground">
                            {String(row.phoneCountry ?? "—")}{" "}
                            {row.phoneLength
                              ? `· ${String(row.phoneLength)} digits`
                              : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {lastImport && (
                <Card>
                  <CardHeader>
                    <CardTitle>Last import result</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 text-small">
                    <Badge>inserted {String(lastImport.inserted)}</Badge>
                    <Badge variant="secondary">
                      duplicates {String(lastImport.skippedDuplicates)}
                    </Badge>
                    <Badge variant="secondary">
                      filtered {String(lastImport.skippedFiltered)}
                    </Badge>
                    <Badge variant="secondary">
                      invalid {String(lastImport.skippedInvalid)}
                    </Badge>
                    <span className="text-muted-foreground">
                      batch {String(lastImport.importBatchId)}
                    </span>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {tab === "directory" && (
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="border-b border-border bg-gradient-to-br from-secondary/80 to-background px-6 py-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] uppercase tracking-wide text-muted-foreground">
                    Lead directory
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {total.toLocaleString()}
                    <span className="ml-2 text-small font-normal text-muted-foreground">
                      matching
                      {facets ? ` · ${facets.total.toLocaleString()} total` : ""}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setEditingLead(null);
                      setLeadModalOpen(true);
                    }}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Lead
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={loadingEligible}
                    onClick={handlePrepareToday}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm hover:from-purple-700 hover:to-indigo-700"
                  >
                    {loadingEligible ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    ✨ Prepare Today&apos;s 10
                  </Button>
                  {selected.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEmailSelected}
                    >
                      <Mail className="mr-1.5 h-3.5 w-3.5" />
                      Email Selected ({selected.size})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!selected.size}
                    onClick={deleteSelected}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete ({selected.size})
                  </Button>
                </div>
              </div>
            </div>
            <CardContent className="grid gap-4 pt-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="md:col-span-2 lg:col-span-3">
                <Label>Search</Label>
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
                    placeholder="Name, email, phone, dial code…"
                  />
                  <Button type="submit" variant="outline">
                    Search
                  </Button>
                </form>
              </div>

              <div>
                <Label>Country search</Label>
                <Input
                  value={dirCountrySearch}
                  onChange={(e) => {
                    setPage(1);
                    setDirCountry("");
                    setDirCountrySearch(e.target.value);
                  }}
                  placeholder="Type to filter countries…"
                />
              </div>
              <div>
                <Label>Country</Label>
                <select
                  className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 text-small"
                  value={dirCountry}
                  onChange={(e) => {
                    setPage(1);
                    setDirCountry(e.target.value);
                    if (e.target.value) setDirCountrySearch("");
                  }}
                >
                  <option value="">All countries</option>
                  {filteredCountryOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      ({c.count.toLocaleString()}) {c.value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Phone country code</Label>
                <select
                  className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 text-small"
                  value={dirPhoneCountry}
                  onChange={(e) => {
                    setPage(1);
                    setDirPhoneCountry(e.target.value);
                    setDirPhoneLength("");
                  }}
                >
                  <option value="">Any phone country</option>
                  {(facets?.phoneCountries ?? [])
                    .filter((c) => c.count > 0)
                    .map((c) => (
                      <option key={c.value} value={c.value}>
                        ({c.count.toLocaleString()}) {c.dialCode} · {c.label}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Count = leads whose number starts with that dial code (e.g.
                  +44).
                </p>
              </div>
              <div>
                <Label>Phone length (digit count)</Label>
                <select
                  className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 text-small"
                  value={dirPhoneLength}
                  onChange={(e) => {
                    setPage(1);
                    setDirPhoneLength(e.target.value);
                  }}
                >
                  <option value="">Any length</option>
                  {(facets?.phoneLengths ?? [])
                    .filter((x) => x.count > 0)
                    .map((x) => (
                      <option key={x.value} value={String(x.value)}>
                        ({x.count.toLocaleString()}) {x.value} digits
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  How many digits are in the phone number (country code
                  included). Example: +447021265786 = 12 digits.
                </p>
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 text-small"
                  value={dirStatus}
                  onChange={(e) => {
                    setPage(1);
                    setDirStatus(e.target.value);
                  }}
                >
                  <option value="">All statuses</option>
                  {(facets?.statuses ?? []).map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.value} ({s.count})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Brand</Label>
                <select
                  className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 text-small"
                  value={dirBrand}
                  onChange={(e) => {
                    setPage(1);
                    setDirBrand(e.target.value);
                  }}
                >
                  <option value="">All brands</option>
                  {(facets?.brands ?? []).map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.value} ({b.count})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Marketing status</Label>
                <select
                  className="flex h-10 w-full rounded-[var(--radius-sm)] border border-border bg-background px-3 text-small"
                  value={dirEmailStatus}
                  onChange={(e) => {
                    setPage(1);
                    setDirEmailStatus(e.target.value);
                  }}
                >
                  <option value="">All outreach statuses</option>
                  <option value="eligible_now">⚡ Eligible Today (Email present, cooldown clear)</option>
                  <option value="never_sent">— Never Sent</option>
                  <option value="sent_1_plus">✓ Sent 1+ times</option>
                  <option value="sent_2_plus">✓ Sent 2+ times</option>
                  <option value="cooldown">⏳ In Cooldown (&lt; 14 days)</option>
                  <option value="failed">⚠️ Delivery Failed</option>
                  <option value="suppressed">🚫 Suppressed / Unsubscribed</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-[var(--radius-sm)]" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No leads match these filters. Import a file or clear filters.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {leads.map((lead) => {
                const name =
                  [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
                  "Unnamed lead";
                const phoneMeta = lead.phoneCountry
                  ? getPhoneCountryByIso(lead.phoneCountry)
                  : undefined;
                const checked = selected.has(lead._id);
                return (
                  <div
                    key={lead._id}
                    className={cn(
                      "group relative rounded-[var(--radius-sm)] border border-border bg-card p-4 shadow-[var(--shadow-subtle)] transition-colors",
                      checked && "border-primary/40 bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={(e) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(lead._id);
                            else next.delete(lead._id);
                            return next;
                          });
                        }}
                      />
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-small font-semibold text-foreground">
                        {initials(lead.firstName, lead.lastName, lead.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-medium text-foreground">
                            {name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {lead.status ? (
                              <Badge variant="secondary">{lead.status}</Badge>
                            ) : null}
                            {lead.isSuppressed ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
                                🚫 Blocked
                              </span>
                            ) : lead.cooldownUntil && new Date(lead.cooldownUntil) > new Date() ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                ⏳ Cooldown ({Math.ceil((new Date(lead.cooldownUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d)
                              </span>
                            ) : lead.lastEmailStatus === "FAILED" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
                                ⚠️ Failed
                              </span>
                            ) : (lead.emailSentCount ?? 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                ✓ {lead.emailSentCount} sent
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                — Never Sent
                              </span>
                            )}
                          </div>
                        </div>
                        {lead.email ? (
                          <p className="mt-2 flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            {lead.email}
                          </p>
                        ) : null}
                        {lead.phone ? (
                          <p className="mt-1 flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {lead.phone}
                            {lead.phoneLength
                              ? ` · ${lead.phoneLength}d`
                              : ""}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {lead.country ? (
                            <Badge variant="outline">
                              <MapPin className="mr-1 h-3 w-3" />
                              {normalizeCountryName(lead.country) || lead.country}
                            </Badge>
                          ) : null}
                          {lead.phoneDialCode || phoneMeta ? (
                            <Badge variant="outline">
                              {phoneMeta?.name ?? lead.phoneCountry}{" "}
                              {lead.phoneDialCode || phoneMeta?.dialCode}
                            </Badge>
                          ) : null}
                          {lead.brand ? (
                            <Badge variant="outline">{lead.brand}</Badge>
                          ) : null}
                        </div>

                        {/* Action buttons on lead card */}
                        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className={cn(
                                "h-7 px-2 text-[12px]",
                                lead.isSuppressed && "border-amber-300 text-amber-800 bg-amber-50/50 hover:bg-amber-100"
                              )}
                              disabled={!lead.email}
                              onClick={async () => {
                                if (lead.isSuppressed) {
                                  // Unblock first, then open composer immediately
                                  await handleToggleBlock(lead);
                                  handleSendEmail({ ...lead, isSuppressed: false });
                                } else {
                                  handleSendEmail(lead);
                                }
                              }}
                            >
                              <Mail className="mr-1 h-3 w-3" />
                              {lead.isSuppressed
                                ? "Unblock & Send"
                                : (lead.emailSentCount ?? 0) > 0
                                ? "Send Again"
                                : "Send Email"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="Edit Lead"
                              onClick={() => {
                                setEditingLead(lead);
                                setLeadModalOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="View Email History"
                              onClick={() => setHistoryModalLead(lead)}
                            >
                              <Clock className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className={cn(
                                "h-7 px-2 text-[11px]",
                                lead.isSuppressed
                                  ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  : "text-muted-foreground hover:text-destructive"
                              )}
                              onClick={() => handleToggleBlock(lead)}
                              title={lead.isSuppressed ? "Remove unsubscribe / unblock lead" : "Block lead from emails"}
                            >
                              {lead.isSuppressed ? "Unblock" : "Block"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              title="Delete Lead"
                              onClick={() => handleDeleteSingleLead(lead)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-small text-muted-foreground">
              <input
                type="checkbox"
                checked={leads.length > 0 && selected.size === leads.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelected(new Set(leads.map((l) => l._id)));
                  } else {
                    setSelected(new Set());
                  }
                }}
              />
              Select page
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-small text-muted-foreground">
                Page {page} / {pages}
              </span>
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
        </div>
      )}

      {/* Unsubscribed & Suppressed Section */}
      {tab === "unsubscribed" && (
        <UnsubscribedSection
          onSendEmail={(leadContext) => {
            setComposerLeads([leadContext]);
            setIsComposerOpen(true);
          }}
          onStatsChange={(stats) => {
            setUnsubscribedCount(stats.total);
          }}
        />
      )}

      {/* Email Composer Modal */}
      <EmailComposer
        open={isComposerOpen}
        onOpenChange={setIsComposerOpen}
        leads={composerLeads}
        onSuccess={() => {
          loadLeads();
          loadFacets();
        }}
      />

      {/* Lead History Modal */}
      <LeadEmailHistoryModal
        open={!!historyModalLead}
        onOpenChange={(open) => {
          if (!open) setHistoryModalLead(null);
        }}
        leadId={historyModalLead?._id ?? null}
        leadName={[historyModalLead?.firstName, historyModalLead?.lastName].filter(Boolean).join(" ") || "Lead"}
        leadEmail={historyModalLead?.email}
        onSendAgain={(l) => {
          setHistoryModalLead(null);
          setComposerLeads([
            {
              _id: l._id,
              email: l.email,
              firstName: l.firstName,
            },
          ]);
          setIsComposerOpen(true);
        }}
      />

      {/* Manual Add / Edit Lead Modal */}
      <LeadFormModal
        open={leadModalOpen}
        onOpenChange={setLeadModalOpen}
        lead={editingLead}
        onSuccess={() => {
          loadLeads();
          loadFacets();
        }}
      />
    </div>
  );
}

export default function AdminLeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-6">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="h-40 w-full rounded bg-muted animate-pulse" />
        </div>
      }
    >
      <AdminLeadsPageContent />
    </Suspense>
  );
}
