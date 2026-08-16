export interface PhoneCountry {
  iso: string;
  name: string;
  dialCode: string; // e.g. "+44"
  /** Typical full E.164 digit length (country code + national number), inclusive range */
  minLength: number;
  maxLength: number;
}

/** Sorted longest dial code first for matching. */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "RU", name: "Russia", dialCode: "+7", minLength: 11, maxLength: 12 },
  { iso: "KZ", name: "Kazakhstan", dialCode: "+7", minLength: 11, maxLength: 12 },
  { iso: "US", name: "United States", dialCode: "+1", minLength: 11, maxLength: 11 },
  { iso: "CA", name: "Canada", dialCode: "+1", minLength: 11, maxLength: 11 },
  { iso: "GB", name: "United Kingdom", dialCode: "+44", minLength: 12, maxLength: 13 },
  { iso: "DE", name: "Germany", dialCode: "+49", minLength: 11, maxLength: 13 },
  { iso: "FR", name: "France", dialCode: "+33", minLength: 11, maxLength: 12 },
  { iso: "IT", name: "Italy", dialCode: "+39", minLength: 11, maxLength: 13 },
  { iso: "ES", name: "Spain", dialCode: "+34", minLength: 11, maxLength: 12 },
  { iso: "PT", name: "Portugal", dialCode: "+351", minLength: 12, maxLength: 13 },
  { iso: "NL", name: "Netherlands", dialCode: "+31", minLength: 11, maxLength: 12 },
  { iso: "BE", name: "Belgium", dialCode: "+32", minLength: 11, maxLength: 12 },
  { iso: "CH", name: "Switzerland", dialCode: "+41", minLength: 11, maxLength: 12 },
  { iso: "AT", name: "Austria", dialCode: "+43", minLength: 11, maxLength: 13 },
  { iso: "IE", name: "Ireland", dialCode: "+353", minLength: 11, maxLength: 13 },
  { iso: "SE", name: "Sweden", dialCode: "+46", minLength: 11, maxLength: 13 },
  { iso: "NO", name: "Norway", dialCode: "+47", minLength: 10, maxLength: 12 },
  { iso: "DK", name: "Denmark", dialCode: "+45", minLength: 10, maxLength: 11 },
  { iso: "FI", name: "Finland", dialCode: "+358", minLength: 11, maxLength: 13 },
  { iso: "PL", name: "Poland", dialCode: "+48", minLength: 11, maxLength: 12 },
  { iso: "CZ", name: "Czech Republic", dialCode: "+420", minLength: 12, maxLength: 12 },
  { iso: "RO", name: "Romania", dialCode: "+40", minLength: 11, maxLength: 12 },
  { iso: "HU", name: "Hungary", dialCode: "+36", minLength: 11, maxLength: 12 },
  { iso: "GR", name: "Greece", dialCode: "+30", minLength: 12, maxLength: 12 },
  { iso: "TR", name: "Turkey", dialCode: "+90", minLength: 12, maxLength: 13 },
  { iso: "UA", name: "Ukraine", dialCode: "+380", minLength: 12, maxLength: 13 },
  { iso: "AE", name: "United Arab Emirates", dialCode: "+971", minLength: 12, maxLength: 13 },
  { iso: "SA", name: "Saudi Arabia", dialCode: "+966", minLength: 12, maxLength: 13 },
  { iso: "QA", name: "Qatar", dialCode: "+974", minLength: 11, maxLength: 12 },
  { iso: "KW", name: "Kuwait", dialCode: "+965", minLength: 11, maxLength: 12 },
  { iso: "BH", name: "Bahrain", dialCode: "+973", minLength: 11, maxLength: 12 },
  { iso: "OM", name: "Oman", dialCode: "+968", minLength: 11, maxLength: 12 },
  { iso: "PK", name: "Pakistan", dialCode: "+92", minLength: 12, maxLength: 13 },
  { iso: "IN", name: "India", dialCode: "+91", minLength: 12, maxLength: 13 },
  { iso: "BD", name: "Bangladesh", dialCode: "+880", minLength: 13, maxLength: 14 },
  { iso: "CN", name: "China", dialCode: "+86", minLength: 13, maxLength: 14 },
  { iso: "JP", name: "Japan", dialCode: "+81", minLength: 12, maxLength: 13 },
  { iso: "KR", name: "South Korea", dialCode: "+82", minLength: 11, maxLength: 13 },
  { iso: "SG", name: "Singapore", dialCode: "+65", minLength: 10, maxLength: 11 },
  { iso: "MY", name: "Malaysia", dialCode: "+60", minLength: 11, maxLength: 13 },
  { iso: "ID", name: "Indonesia", dialCode: "+62", minLength: 11, maxLength: 14 },
  { iso: "TH", name: "Thailand", dialCode: "+66", minLength: 11, maxLength: 12 },
  { iso: "PH", name: "Philippines", dialCode: "+63", minLength: 12, maxLength: 13 },
  { iso: "VN", name: "Vietnam", dialCode: "+84", minLength: 11, maxLength: 12 },
  { iso: "AU", name: "Australia", dialCode: "+61", minLength: 11, maxLength: 12 },
  { iso: "NZ", name: "New Zealand", dialCode: "+64", minLength: 10, maxLength: 12 },
  { iso: "ZA", name: "South Africa", dialCode: "+27", minLength: 11, maxLength: 12 },
  { iso: "NG", name: "Nigeria", dialCode: "+234", minLength: 13, maxLength: 14 },
  { iso: "EG", name: "Egypt", dialCode: "+20", minLength: 11, maxLength: 13 },
  { iso: "KE", name: "Kenya", dialCode: "+254", minLength: 12, maxLength: 13 },
  { iso: "BR", name: "Brazil", dialCode: "+55", minLength: 12, maxLength: 13 },
  { iso: "MX", name: "Mexico", dialCode: "+52", minLength: 12, maxLength: 13 },
  { iso: "AR", name: "Argentina", dialCode: "+54", minLength: 12, maxLength: 14 },
  { iso: "CL", name: "Chile", dialCode: "+56", minLength: 11, maxLength: 12 },
  { iso: "CO", name: "Colombia", dialCode: "+57", minLength: 12, maxLength: 13 },
  { iso: "HK", name: "Hong Kong", dialCode: "+852", minLength: 11, maxLength: 12 },
  { iso: "TW", name: "Taiwan", dialCode: "+886", minLength: 12, maxLength: 13 },
  { iso: "IL", name: "Israel", dialCode: "+972", minLength: 12, maxLength: 13 },
].sort((a, b) => b.dialCode.length - a.dialCode.length);

const byIso = new Map(PHONE_COUNTRIES.map((c) => [c.iso, c]));

export function getPhoneCountryByIso(iso: string): PhoneCountry | undefined {
  return byIso.get(iso.toUpperCase());
}

export function detectPhoneMeta(phone: string): {
  phoneCountry?: string;
  phoneDialCode?: string;
  phoneLength: number;
  lengthValid?: boolean;
} {
  const digits = phone.replace(/\D/g, "");
  const phoneLength = digits.length;
  const e164 = phone.startsWith("+") ? `+${digits}` : phone.startsWith("00")
    ? `+${digits.slice(2)}`
    : `+${digits}`;

  for (const c of PHONE_COUNTRIES) {
    const codeDigits = c.dialCode.replace(/\D/g, "");
    if (e164.startsWith(c.dialCode) || digits.startsWith(codeDigits)) {
      // Prefer unique ISO when dial codes collide (+1, +7)
      return {
        phoneCountry: c.iso,
        phoneDialCode: c.dialCode,
        phoneLength,
        lengthValid: phoneLength >= c.minLength && phoneLength <= c.maxLength,
      };
    }
  }

  return { phoneLength };
}

export function phoneLengthOptionsForIso(iso: string): number[] {
  const c = getPhoneCountryByIso(iso);
  if (!c) return [];
  const out: number[] = [];
  for (let n = c.minLength; n <= c.maxLength; n++) out.push(n);
  return out;
}

/** Unique countries by ISO for dropdowns (dedupe shared dial codes: keep first). */
export const PHONE_COUNTRY_OPTIONS = Array.from(
  new Map(PHONE_COUNTRIES.map((c) => [c.iso, c])).values()
).sort((a, b) => a.name.localeCompare(b.name));
