export type RegionFieldType = "select" | "text" | "none";

export interface AddressRegionConfig {
  type: RegionFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: { value: string; label: string }[];
}

export interface AddressFieldConfig {
  countryCode: string;
  countryName: string;
  region: AddressRegionConfig;
  postalCode: {
    label: string;
    placeholder: string;
    required: boolean;
    pattern?: RegExp;
  };
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
] as const;

const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

function usStateOptions() {
  return US_STATES.map((code) => ({
    value: code,
    label: US_STATE_NAMES[code] ?? code,
  }));
}

function selectRegion(label: string, options: { value: string; label: string }[]): AddressRegionConfig {
  return { type: "select", label, required: true, options };
}

function textRegion(label: string, placeholder: string, required = true): AddressRegionConfig {
  return { type: "text", label, placeholder, required };
}

function noRegion(): AddressRegionConfig {
  return { type: "none", label: "", required: false };
}

const ZIP_US = /^\d{5}(-\d{4})?$/;
const ZIP_UK = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const ZIP_CA = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i;
const ZIP_IN = /^\d{6}$/;
const ZIP_PK = /^\d{5}$/;

/** Checkout address field rules keyed by deliver-to country code. */
export const ADDRESS_FIELD_CONFIG: Record<string, AddressFieldConfig> = {
  US: {
    countryCode: "US",
    countryName: "United States",
    region: selectRegion("State", usStateOptions()),
    postalCode: { label: "ZIP Code", placeholder: "10001", required: true, pattern: ZIP_US },
  },
  CA: {
    countryCode: "CA",
    countryName: "Canada",
    region: selectRegion("Province", [
      { value: "AB", label: "Alberta" }, { value: "BC", label: "British Columbia" },
      { value: "MB", label: "Manitoba" }, { value: "NB", label: "New Brunswick" },
      { value: "NL", label: "Newfoundland and Labrador" }, { value: "NS", label: "Nova Scotia" },
      { value: "NT", label: "Northwest Territories" }, { value: "NU", label: "Nunavut" },
      { value: "ON", label: "Ontario" }, { value: "PE", label: "Prince Edward Island" },
      { value: "QC", label: "Quebec" }, { value: "SK", label: "Saskatchewan" },
      { value: "YT", label: "Yukon" },
    ]),
    postalCode: { label: "Postal Code", placeholder: "K1A 0B1", required: true, pattern: ZIP_CA },
  },
  GB: {
    countryCode: "GB",
    countryName: "United Kingdom",
    region: textRegion("County (optional)", "Greater London", false),
    postalCode: { label: "Postcode", placeholder: "SW1A 1AA", required: true, pattern: ZIP_UK },
  },
  AU: {
    countryCode: "AU",
    countryName: "Australia",
    region: selectRegion("State / Territory", [
      { value: "NSW", label: "New South Wales" }, { value: "VIC", label: "Victoria" },
      { value: "QLD", label: "Queensland" }, { value: "WA", label: "Western Australia" },
      { value: "SA", label: "South Australia" }, { value: "TAS", label: "Tasmania" },
      { value: "ACT", label: "Australian Capital Territory" }, { value: "NT", label: "Northern Territory" },
    ]),
    postalCode: { label: "Postcode", placeholder: "2000", required: true, pattern: /^\d{4}$/ },
  },
  PK: {
    countryCode: "PK",
    countryName: "Pakistan",
    region: selectRegion("Province", [
      { value: "Punjab", label: "Punjab" }, { value: "Sindh", label: "Sindh" },
      { value: "KPK", label: "Khyber Pakhtunkhwa" }, { value: "Balochistan", label: "Balochistan" },
      { value: "ICT", label: "Islamabad Capital Territory" }, { value: "GB", label: "Gilgit-Baltistan" },
      { value: "AJK", label: "Azad Jammu & Kashmir" },
    ]),
    postalCode: { label: "Postal Code", placeholder: "44000", required: true, pattern: ZIP_PK },
  },
  IN: {
    countryCode: "IN",
    countryName: "India",
    region: selectRegion("State", [
      { value: "AN", label: "Andaman and Nicobar Islands" }, { value: "AP", label: "Andhra Pradesh" },
      { value: "AR", label: "Arunachal Pradesh" }, { value: "AS", label: "Assam" },
      { value: "BR", label: "Bihar" }, { value: "CH", label: "Chandigarh" },
      { value: "CT", label: "Chhattisgarh" }, { value: "DL", label: "Delhi" },
      { value: "GA", label: "Goa" }, { value: "GJ", label: "Gujarat" },
      { value: "HR", label: "Haryana" }, { value: "HP", label: "Himachal Pradesh" },
      { value: "JK", label: "Jammu and Kashmir" }, { value: "JH", label: "Jharkhand" },
      { value: "KA", label: "Karnataka" }, { value: "KL", label: "Kerala" },
      { value: "MP", label: "Madhya Pradesh" }, { value: "MH", label: "Maharashtra" },
      { value: "MN", label: "Manipur" }, { value: "ML", label: "Meghalaya" },
      { value: "MZ", label: "Mizoram" }, { value: "NL", label: "Nagaland" },
      { value: "OR", label: "Odisha" }, { value: "PB", label: "Punjab" },
      { value: "RJ", label: "Rajasthan" }, { value: "SK", label: "Sikkim" },
      { value: "TN", label: "Tamil Nadu" }, { value: "TG", label: "Telangana" },
      { value: "TR", label: "Tripura" }, { value: "UP", label: "Uttar Pradesh" },
      { value: "UT", label: "Uttarakhand" }, { value: "WB", label: "West Bengal" },
    ]),
    postalCode: { label: "PIN Code", placeholder: "110001", required: true, pattern: ZIP_IN },
  },
  AE: {
    countryCode: "AE",
    countryName: "United Arab Emirates",
    region: selectRegion("Emirate", [
      { value: "Abu Dhabi", label: "Abu Dhabi" }, { value: "Dubai", label: "Dubai" },
      { value: "Sharjah", label: "Sharjah" }, { value: "Ajman", label: "Ajman" },
      { value: "Umm Al Quwain", label: "Umm Al Quwain" }, { value: "Ras Al Khaimah", label: "Ras Al Khaimah" },
      { value: "Fujairah", label: "Fujairah" },
    ]),
    postalCode: { label: "Postal Code (optional)", placeholder: "00000", required: false },
  },
  SA: {
    countryCode: "SA",
    countryName: "Saudi Arabia",
    region: selectRegion("Region", [
      { value: "Riyadh", label: "Riyadh" }, { value: "Makkah", label: "Makkah" },
      { value: "Eastern Province", label: "Eastern Province" }, { value: "Asir", label: "Asir" },
      { value: "Jazan", label: "Jazan" }, { value: "Tabuk", label: "Tabuk" },
      { value: "Madinah", label: "Madinah" }, { value: "Qassim", label: "Qassim" },
    ]),
    postalCode: { label: "Postal Code", placeholder: "11564", required: true, pattern: /^\d{5}$/ },
  },
  DE: {
    countryCode: "DE",
    countryName: "Germany",
    region: noRegion(),
    postalCode: { label: "Postleitzahl", placeholder: "10115", required: true, pattern: /^\d{5}$/ },
  },
  FR: {
    countryCode: "FR",
    countryName: "France",
    region: noRegion(),
    postalCode: { label: "Code postal", placeholder: "75001", required: true, pattern: /^\d{5}$/ },
  },
  ES: {
    countryCode: "ES",
    countryName: "Spain",
    region: selectRegion("Province", [
      { value: "Madrid", label: "Madrid" }, { value: "Barcelona", label: "Barcelona" },
      { value: "Valencia", label: "Valencia" }, { value: "Seville", label: "Seville" },
      { value: "Balearic Islands", label: "Balearic Islands" }, { value: "Basque Country", label: "Basque Country" },
    ]),
    postalCode: { label: "Postal Code", placeholder: "28001", required: true, pattern: /^\d{5}$/ },
  },
  IT: {
    countryCode: "IT",
    countryName: "Italy",
    region: textRegion("Province", "RM"),
    postalCode: { label: "CAP", placeholder: "00118", required: true, pattern: /^\d{5}$/ },
  },
  JP: {
    countryCode: "JP",
    countryName: "Japan",
    region: textRegion("Prefecture", "Tokyo"),
    postalCode: { label: "Postal Code", placeholder: "100-0001", required: true, pattern: /^\d{3}-?\d{4}$/ },
  },
  CN: {
    countryCode: "CN",
    countryName: "China",
    region: selectRegion("Province", [
      { value: "Beijing", label: "Beijing" }, { value: "Shanghai", label: "Shanghai" },
      { value: "Guangdong", label: "Guangdong" }, { value: "Zhejiang", label: "Zhejiang" },
      { value: "Jiangsu", label: "Jiangsu" }, { value: "Sichuan", label: "Sichuan" },
    ]),
    postalCode: { label: "Postal Code", placeholder: "100000", required: true, pattern: /^\d{6}$/ },
  },
  KR: {
    countryCode: "KR",
    countryName: "South Korea",
    region: textRegion("Province", "Seoul"),
    postalCode: { label: "Postal Code", placeholder: "04524", required: true, pattern: /^\d{5}$/ },
  },
  BR: {
    countryCode: "BR",
    countryName: "Brazil",
    region: selectRegion("State", [
      { value: "SP", label: "São Paulo" }, { value: "RJ", label: "Rio de Janeiro" },
      { value: "MG", label: "Minas Gerais" }, { value: "BA", label: "Bahia" },
      { value: "RS", label: "Rio Grande do Sul" }, { value: "PR", label: "Paraná" },
    ]),
    postalCode: { label: "CEP", placeholder: "01310-100", required: true, pattern: /^\d{5}-?\d{3}$/ },
  },
  TR: {
    countryCode: "TR",
    countryName: "Turkey",
    region: textRegion("Province", "Istanbul"),
    postalCode: { label: "Postal Code", placeholder: "34000", required: true, pattern: /^\d{5}$/ },
  },
  SG: {
    countryCode: "SG",
    countryName: "Singapore",
    region: noRegion(),
    postalCode: { label: "Postal Code", placeholder: "018956", required: true, pattern: /^\d{6}$/ },
  },
  CH: {
    countryCode: "CH",
    countryName: "Switzerland",
    region: noRegion(),
    postalCode: { label: "NPA", placeholder: "8001", required: true, pattern: /^\d{4}$/ },
  },
  MX: {
    countryCode: "MX",
    countryName: "Mexico",
    region: selectRegion("State", [
      { value: "CMX", label: "Ciudad de México" }, { value: "JAL", label: "Jalisco" },
      { value: "NLE", label: "Nuevo León" }, { value: "VER", label: "Veracruz" },
      { value: "BCN", label: "Baja California" }, { value: "GUA", label: "Guanajuato" },
    ]),
    postalCode: { label: "Código Postal", placeholder: "01000", required: true, pattern: /^\d{5}$/ },
  },
  ZA: {
    countryCode: "ZA",
    countryName: "South Africa",
    region: selectRegion("Province", [
      { value: "GP", label: "Gauteng" }, { value: "WC", label: "Western Cape" },
      { value: "KZN", label: "KwaZulu-Natal" }, { value: "EC", label: "Eastern Cape" },
    ]),
    postalCode: { label: "Postal Code", placeholder: "2000", required: true, pattern: /^\d{4}$/ },
  },
};

const DEFAULT_CONFIG: AddressFieldConfig = {
  countryCode: "US",
  countryName: "United States",
  region: textRegion("State / Province", "State or province"),
  postalCode: { label: "Postal / ZIP Code", placeholder: "Postal code", required: true },
};

function normalizeCountryCode(countryCode: string | undefined | null): string {
  const code = countryCode?.trim().toUpperCase();
  return code || "US";
}

export function getAddressFieldConfig(
  countryCode: string | undefined | null
): AddressFieldConfig {
  const code = normalizeCountryCode(countryCode);
  return ADDRESS_FIELD_CONFIG[code] ?? {
    ...DEFAULT_CONFIG,
    countryCode: code,
    countryName: code,
  };
}

export function isValidRegionForCountry(countryCode: string, state: string): boolean {
  const config = getAddressFieldConfig(countryCode);
  if (config.region.type === "none") return true;
  if (!config.region.required && !state.trim()) return true;
  if (config.region.type === "select") {
    return config.region.options?.some((o) => o.value === state) ?? false;
  }
  return state.trim().length >= 1;
}

export function isValidPostalForCountry(countryCode: string, postalCode: string): boolean {
  const config = getAddressFieldConfig(countryCode);
  const trimmed = postalCode.trim();
  if (!config.postalCode.required && !trimmed) return true;
  if (!trimmed) return false;
  if (config.postalCode.pattern) return config.postalCode.pattern.test(trimmed);
  return trimmed.length >= 3;
}

export function normalizeAddressForCountry(
  countryCode: string,
  state: string,
  postalCode: string
): { state: string; postalCode: string } {
  const config = getAddressFieldConfig(countryCode);
  let nextState = state;
  if (config.region.type === "none") {
    nextState = "";
  } else if (config.region.type === "select") {
    const valid = config.region.options?.some((o) => o.value === state);
    if (!valid) nextState = "";
  }
  return { state: nextState, postalCode };
}

export function formatAddressLine(
  countryCode: string,
  city: string,
  state: string,
  postalCode: string
): string {
  const config = getAddressFieldConfig(countryCode);
  let stateLabel = state;
  if (config.region.type === "select" && state) {
    stateLabel =
      config.region.options?.find((o) => o.value === state)?.label ?? state;
  }

  const parts: string[] = [city];
  if (config.region.type !== "none" && stateLabel) {
    parts.push(`${stateLabel} ${postalCode}`.trim());
  } else if (postalCode) {
    parts.push(postalCode);
  }
  return parts.filter(Boolean).join(", ");
}
