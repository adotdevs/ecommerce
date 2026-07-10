/**
 * Unified translation layer.
 *
 * Providers (TRANSLATION_PROVIDER env or per-request override):
 * - openai — uses OPENAI_API_KEY (best quality)
 * - mymemory (default) — free MyMemory API
 * - google — GOOGLE_TRANSLATE_API_KEY
 * - none — manual only
 */

import { openAiChatJson } from "@/lib/ai/openai-client";

export type TranslationProvider = "openai" | "mymemory" | "google" | "none";

export const TRANSLATION_PROVIDER_OPTIONS: {
  id: TranslationProvider;
  label: string;
  description: string;
  requiresKey?: string;
}[] = [
  {
    id: "openai",
    label: "OpenAI",
    description: "Best quality — uses OPENAI_API_KEY",
    requiresKey: "OPENAI_API_KEY",
  },
  {
    id: "mymemory",
    label: "MyMemory (free)",
    description: "Free tier, no credit card",
  },
  {
    id: "google",
    label: "Google Cloud Translation",
    description: "Requires GOOGLE_TRANSLATE_API_KEY",
    requiresKey: "GOOGLE_TRANSLATE_API_KEY",
  },
  {
    id: "none",
    label: "Manual only",
    description: "No auto-translate",
  },
];

function resolveProvider(override?: TranslationProvider): TranslationProvider {
  if (override) return resolveProviderAvailability(override);
  const env = (process.env.TRANSLATION_PROVIDER ?? "").toLowerCase();
  if (env === "openai") return resolveProviderAvailability("openai");
  if (env === "google") return resolveProviderAvailability("google");
  if (env === "none") return "none";
  if (env === "mymemory") return resolveProviderAvailability("mymemory");
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  return "mymemory";
}

function resolveProviderAvailability(
  provider: TranslationProvider
): TranslationProvider {
  if (provider === "openai") {
    return process.env.OPENAI_API_KEY?.trim() ? "openai" : "mymemory";
  }
  if (provider === "google") {
    return process.env.GOOGLE_TRANSLATE_API_KEY ? "google" : "mymemory";
  }
  return provider;
}

export function getTranslationProvider(): TranslationProvider {
  return resolveProvider();
}

export function getAvailableTranslationProviders(): TranslationProvider[] {
  const available: TranslationProvider[] = [];
  if (process.env.OPENAI_API_KEY?.trim()) available.push("openai");
  available.push("mymemory");
  if (process.env.GOOGLE_TRANSLATE_API_KEY) available.push("google");
  available.push("none");
  return available;
}

export function isAutoTranslationAvailable(
  providerOverride?: TranslationProvider
): boolean {
  return resolveProvider(providerOverride) !== "none";
}

export function getTranslationProviderLabel(
  providerOverride?: TranslationProvider
): string {
  const p = resolveProvider(providerOverride);
  if (p === "openai") return "OpenAI";
  if (p === "google") return "Google Cloud Translation";
  if (p === "mymemory") return "MyMemory (free)";
  return "Manual only";
}

const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  ar: "Arabic",
  ur: "Urdu",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  hi: "Hindi",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
};

const MYMEMORY_LOCALE: Record<string, string> = {
  en: "en",
  ar: "ar",
  ur: "ur-PK",
  fr: "fr",
  de: "de",
  es: "es",
};

async function translateWithOpenAI(
  texts: string[],
  targetLang: string,
  sourceLang: string
): Promise<string[]> {
  if (!texts.length) return texts;

  const targetName = LOCALE_NAMES[targetLang] ?? targetLang;
  const sourceName = LOCALE_NAMES[sourceLang] ?? sourceLang;

  const parsed = await openAiChatJson<{ translations: string[] }>(
    `You are a professional e-commerce translator. Translate each string from ${sourceName} to ${targetName}. Preserve brand names, SKUs, numbers, and units. Return JSON: { "translations": string[] } with the same number of items as input, in the same order. No markdown.`,
    JSON.stringify({ texts }),
    { temperature: 0.2 }
  );

  if (
    parsed?.translations &&
    Array.isArray(parsed.translations) &&
    parsed.translations.length === texts.length
  ) {
    return parsed.translations.map((t, i) => String(t || texts[i]));
  }

  const results: string[] = [];
  for (const text of texts) {
    const single = await openAiChatJson<{ translation: string }>(
      `Translate e-commerce text from ${sourceName} to ${targetName}. Return JSON: { "translation": string }.`,
      text,
      { temperature: 0.2 }
    );
    results.push(single?.translation ? String(single.translation) : text);
  }
  return results;
}

async function translateWithMyMemory(
  text: string,
  targetLang: string,
  sourceLang: string
): Promise<string> {
  if (!text.trim()) return text;

  const src = MYMEMORY_LOCALE[sourceLang] ?? sourceLang;
  const tgt = MYMEMORY_LOCALE[targetLang] ?? targetLang;
  const params = new URLSearchParams({
    q: text,
    langpair: `${src}|${tgt}`,
  });

  const email = process.env.MYMEMORY_EMAIL;
  if (email) params.set("de", email);

  const res = await fetch(
    `https://api.mymemory.translated.net/get?${params.toString()}`
  );

  if (!res.ok) {
    throw new Error(`MyMemory translation failed (${res.status})`);
  }

  const data = (await res.json()) as {
    responseStatus?: number;
    responseDetails?: string;
    responseData?: { translatedText?: string };
  };

  if (data.responseStatus && data.responseStatus !== 200) {
    throw new Error(
      data.responseDetails ??
        "MyMemory daily limit reached — try OpenAI or set MYMEMORY_EMAIL"
    );
  }

  const translated = data.responseData?.translatedText?.trim();
  if (!translated) {
    throw new Error("MyMemory returned an empty translation");
  }

  return translated;
}

async function translateWithGoogle(
  texts: string[],
  targetLang: string,
  sourceLang: string
): Promise<string[]> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return texts;

  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: texts,
        target: targetLang,
        source: sourceLang,
        format: "text",
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Translate failed: ${err}`);
  }

  const data = (await res.json()) as {
    data: { translations: { translatedText: string }[] };
  };

  return data.data.translations.map((t) => t.translatedText);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function translateTexts(
  texts: string[],
  targetLang: string,
  sourceLang = "en",
  providerOverride?: TranslationProvider
): Promise<string[]> {
  if (texts.length === 0) return texts;

  const provider = resolveProvider(providerOverride);
  if (provider === "none") return texts;

  if (provider === "openai") {
    const batchSize = 20;
    const results: string[] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const chunk = texts.slice(i, i + batchSize);
      const translated = await translateWithOpenAI(chunk, targetLang, sourceLang);
      results.push(...translated);
      if (i + batchSize < texts.length) await delay(200);
    }
    return results;
  }

  if (provider === "google") {
    return translateWithGoogle(texts, targetLang, sourceLang);
  }

  const results: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    if (i > 0) await delay(350);
    results.push(await translateWithMyMemory(texts[i], targetLang, sourceLang));
  }
  return results;
}

export async function translateText(
  text: string,
  targetLang: string,
  sourceLang = "en",
  providerOverride?: TranslationProvider
): Promise<string> {
  const [result] = await translateTexts(
    [text],
    targetLang,
    sourceLang,
    providerOverride
  );
  return result ?? text;
}

/** @deprecated use isAutoTranslationAvailable */
export function isTranslationConfigured(): boolean {
  return isAutoTranslationAvailable();
}
