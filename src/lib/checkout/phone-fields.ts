import { getCountryByCode } from "@/config/locales";

export interface PhoneFieldConfig {
  dialCode: string;
  minDigits: number;
  maxDigits: number;
  /** Example national number — digits only, no country code. */
  placeholder: string;
}

const PHONE_CONFIG: Record<string, PhoneFieldConfig> = {
  US: { dialCode: "+1", minDigits: 10, maxDigits: 10, placeholder: "5551234567" },
  CA: { dialCode: "+1", minDigits: 10, maxDigits: 10, placeholder: "4165550123" },
  GB: { dialCode: "+44", minDigits: 10, maxDigits: 10, placeholder: "7911123456" },
  AU: { dialCode: "+61", minDigits: 9, maxDigits: 9, placeholder: "412345678" },
  PK: { dialCode: "+92", minDigits: 10, maxDigits: 10, placeholder: "3001234567" },
  IN: { dialCode: "+91", minDigits: 10, maxDigits: 10, placeholder: "9876543210" },
  AE: { dialCode: "+971", minDigits: 9, maxDigits: 9, placeholder: "501234567" },
  SA: { dialCode: "+966", minDigits: 9, maxDigits: 9, placeholder: "512345678" },
  DE: { dialCode: "+49", minDigits: 10, maxDigits: 11, placeholder: "15123456789" },
  FR: { dialCode: "+33", minDigits: 9, maxDigits: 9, placeholder: "612345678" },
  ES: { dialCode: "+34", minDigits: 9, maxDigits: 9, placeholder: "612345678" },
  IT: { dialCode: "+39", minDigits: 9, maxDigits: 10, placeholder: "3123456789" },
  JP: { dialCode: "+81", minDigits: 10, maxDigits: 10, placeholder: "9012345678" },
  CN: { dialCode: "+86", minDigits: 11, maxDigits: 11, placeholder: "13123456789" },
  KR: { dialCode: "+82", minDigits: 9, maxDigits: 10, placeholder: "1012345678" },
  BR: { dialCode: "+55", minDigits: 10, maxDigits: 11, placeholder: "11987654321" },
  TR: { dialCode: "+90", minDigits: 10, maxDigits: 10, placeholder: "5321234567" },
  SG: { dialCode: "+65", minDigits: 8, maxDigits: 8, placeholder: "91234567" },
  CH: { dialCode: "+41", minDigits: 9, maxDigits: 9, placeholder: "791234567" },
  MX: { dialCode: "+52", minDigits: 10, maxDigits: 10, placeholder: "5512345678" },
  ZA: { dialCode: "+27", minDigits: 9, maxDigits: 9, placeholder: "821234567" },
};

const DEFAULT_PHONE_CONFIG: PhoneFieldConfig = {
  dialCode: "+1",
  minDigits: 7,
  maxDigits: 15,
  placeholder: "1234567890",
};

export function getPhoneFieldConfig(countryCode: string): PhoneFieldConfig {
  return PHONE_CONFIG[countryCode.toUpperCase()] ?? DEFAULT_PHONE_CONFIG;
}

/** Strip to digits only and clamp to country max length. */
export function sanitizePhoneNational(
  value: string,
  countryCode: string
): string {
  const config = getPhoneFieldConfig(countryCode);
  return value.replace(/\D/g, "").slice(0, config.maxDigits);
}

export function isValidPhoneForCountry(
  countryCode: string,
  nationalNumber: string
): boolean {
  const digits = nationalNumber.replace(/\D/g, "");
  const config = getPhoneFieldConfig(countryCode);
  return (
    digits.length >= config.minDigits && digits.length <= config.maxDigits
  );
}

export function formatPhoneDisplay(
  countryCode: string,
  nationalNumber: string
): string {
  const digits = nationalNumber.replace(/\D/g, "");
  if (!digits) return "";
  const { dialCode } = getPhoneFieldConfig(countryCode);
  return `${dialCode} ${digits}`;
}

export function formatPhoneE164(
  countryCode: string,
  nationalNumber: string
): string {
  const digits = nationalNumber.replace(/\D/g, "");
  if (!digits) return "";
  const { dialCode } = getPhoneFieldConfig(countryCode);
  return `${dialCode}${digits}`;
}

export function normalizePhoneForCountry(
  countryCode: string,
  nationalNumber: string
): string {
  return sanitizePhoneNational(nationalNumber, countryCode);
}

export interface PhoneCountryOption {
  code: string;
  name: string;
  dialCode: string;
}

/** Sorted phone country options for dial-code dropdown. */
export function getPhoneCountryOptions(): PhoneCountryOption[] {
  return Object.keys(PHONE_CONFIG)
    .map((code) => {
      const config = PHONE_CONFIG[code];
      return {
        code,
        name: getCountryByCode(code)?.name ?? code,
        dialCode: config.dialCode,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
