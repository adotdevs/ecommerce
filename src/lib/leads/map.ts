import {
  enrichPhoneFields,
  normalizeEmail,
  normalizePhone,
  normalizeString,
  normalizeTags,
} from "@/lib/leads/normalize";
import type { RawLeadRow } from "@/lib/leads/parse";
import {
  LEAD_TARGET_FIELDS,
  type LeadTargetField,
} from "@/lib/leads/fields";
import { getPhoneCountryByIso } from "@/lib/leads/phone-countries";
import { normalizeCountryName } from "@/lib/leads/countries";

export type FieldMapping = Record<string, LeadTargetField | null | "">;

export interface ImportFilters {
  country?: string;
  phonePrefix?: string;
  phoneCountry?: string;
  phoneLength?: number;
  requireValidPhoneLength?: boolean;
  status?: string;
  brand?: string;
  requireEmail?: boolean;
  requirePhone?: boolean;
}

export interface MappedLead {
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
  meta?: Record<string, unknown>;
}

const TARGET_SET = new Set<string>(LEAD_TARGET_FIELDS);

export function applyMapping(
  row: RawLeadRow,
  mapping: FieldMapping
): MappedLead | null {
  const lead: MappedLead = {};
  const meta: Record<string, unknown> = {};

  for (const [sourceKey, target] of Object.entries(mapping)) {
    if (!(sourceKey in row)) continue;
    const raw = row[sourceKey];

    if (!target || !TARGET_SET.has(target)) {
      if (
        raw != null &&
        raw !== "" &&
        (typeof raw === "string" ||
          typeof raw === "number" ||
          typeof raw === "boolean")
      ) {
        meta[sourceKey] = raw;
      }
      continue;
    }

    switch (target as LeadTargetField) {
      case "email":
        lead.email = normalizeEmail(raw);
        break;
      case "phone": {
        const normalized = normalizePhone(raw);
        if (normalized) {
          const enriched = enrichPhoneFields(normalized);
          lead.phone = enriched.phone;
          lead.phoneCountry = enriched.phoneCountry;
          lead.phoneDialCode = enriched.phoneDialCode;
          lead.phoneLength = enriched.phoneLength;
        }
        break;
      }
      case "tags":
        lead.tags = normalizeTags(raw);
        break;
      case "country": {
        const country = normalizeCountryName(raw);
        if (country) lead.country = country;
        break;
      }
      case "firstName":
      case "lastName":
      case "brand":
      case "address":
      case "status":
      case "agent":
      case "notes":
      case "source":
        lead[
          target as Exclude<
            LeadTargetField,
            "email" | "phone" | "tags" | "country"
          >
        ] = normalizeString(raw);
        break;
    }
  }

  if (!lead.email && !lead.phone) return null;
  if (Object.keys(meta).length) lead.meta = meta;
  return lead;
}

export function passesFilters(
  lead: MappedLead,
  filters: ImportFilters
): boolean {
  if (filters.requireEmail && !lead.email) return false;
  if (filters.requirePhone && !lead.phone) return false;

  if (filters.country) {
    const want = normalizeCountryName(filters.country);
    const have = normalizeCountryName(lead.country ?? "");
    if (!want || have !== want) return false;
  }

  if (filters.phonePrefix) {
    const prefix = filters.phonePrefix.trim();
    if (!lead.phone || !lead.phone.startsWith(prefix)) return false;
  }

  if (filters.phoneCountry) {
    const iso = filters.phoneCountry.trim().toUpperCase();
    const cfg = getPhoneCountryByIso(iso);
    if (cfg) {
      const matchesIso = lead.phoneCountry === iso;
      const matchesDial =
        !!lead.phone &&
        (lead.phone.startsWith(cfg.dialCode) ||
          lead.phoneDialCode === cfg.dialCode);
      if (!matchesIso && !matchesDial) return false;

      if (filters.requireValidPhoneLength) {
        const len = lead.phoneLength ?? 0;
        if (len < cfg.minLength || len > cfg.maxLength) return false;
      }
    } else if (lead.phoneCountry !== iso) {
      return false;
    }
  }

  if (typeof filters.phoneLength === "number" && filters.phoneLength > 0) {
    if (lead.phoneLength !== filters.phoneLength) return false;
  }

  if (filters.status) {
    const want = filters.status.trim().toLowerCase();
    if ((lead.status ?? "").trim().toLowerCase() !== want) return false;
  }

  if (filters.brand) {
    const want = filters.brand.trim().toLowerCase();
    if ((lead.brand ?? "").trim().toLowerCase() !== want) return false;
  }

  return true;
}

export function previewMappedLeads(
  rows: RawLeadRow[],
  mapping: FieldMapping,
  filters: ImportFilters,
  limit = 20
) {
  const preview: MappedLead[] = [];
  let invalid = 0;
  let filtered = 0;

  for (const row of rows) {
    const lead = applyMapping(row, mapping);
    if (!lead) {
      invalid++;
      continue;
    }
    if (!passesFilters(lead, filters)) {
      filtered++;
      continue;
    }
    if (preview.length < limit) preview.push(lead);
  }

  return {
    preview,
    counts: {
      totalRows: rows.length,
      invalid,
      filtered,
      eligibleEstimate: rows.length - invalid - filtered,
    },
  };
}
