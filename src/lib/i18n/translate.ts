/**
 * Unified translation layer — no paid API required by default.
 *
 * Providers (TRANSLATION_PROVIDER env):
 * - mymemory (default) — free, no credit card; ~5k chars/day without email
 * - google — optional, requires GOOGLE_TRANSLATE_API_KEY + billing
 * - none — manual translations only in admin
 */

export type TranslationProvider = "mymemory" | "google" | "none";

export function getTranslationProvider(): TranslationProvider {
  const p = (process.env.TRANSLATION_PROVIDER ?? "mymemory").toLowerCase();
  if (p === "google" && process.env.GOOGLE_TRANSLATE_API_KEY) return "google";
  if (p === "none") return "none";
  if (p === "google" && !process.env.GOOGLE_TRANSLATE_API_KEY) return "mymemory";
  return "mymemory";
}

export function isAutoTranslationAvailable(): boolean {
  return getTranslationProvider() !== "none";
}

export function getTranslationProviderLabel(): string {
  const p = getTranslationProvider();
  if (p === "google") return "Google Cloud Translation";
  if (p === "mymemory") return "MyMemory (free)";
  return "Manual only";
}

const MYMEMORY_LOCALE: Record<string, string> = {
  en: "en",
  ar: "ar",
  ur: "ur-PK",
  fr: "fr",
  de: "de",
  es: "es",
};

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
      data.responseDetails ?? "MyMemory daily limit reached — try again tomorrow or set MYMEMORY_EMAIL"
    );
  }

  const translated = data.responseData?.translatedText?.trim();
  if (!translated) {
    throw new Error("MyMemory returned an empty translation — rate limit may be reached");
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

/** Small delay to respect free-tier rate limits */
function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function translateTexts(
  texts: string[],
  targetLang: string,
  sourceLang = "en"
): Promise<string[]> {
  if (texts.length === 0) return texts;

  const provider = getTranslationProvider();
  if (provider === "none") return texts;

  if (provider === "google") {
    return translateWithGoogle(texts, targetLang, sourceLang);
  }

  // MyMemory: one request per string (free tier, avoids batch size limits)
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
  sourceLang = "en"
): Promise<string> {
  const [result] = await translateTexts([text], targetLang, sourceLang);
  return result ?? text;
}

/** @deprecated use isAutoTranslationAvailable */
export function isTranslationConfigured(): boolean {
  return isAutoTranslationAvailable();
}
