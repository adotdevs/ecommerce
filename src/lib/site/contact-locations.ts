export const DEFAULT_CONTACT_COUNTRY = "*";

export interface ContactLocation {
  countryCode: string;
  email: string;
  phone: string;
  address: string;
  hours: string;
}

export interface ResolvedContact {
  email: string;
  phone: string;
  address: string;
  hours: string;
}

function trimStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeContactLocations(raw: unknown): ContactLocation[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const result: ContactLocation[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const rawCode = trimStr(row.countryCode).toUpperCase();
    const countryCode = rawCode === "" || rawCode === DEFAULT_CONTACT_COUNTRY
      ? DEFAULT_CONTACT_COUNTRY
      : rawCode;
    if (seen.has(countryCode)) continue;
    seen.add(countryCode);

    const location: ContactLocation = {
      countryCode,
      email: trimStr(row.email),
      phone: trimStr(row.phone),
      address: trimStr(row.address),
      hours: trimStr(row.hours),
    };

    if (
      !location.email &&
      !location.phone &&
      !location.address &&
      !location.hours
    ) {
      continue;
    }

    result.push(location);
  }

  return result;
}

export function resolveContactForCountry(
  locations: ContactLocation[],
  countryCode: string | undefined,
  fallback: { email?: string; phone?: string }
): ResolvedContact {
  const code = countryCode?.trim().toUpperCase();
  const fallbacks = locations.find((l) => l.countryCode === DEFAULT_CONTACT_COUNTRY);
  const match = code
    ? locations.find((l) => l.countryCode === code)
    : undefined;

  return {
    email: match?.email || fallbacks?.email || fallback.email?.trim() || "",
    phone: match?.phone || fallbacks?.phone || fallback.phone?.trim() || "",
    address: match?.address || fallbacks?.address || "",
    hours: match?.hours || fallbacks?.hours || "",
  };
}

export function applyResolvedContact(
  content: Record<string, unknown>,
  resolved: ResolvedContact
): Record<string, unknown> {
  return {
    ...content,
    ...(resolved.email ? { email: resolved.email } : {}),
    ...(resolved.phone ? { phone: resolved.phone } : {}),
    ...(resolved.address ? { address: resolved.address } : {}),
    ...(resolved.hours ? { hours: resolved.hours } : {}),
  };
}
