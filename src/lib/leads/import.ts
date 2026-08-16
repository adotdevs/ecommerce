import type { RawLeadRow } from "@/lib/leads/parse";
import { getLeadModel } from "@/models/Lead";
import type { ImportProgress } from "@/lib/leads/types";
import {
  applyMapping,
  passesFilters,
  previewMappedLeads,
  type FieldMapping,
  type ImportFilters,
  type MappedLead,
} from "@/lib/leads/map";

export type { ImportProgress } from "@/lib/leads/types";
export type { FieldMapping, ImportFilters, MappedLead } from "@/lib/leads/map";
export { previewMappedLeads, applyMapping, passesFilters } from "@/lib/leads/map";

export interface ImportResult {
  totalRows: number;
  mapped: number;
  inserted: number;
  skippedDuplicates: number;
  skippedFiltered: number;
  skippedInvalid: number;
  errors: string[];
  importBatchId: string;
}

export type ImportProgressCallback = (progress: ImportProgress) => void;

function buildProgress(
  phase: ImportProgress["phase"],
  processed: number,
  total: number,
  counts: Pick<
    ImportResult,
    "inserted" | "skippedDuplicates" | "skippedFiltered" | "skippedInvalid"
  >
): ImportProgress {
  const safeTotal = Math.max(total, 1);
  const clamped = Math.min(processed, total);
  return {
    phase,
    processed: clamped,
    total,
    left: Math.max(total - clamped, 0),
    inserted: counts.inserted,
    skippedDuplicates: counts.skippedDuplicates,
    skippedFiltered: counts.skippedFiltered,
    skippedInvalid: counts.skippedInvalid,
    percent: Math.min(100, Math.round((clamped / safeTotal) * 100)),
  };
}

export async function importLeads(
  rows: RawLeadRow[],
  mapping: FieldMapping,
  filters: ImportFilters,
  options?: {
    source?: string;
    importBatchId?: string;
    onProgress?: ImportProgressCallback;
  }
): Promise<ImportResult> {
  const Lead = await getLeadModel();
  const importBatchId =
    options?.importBatchId ??
    `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const onProgress = options?.onProgress;
  const total = rows.length;

  const result: ImportResult = {
    totalRows: total,
    mapped: 0,
    inserted: 0,
    skippedDuplicates: 0,
    skippedFiltered: 0,
    skippedInvalid: 0,
    errors: [],
    importBatchId,
  };

  const report = (phase: ImportProgress["phase"], processed: number) => {
    onProgress?.(buildProgress(phase, processed, total, result));
  };

  report("mapping", 0);

  const batch: MappedLead[] = [];
  const seenEmail = new Set<string>();
  const seenPhone = new Set<string>();
  const MAP_STEP = Math.max(50, Math.floor(total / 100) || 50);

  for (let i = 0; i < rows.length; i++) {
    const lead = applyMapping(rows[i], mapping);
    if (!lead) {
      result.skippedInvalid++;
    } else if (!passesFilters(lead, filters)) {
      result.skippedFiltered++;
    } else {
      result.mapped++;

      if (lead.email && seenEmail.has(lead.email)) {
        result.skippedDuplicates++;
      } else if (lead.phone && seenPhone.has(lead.phone)) {
        result.skippedDuplicates++;
      } else {
        if (lead.email) seenEmail.add(lead.email);
        if (lead.phone) seenPhone.add(lead.phone);
        if (options?.source && !lead.source) lead.source = options.source;
        batch.push(lead);
      }
    }

    if ((i + 1) % MAP_STEP === 0 || i + 1 === total) {
      report("mapping", i + 1);
    }
  }

  report("checking", total);

  const existingEmails = new Set<string>();
  const existingPhones = new Set<string>();
  const LOOKUP = 2000;
  for (let i = 0; i < batch.length; i += LOOKUP) {
    const slice = batch.slice(i, i + LOOKUP);
    const emails = slice.map((b) => b.email).filter(Boolean) as string[];
    const phones = slice.map((b) => b.phone).filter(Boolean) as string[];
    if (!emails.length && !phones.length) continue;

    const existing = await Lead.find({
      $or: [
        ...(emails.length ? [{ email: { $in: emails } }] : []),
        ...(phones.length ? [{ phone: { $in: phones } }] : []),
      ],
    })
      .select("email phone")
      .lean();

    for (const e of existing) {
      if (e.email) existingEmails.add(e.email);
      if (e.phone) existingPhones.add(e.phone);
    }
  }

  const toInsert = batch.filter((lead) => {
    if (lead.email && existingEmails.has(lead.email)) {
      result.skippedDuplicates++;
      return false;
    }
    if (lead.phone && existingPhones.has(lead.phone)) {
      result.skippedDuplicates++;
      return false;
    }
    return true;
  });

  const insertTotal = toInsert.length;
  const settledBeforeInsert = total - insertTotal;
  const CHUNK = 500;

  report("inserting", settledBeforeInsert);

  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const slice = toInsert.slice(i, i + CHUNK).map((lead) => ({
      ...lead,
      importBatchId,
      status: lead.status || "New",
    }));

    try {
      const inserted = await Lead.insertMany(slice, { ordered: false });
      result.inserted += inserted.length;
    } catch (err: unknown) {
      const e = err as {
        insertedDocs?: unknown[];
        writeErrors?: { index: number; code: number; errmsg?: string }[];
        result?: { nInserted?: number };
        code?: number;
        message?: string;
      };

      const nInserted =
        e.insertedDocs?.length ?? e.result?.nInserted ?? 0;
      result.inserted += nInserted;

      const writeErrors = e.writeErrors ?? [];
      for (const we of writeErrors) {
        if (we.code === 11000) {
          result.skippedDuplicates++;
        } else {
          result.errors.push(we.errmsg || "Write error");
        }
      }

      if (!writeErrors.length && e.code === 11000) {
        result.skippedDuplicates += slice.length - nInserted;
      } else if (!writeErrors.length && e.message && nInserted === 0) {
        result.errors.push(e.message);
      }
    }

    report("inserting", settledBeforeInsert + Math.min(i + CHUNK, insertTotal));
  }

  if (result.errors.length > 20) {
    result.errors = result.errors.slice(0, 20);
  }

  report("done", total);
  return result;
}
