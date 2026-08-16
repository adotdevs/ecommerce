/**
 * Central relevance knobs — keep magic numbers here, not scattered.
 * Set SEARCH_DEBUG=1 to log ranking signals on the server (never sent to customers).
 */

export const SEARCH_WEIGHTS = {
  exactSku: 1,
  exactTitle: 0.98,
  titlePhrase: 0.92,
  titleToken: 0.34,
  brandToken: 0.28,
  categoryToken: 0.24,
  tagToken: 0.16,
  skuToken: 0.3,
  shortDescriptionToken: 0.06,
  featuredBonus: 0.02,
} as const;

/** Drop anything below this after all signals (0–1). */
export const MIN_RELEVANCE_SCORE = 0.42;

/** Single-token queries must fully match a primary field. */
export const MIN_TOKEN_COVERAGE_SINGLE = 1;
/** Multi-token queries must match most meaningful tokens. */
export const MIN_TOKEN_COVERAGE_MULTI = 0.6;

export const MAX_CANDIDATES = 80;

export const ACCESSORY_TERMS = [
  "case",
  "cases",
  "cover",
  "covers",
  "charger",
  "chargers",
  "cable",
  "cables",
  "protector",
  "protectors",
  "adapter",
  "adapters",
  "skin",
  "stand",
  "mount",
  "holder",
  "sleeve",
  "pouch",
] as const;

export const SEARCH_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "to",
  "for",
  "in",
  "on",
  "with",
  "by",
  "from",
  "new",
  "top",
  "best",
  "sale",
  "free",
  "size",
  "color",
  "colour",
]);

/** Maintainable synonym map — expand here, not inline in matchers. */
export const SEARCH_SYNONYMS: Record<string, string[]> = {
  phone: ["iphone", "smartphone", "mobile", "cellphone"],
  mobile: ["phone", "smartphone", "iphone"],
  smartphone: ["phone", "iphone", "mobile"],
  cellphone: ["phone", "smartphone", "mobile"],
  cell: ["phone", "cellphone", "smartphone"],
  iphone: ["phone", "smartphone"],
  laptop: ["macbook", "notebook", "computer"],
  computer: ["laptop", "macbook", "notebook", "pc"],
  macbook: ["laptop", "notebook"],
  headphone: ["headphones", "earbuds", "earphone", "earphones", "headset"],
  headphones: ["headphone", "earbuds", "earphone", "earphones", "headset"],
  earphones: ["earbuds", "headphones", "headphone", "earphone"],
  earbuds: ["earphones", "headphones", "earphone"],
  charger: ["adapter"],
  shirt: ["shirts", "tshirt", "tshirts", "tee", "tees", "polo", "polos", "blouse"],
  shirts: ["shirt", "tshirt", "tee", "polo"],
  tshirt: ["shirt", "tee", "polo"],
  tee: ["tshirt", "shirt"],
  polo: ["shirt", "shirts"],
  shoe: ["shoes", "sneaker", "sneakers"],
  shoes: ["shoe", "sneaker", "sneakers"],
  sneaker: ["shoe", "shoes", "sneakers"],
  watch: ["wristwatch", "timepiece"],
  tv: ["television"],
  television: ["tv"],
  fridge: ["refrigerator"],
  refrigerator: ["fridge"],
};

export const VOCAB_CACHE_MS = 30 * 60 * 1000;
