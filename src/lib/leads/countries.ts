/** Canonical country labels + common CRM short codes / spelling variants. */

const CANONICAL_BY_ALIAS: Record<string, string> = {
  // United Kingdom
  gb: "United Kingdom",
  uk: "United Kingdom",
  "u k": "United Kingdom",
  "u.k": "United Kingdom",
  "u.k.": "United Kingdom",
  "united kingdom": "United Kingdom",
  "united kingdom of great britain and northern ireland": "United Kingdom",
  "great britain": "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",

  // United States
  us: "United States",
  usa: "United States",
  "u.s": "United States",
  "u.s.": "United States",
  "u.s.a": "United States",
  "u.s.a.": "United States",
  "united states": "United States",
  "united states of america": "United States",
  america: "United States",

  // UAE
  uae: "United Arab Emirates",
  "u a e": "United Arab Emirates",
  "u.a.e": "United Arab Emirates",
  "u.a.e.": "United Arab Emirates",
  "united arab emirates": "United Arab Emirates",

  // Common ISO / short codes
  de: "Germany",
  ger: "Germany",
  deutschland: "Germany",
  fr: "France",
  es: "Spain",
  esp: "Spain",
  it: "Italy",
  nl: "Netherlands",
  "the netherlands": "Netherlands",
  holland: "Netherlands",
  be: "Belgium",
  ch: "Switzerland",
  at: "Austria",
  ie: "Ireland",
  "republic of ireland": "Ireland",
  se: "Sweden",
  no: "Norway",
  dk: "Denmark",
  fi: "Finland",
  pl: "Poland",
  pt: "Portugal",
  gr: "Greece",
  tr: "Turkey",
  turkiye: "Turkey",
  türkiye: "Turkey",
  ua: "Ukraine",
  ru: "Russia",
  "russian federation": "Russia",
  cn: "China",
  "p.r.c": "China",
  "peoples republic of china": "China",
  "people's republic of china": "China",
  jp: "Japan",
  kr: "South Korea",
  "korea south": "South Korea",
  "republic of korea": "South Korea",
  hk: "Hong Kong",
  "hong kong sar": "Hong Kong",
  "hong kong china": "Hong Kong",
  tw: "Taiwan",
  "taiwan province of china": "Taiwan",
  sg: "Singapore",
  my: "Malaysia",
  id: "Indonesia",
  th: "Thailand",
  ph: "Philippines",
  vn: "Vietnam",
  in: "India",
  pk: "Pakistan",
  bd: "Bangladesh",
  au: "Australia",
  nz: "New Zealand",
  ca: "Canada",
  mx: "Mexico",
  br: "Brazil",
  ar: "Argentina",
  cl: "Chile",
  co: "Colombia",
  za: "South Africa",
  ng: "Nigeria",
  eg: "Egypt",
  ke: "Kenya",
  sa: "Saudi Arabia",
  "ksa": "Saudi Arabia",
  "saudi": "Saudi Arabia",
  qa: "Qatar",
  kw: "Kuwait",
  bh: "Bahrain",
  om: "Oman",
  il: "Israel",
  cz: "Czech Republic",
  czechia: "Czech Republic",
  "czech republic": "Czech Republic",
  ro: "Romania",
  hu: "Hungary",
  kz: "Kazakhstan",
};

function collapseKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_./\\,+]+/g, " ")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      if (part.includes("-")) {
        return part
          .split("-")
          .map((p) => (p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))
          .join("-");
      }
      // Keep small words lowercase unless first
      return part[0].toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Canonical display name for a raw country string. */
export function normalizeCountryName(raw: unknown): string {
  if (raw == null) return "";
  const key = collapseKey(String(raw));
  if (!key) return "";
  if (CANONICAL_BY_ALIAS[key]) return CANONICAL_BY_ALIAS[key];
  return toTitleCase(key);
}

/** All known raw/alias forms that map to the same canonical country. */
export function expandCountryAliases(selected: string): string[] {
  const canonical = normalizeCountryName(selected);
  if (!canonical) return [];

  const variants = new Set<string>([
    canonical,
    canonical.toLowerCase(),
    canonical.toUpperCase(),
    selected.trim(),
  ]);

  const canonicalKey = collapseKey(canonical);
  for (const [alias, canon] of Object.entries(CANONICAL_BY_ALIAS)) {
    if (collapseKey(canon) !== canonicalKey) continue;
    variants.add(alias);
    variants.add(toTitleCase(alias));
    variants.add(alias.toUpperCase());
    variants.add(canon);
  }

  return Array.from(variants).filter(Boolean);
}

export function mergeCountryFacetCounts(
  rows: { value: string; count: number }[]
): { value: string; count: number; aliases: string[] }[] {
  const map = new Map<
    string,
    { value: string; count: number; aliases: Set<string> }
  >();

  for (const row of rows) {
    const canonical = normalizeCountryName(row.value);
    if (!canonical) continue;
    const existing = map.get(canonical);
    if (existing) {
      existing.count += row.count;
      existing.aliases.add(row.value);
    } else {
      map.set(canonical, {
        value: canonical,
        count: row.count,
        aliases: new Set([row.value]),
      });
    }
  }

  return Array.from(map.values())
    .map((x) => ({
      value: x.value,
      count: x.count,
      aliases: Array.from(x.aliases),
    }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}
