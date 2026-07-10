import fs from "fs/promises";
import path from "path";
import { defaultLocale, type Locale } from "@/config/locales";
import { translateTexts, type TranslationProvider } from "@/lib/i18n/translate";
import {
  collectTranslatableStrings,
  applyTranslationsToObject,
} from "@/lib/i18n/content-translations";

const MESSAGES_DIR = path.join(process.cwd(), "messages");

export interface FlatMessage {
  namespace: string;
  key: string;
  path: string;
  source: string;
}

export async function readMessageFile(
  locale: string
): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(
      path.join(MESSAGES_DIR, `${locale}.json`),
      "utf-8"
    );
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function writeMessageFile(
  locale: string,
  data: Record<string, unknown>
) {
  await fs.mkdir(MESSAGES_DIR, { recursive: true });
  await fs.writeFile(
    path.join(MESSAGES_DIR, `${locale}.json`),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf-8"
  );
}

/** Flatten nested messages JSON into rows for the admin table. */
export function flattenMessages(
  obj: Record<string, unknown>
): FlatMessage[] {
  const fields = collectTranslatableStrings(obj, "", new Set());
  return fields.map((f) => {
    const dot = f.path.indexOf(".");
    const namespace = dot > 0 ? f.path.slice(0, dot) : f.path;
    const key = dot > 0 ? f.path.slice(dot + 1) : f.path;
    return {
      namespace,
      key,
      path: f.path,
      source: f.value,
    };
  });
}

function getByPath(obj: Record<string, unknown>, dotPath: string): string {
  const parts = dotPath.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : "";
}

export async function getUiTranslationCatalog() {
  const source = await readMessageFile(defaultLocale);
  const flat = flattenMessages(source);

  return {
    sourceLocale: defaultLocale,
    totalKeys: flat.length,
    namespaces: [...new Set(flat.map((f) => f.namespace))].sort(),
    entries: flat,
  };
}

export async function getUiTranslationsForLocales(locales: string[]) {
  const source = await readMessageFile(defaultLocale);
  const flat = flattenMessages(source);

  const localeData: Record<string, Record<string, unknown>> = {};
  await Promise.all(
    locales.map(async (locale) => {
      localeData[locale] = await readMessageFile(locale);
    })
  );

  return flat.map((entry) => {
    const translations: Record<string, string> = {};
    for (const locale of locales) {
      const val = getByPath(localeData[locale], entry.path);
      if (val) translations[locale] = val;
    }
    return { ...entry, translations };
  });
}

export async function translateUiMessagesToLocale(
  targetLocale: Locale,
  sourceLocale: Locale = defaultLocale,
  provider?: TranslationProvider
): Promise<{ translated: number; locale: string }> {
  if (targetLocale === sourceLocale) {
    return { translated: 0, locale: targetLocale };
  }

  const source = await readMessageFile(sourceLocale);
  const fields = collectTranslatableStrings(source, "", new Set());

  if (fields.length === 0) {
    return { translated: 0, locale: targetLocale };
  }

  const translatedValues = await translateTexts(
    fields.map((f) => f.value),
    targetLocale,
    sourceLocale,
    provider
  );

  const pathMap: Record<string, string> = {};
  fields.forEach((f, i) => {
    pathMap[f.path] = translatedValues[i]?.trim() || f.value;
  });

  const result = applyTranslationsToObject(source, pathMap);
  await writeMessageFile(targetLocale, result);

  return { translated: fields.length, locale: targetLocale };
}

export async function translateConfigToLocale(
  config: Record<string, unknown>,
  targetLocale: Locale,
  sourceLocale: Locale = defaultLocale,
  provider?: TranslationProvider
): Promise<Record<string, unknown>> {
  const fields = collectTranslatableStrings(config);
  if (fields.length === 0) return {};

  const translatedValues = await translateTexts(
    fields.map((f) => f.value),
    targetLocale,
    sourceLocale,
    provider
  );

  const pathMap: Record<string, string> = {};
  fields.forEach((f, i) => {
    pathMap[f.path] = translatedValues[i]?.trim() || f.value;
  });

  return applyTranslationsToObject(config, pathMap);
}
