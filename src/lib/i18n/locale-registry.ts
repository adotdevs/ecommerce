import { connectDB } from "@/lib/db/mongoose";
import { SiteSettings } from "@/models";
import {
  defaultLocale,
  localeConfig as builtInLocaleConfig,
  defaultLanguages,
  type LanguageEntry,
} from "@/config/locales";

export type { LanguageEntry };

export async function getSiteLanguages(): Promise<LanguageEntry[]> {
  try {
    await connectDB();
    const settings = await SiteSettings.findOne({ key: "global" })
      .select("languages defaultLanguage")
      .lean();
    if (settings?.languages?.length) {
      return settings.languages.map((l) => ({
        code: l.code,
        label: l.label,
        nativeLabel: l.nativeLabel ?? l.label,
        dir: (l.dir as "ltr" | "rtl") ?? guessDir(l.code),
        enabled: l.enabled !== false,
      }));
    }
  } catch {
    /* fall through */
  }
  return defaultLanguages;
}

export async function getEnabledLocaleCodes(): Promise<string[]> {
  const langs = await getSiteLanguages();
  return langs.filter((l) => l.enabled !== false).map((l) => l.code);
}

export async function getTranslationTargetLocales(
  sourceLocale = defaultLocale
): Promise<string[]> {
  const enabled = await getEnabledLocaleCodes();
  return enabled.filter((code) => code !== sourceLocale);
}

export function getLocaleMeta(code: string): LanguageEntry {
  const builtIn = builtInLocaleConfig[code as keyof typeof builtInLocaleConfig];
  if (builtIn) {
    return {
      code,
      label: builtIn.label,
      nativeLabel: builtIn.nativeLabel,
      dir: builtIn.dir,
      enabled: true,
    };
  }
  return {
    code,
    label: code.toUpperCase(),
    nativeLabel: code.toUpperCase(),
    dir: guessDir(code),
    enabled: true,
  };
}

function guessDir(code: string): "ltr" | "rtl" {
  return ["ar", "ur", "he", "fa"].includes(code.split("-")[0] ?? code)
    ? "rtl"
    : "ltr";
}
