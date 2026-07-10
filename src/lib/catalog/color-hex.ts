/** Map color labels to hex swatches when AI omits or duplicates hex. */
const COLOR_HEX_MAP: Record<string, string> = {
  black: "#111111",
  white: "#f5f5f5",
  gray: "#6b7280",
  grey: "#6b7280",
  silver: "#c0c0c0",
  gold: "#d4af37",
  rose: "#f43f5e",
  "rose gold": "#b76e79",
  red: "#dc2626",
  blue: "#2563eb",
  navy: "#1e3a5f",
  "deep blue": "#1e40af",
  "midnight blue": "#191970",
  green: "#16a34a",
  mint: "#6ee7b7",
  teal: "#0d9488",
  purple: "#7c3aed",
  violet: "#8b5cf6",
  pink: "#ec4899",
  orange: "#ea580c",
  yellow: "#eab308",
  beige: "#d4c4a8",
  brown: "#78350f",
  tan: "#d2b48c",
  cream: "#fffdd0",
  ivory: "#fffff0",
  charcoal: "#36454f",
  graphite: "#383838",
  "space gray": "#535356",
  "space grey": "#535356",
  titanium: "#878681",
  natural: "#e8dcc8",
  coral: "#ff7f50",
  lavender: "#e6e6fa",
  burgundy: "#800020",
  maroon: "#800000",
  olive: "#808000",
  cyan: "#06b6d4",
  indigo: "#4f46e5",
  magenta: "#d946ef",
  bronze: "#cd7f32",
  copper: "#b87333",
  champagne: "#f7e7ce",
  plum: "#8e4585",
  sand: "#c2b280",
  stone: "#928e85",
  slate: "#64748b",
  midnight: "#191970",
  starlight: "#f5f0e8",
  sierra: "#9d7b6e",
  alpine: "#4a6741",
};

function hashToHex(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 45%)`;
}

export function isValidHex(hex?: string): boolean {
  return Boolean(hex && /^#[0-9a-fA-F]{6}$/.test(hex));
}

export function resolveColorHex(label: string, hint?: string): string {
  if (isValidHex(hint)) return hint!;

  const normalized = label.trim().toLowerCase();
  if (COLOR_HEX_MAP[normalized]) return COLOR_HEX_MAP[normalized];

  for (const [key, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return hex;
  }

  const words = normalized.split(/[\s/-]+/);
  for (const word of words) {
    if (COLOR_HEX_MAP[word]) return COLOR_HEX_MAP[word];
  }

  return hashToHex(label);
}
