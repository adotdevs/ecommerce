import { unwrapMongoValue } from "@/lib/leads/normalize";

export type RawLeadRow = Record<string, unknown>;

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

export function parseCsv(text: string): RawLeadRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h || "column");
  const rows: RawLeadRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((c) => !c)) continue;
    const row: RawLeadRow = {};
    headers.forEach((header, idx) => {
      const key = header;
      if (row[key] !== undefined) {
        row[`${key}_${idx}`] = cells[idx] ?? "";
      } else {
        row[key] = cells[idx] ?? "";
      }
    });
    rows.push(row);
  }

  return rows;
}

function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of ["leads", "data", "documents", "items", "results"]) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
  }
  throw new Error("JSON must be an array of leads, or an object with a leads/data array");
}

export function parseJsonLeads(text: string): RawLeadRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON file");
  }

  const arr = extractArray(parsed);
  return arr.map((item) => {
    const unwrapped = unwrapMongoValue(item);
    if (!unwrapped || typeof unwrapped !== "object" || Array.isArray(unwrapped)) {
      return {};
    }
    return unwrapped as RawLeadRow;
  });
}

export function parseLeadFile(text: string, filename: string): RawLeadRow[] {
  const lower = filename.toLowerCase();
  const trimmed = text.trimStart();
  if (lower.endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return parseJsonLeads(text);
  }
  return parseCsv(text);
}

export function detectSourceFields(rows: RawLeadRow[], sampleSize = 50): string[] {
  const keys = new Set<string>();
  for (const row of rows.slice(0, sampleSize)) {
    Object.keys(row).forEach((k) => {
      if (!k.startsWith("$") && k !== "__v") keys.add(k);
    });
  }
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

/** Guess target field from common CRM column names. */
export function guessFieldMapping(sourceFields: string[]): Record<string, string | null> {
  const aliases: Record<string, string[]> = {
    firstName: ["firstname", "first_name", "first", "fname", "givenname", "given_name"],
    lastName: ["lastname", "last_name", "last", "lname", "surname", "familyname"],
    email: ["email", "emailaddress", "email_address", "e-mail", "mail"],
    phone: ["phone", "phonenumber", "phone_number", "mobile", "cellphone", "tel", "telephone", "number", "msisdn"],
    country: ["country", "countrycode", "country_code", "nation"],
    brand: ["brand", "brandname", "brand_name"],
    address: ["address", "street", "fulladdress", "full_address"],
    status: ["status", "leadstatus", "lead_status"],
    agent: ["agent", "agentid", "agent_id", "owner", "assignedto"],
    notes: ["notes", "note", "comment", "comments"],
    tags: ["tags", "tag", "labels"],
    source: ["source", "leadsource", "lead_source", "origin"],
  };

  const mapping: Record<string, string | null> = {};
  const used = new Set<string>();

  for (const field of sourceFields) {
    const norm = field.toLowerCase().replace(/[^a-z0-9]/g, "");
    let matched: string | null = null;
    for (const [target, list] of Object.entries(aliases)) {
      if (list.includes(norm) && !used.has(target)) {
        matched = target;
        used.add(target);
        break;
      }
    }
    mapping[field] = matched;
  }

  return mapping;
}
