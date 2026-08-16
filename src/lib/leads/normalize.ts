import { detectPhoneMeta } from "@/lib/leads/phone-countries";

/** Normalize email for storage + dedupe. */
export function normalizeEmail(value: unknown): string | undefined {
  if (value == null) return undefined;
  const email = String(value).trim().toLowerCase();
  if (!email || !email.includes("@")) return undefined;
  return email;
}

/** Keep leading +, strip other non-digits for phone dedupe. Prefer E.164 when possible. */
export function normalizePhone(value: unknown): string | undefined {
  if (value == null) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;

  const hasPlus = raw.startsWith("+");
  const has00 = raw.startsWith("00");
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 6) return undefined;

  if (hasPlus) return `+${digits}`;
  if (has00) return `+${digits.slice(2)}`;
  return `+${digits}`;
}

export function enrichPhoneFields(phone: string): {
  phone: string;
  phoneCountry?: string;
  phoneDialCode?: string;
  phoneLength: number;
} {
  const normalized = normalizePhone(phone) ?? phone;
  const meta = detectPhoneMeta(normalized);
  return {
    phone: normalized,
    phoneCountry: meta.phoneCountry,
    phoneDialCode: meta.phoneDialCode,
    phoneLength: meta.phoneLength,
  };
}

export function normalizeString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

export function normalizeTags(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const tags = value
      .map((v) => String(v).trim())
      .filter(Boolean);
    return tags.length ? tags : undefined;
  }
  const parts = String(value)
    .split(/[,|;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

/** Unwrap Mongo extended JSON ($oid, $date) and plain values. */
export function unwrapMongoValue(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(unwrapMongoValue);
  if (typeof value !== "object") return value;

  const obj = value as Record<string, unknown>;
  if (typeof obj.$oid === "string") return obj.$oid;
  if (typeof obj.$date === "string") return obj.$date;
  if (
    typeof obj.$date === "object" &&
    obj.$date &&
    "$numberLong" in (obj.$date as object)
  ) {
    return new Date(
      Number((obj.$date as { $numberLong: string }).$numberLong)
    ).toISOString();
  }
  if ("$numberInt" in obj) return Number(obj.$numberInt);
  if ("$numberLong" in obj) return Number(obj.$numberLong);
  if ("$numberDouble" in obj) return Number(obj.$numberDouble);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = unwrapMongoValue(v);
  }
  return out;
}
