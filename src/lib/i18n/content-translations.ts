import { defaultLocale, type Locale } from "@/config/locales";
import { translateTexts } from "@/lib/i18n/translate";
import { getTranslationTargetLocales } from "@/lib/i18n/locale-registry";

export interface TranslatableField {
  path: string;
  value: string;
}

const SKIP_KEYS = new Set([
  "href",
  "image",
  "icon",
  "limit",
  "layout",
  "backgroundColor",
  "textColor",
  "overlay",
  "productLinks",
  "categoryLinks",
  "productLink",
  "categoryLink",
  "selectionMode",
  "slug",
  "_id",
  "id",
  "sku",
  "type",
  "mode",
  "endsAt",
  "ctaHref",
  "exploreNewHref",
  "viewAllHref",
  "heroImage",
  "preset",
  "variant",
  "showNewBadge",
]);

/** Collect dot-paths of all string leaves in an object (skips URLs and image paths) */
export function collectTranslatableStrings(
  obj: unknown,
  prefix = "",
  skipKeys = SKIP_KEYS
): TranslatableField[] {
  const results: TranslatableField[] = [];

  if (obj === null || obj === undefined) return results;

  if (typeof obj === "string") {
    if (prefix && obj.trim() && !isUrl(obj)) {
      results.push({ path: prefix, value: obj });
    }
    return results;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      results.push(...collectTranslatableStrings(item, `${prefix}[${i}]`, skipKeys));
    });
    return results;
  }

  if (typeof obj === "object") {
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (skipKeys.has(key)) continue;
      const path = prefix ? `${prefix}.${key}` : key;
      results.push(...collectTranslatableStrings(val, path, skipKeys));
    }
  }

  return results;
}

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s) || s.startsWith("/");
}

/** Apply translated strings back onto a deep clone using dot/bracket paths */
export function applyTranslationsToObject(
  obj: Record<string, unknown>,
  translated: Record<string, string>
): Record<string, unknown> {
  const clone = structuredClone(obj);

  for (const [path, text] of Object.entries(translated)) {
    setByPath(clone, path, text);
  }

  return clone;
}

function setByPath(obj: Record<string, unknown>, path: string, value: string) {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let current: unknown = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const idx = Number(key);
    if (Array.isArray(current) && !Number.isNaN(idx)) {
      current = current[idx];
    } else if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[key];
    }
  }

  const last = parts[parts.length - 1];
  const lastIdx = Number(last);

  if (Array.isArray(current) && !Number.isNaN(lastIdx)) {
    current[lastIdx] = value;
  } else if (current && typeof current === "object") {
    (current as Record<string, unknown>)[last] = value;
  }
}

/** Deep merge locale overlay onto base config (strings only from overlay) */
export function mergeLocalizedConfig(
  base: Record<string, unknown>,
  overlay?: Record<string, unknown>
): Record<string, unknown> {
  if (!overlay) return structuredClone(base);
  return deepMergeStrings(base, overlay) as Record<string, unknown>;
}

function deepMergeStrings(
  base: unknown,
  overlay: unknown
): unknown {
  if (overlay === null || overlay === undefined) return base;
  if (typeof overlay === "string") return overlay;
  if (Array.isArray(base) && Array.isArray(overlay)) {
    return base.map((item, i) => deepMergeStrings(item, overlay[i]));
  }
  if (typeof base === "object" && typeof overlay === "object" && base && overlay) {
    const result = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(overlay as Record<string, unknown>)) {
      result[k] = deepMergeStrings(
        (base as Record<string, unknown>)[k],
        v
      ) as unknown;
    }
    return result;
  }
  return base;
}

export async function translateConfigToAllLocales(
  config: Record<string, unknown>,
  sourceLocale: Locale = defaultLocale
): Promise<Partial<Record<Locale, Record<string, unknown>>>> {
  const fields = collectTranslatableStrings(config);
  if (fields.length === 0) return {};

  const targetLocales = await getTranslationTargetLocales(sourceLocale);
  const result: Partial<Record<Locale, Record<string, unknown>>> = {};

  for (const locale of targetLocales) {
    const translatedValues = await translateTexts(
      fields.map((f) => f.value),
      locale,
      sourceLocale
    );

    const pathMap: Record<string, string> = {};
    fields.forEach((f, i) => {
      const translated = translatedValues[i]?.trim();
      pathMap[f.path] = translated || f.value;
    });

    result[locale] = applyTranslationsToObject(config, pathMap);
  }

  return result;
}

export async function translateAndPersistContentKeys(
  items: { namespace: string; key: string; sourceText: string }[],
  sourceLocale: Locale = defaultLocale
) {
  const { ContentTranslation } = await import("@/models/ContentTranslation");
  const targetLocales = await getTranslationTargetLocales(sourceLocale);

  for (const item of items) {
    const translations: Partial<Record<Locale, string>> = {};

    for (const locale of targetLocales) {
      translations[locale] = await translateTexts(
        [item.sourceText],
        locale,
        sourceLocale
      ).then(([t]) => t);
    }

    await ContentTranslation.findOneAndUpdate(
      { namespace: item.namespace, key: item.key },
      {
        sourceLocale,
        sourceText: item.sourceText,
        translations,
        autoTranslated: true,
        lastTranslatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  }
}
