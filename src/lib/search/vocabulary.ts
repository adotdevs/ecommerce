import { Brand } from "@/models/Brand";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { VOCAB_CACHE_MS } from "@/lib/search/config";
import { levenshtein } from "@/lib/search/fuzzy";
import { isModelLike, tokenize } from "@/lib/search/normalize";

let cache: { at: number; words: Set<string> } | null = null;

export async function getCatalogVocabulary(): Promise<Set<string>> {
  if (cache && Date.now() - cache.at < VOCAB_CACHE_MS) return cache.words;

  const words = new Set<string>();

  let brands: { name?: string; slug?: string }[] = [];
  let categories: { name?: string; slug?: string }[] = [];
  let names: {
    name?: string;
    brandName?: string;
    categoryNames?: string[];
    tags?: string[];
  }[] = [];

  try {
    [brands, categories, names] = await Promise.all([
      Brand.find().select("name slug").lean(),
      Category.find().select("name slug").lean(),
      Product.find({ status: "published" })
        .select("name brandName categoryNames tags")
        .limit(2500)
        .lean(),
    ]);
  } catch {
    return cache?.words ?? words;
  }

  for (const row of [...brands, ...categories]) {
    for (const token of tokenize(`${row.name ?? ""} ${row.slug ?? ""}`)) {
      if (token.length >= 3) words.add(token);
    }
  }

  for (const product of names) {
    const blob = [
      product.name,
      product.brandName,
      ...(product.categoryNames ?? []),
      ...(product.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ");
    for (const token of tokenize(String(blob))) {
      if (token.length >= 3) words.add(token);
    }
  }

  cache = { at: Date.now(), words };
  return words;
}

/** Correct a token against catalog words. Never rewrite model/SKU-like tokens. */
export function correctToken(token: string, vocab: Set<string>): string {
  const t = token.toLowerCase();
  if (t.length < 4 || isModelLike(t) || vocab.has(t)) return t;

  let best = t;
  let bestDist = 99;
  const maxDist = t.length >= 7 ? 2 : 1;

  for (const word of vocab) {
    if (Math.abs(word.length - t.length) > maxDist) continue;
    const d = levenshtein(t, word);
    if (d > 0 && d <= maxDist && d < bestDist) {
      best = word;
      bestDist = d;
    }
  }

  return best;
}

export async function correctQueryTokens(tokens: string[]): Promise<string[]> {
  const vocab = await getCatalogVocabulary();
  return tokens.map((token) => correctToken(token, vocab));
}
