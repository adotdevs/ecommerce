import { defaultLocale, type Locale } from "@/config/locales";
import {
  applyTranslationsToObject,
  collectTranslatableStrings,
} from "@/lib/i18n/content-translations";
import { translateTexts, type TranslationProvider } from "@/lib/i18n/translate";
import { readMessageFile, writeMessageFile } from "@/lib/i18n/ui-messages";

export const PAYMENT_VERIFICATION_ROOT = "checkout.paymentVerification";

const FIELD_LABELS: Record<string, string> = {
  merchantDefault: "Default merchant name",
  authenticateTitle: "Page title",
  otpIntroLine1: "Intro line 1",
  otpIntroLine2: "Intro line 2 (use {phoneHint})",
  otpIntroLine3: "Intro line 3",
  otpLabel: "OTP field label",
  otpErrorTitle: "Error title",
  otpError: "Error message",
  confirm: "Confirm button",
  resendCode: "Resend code link",
  cancel: "Cancel link",
  learnMoreTitle: "Learn more accordion title",
  learnMoreBody: "Learn more accordion body",
  needHelpTitle: "Need help accordion title",
  needHelpBody: "Need help accordion body",
  merchant: "Merchant label",
  amount: "Amount label",
  date: "Date label",
  card: "Card number label",
  "programBadge.mastercard": "Mastercard badge",
  "programBadge.visa": "Visa badge",
  "programBadge.amex": "Amex badge",
  "programBadge.discover": "Discover badge",
  "programBadge.unionpay": "UnionPay badge",
  "programBadge.unknown": "Unknown brand badge",
  "programs.mastercard": "Mastercard program name",
  "programs.visa": "Visa program name",
  "programs.amex": "Amex program name",
  "programs.discover": "Discover program name",
  "programs.unionpay": "UnionPay program name",
  "programs.unknown": "Unknown program name",
  "brandNames.mastercard": "Mastercard brand name",
  "brandNames.visa": "Visa brand name",
  "brandNames.amex": "Amex brand name",
  "brandNames.discover": "Discover brand name",
  "brandNames.unionpay": "UnionPay brand name",
  "brandNames.unknown": "Unknown brand name",
};

function getNested(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function getByDotPath(obj: Record<string, unknown>, dotPath: string): string {
  const val = getNested(obj, dotPath);
  return typeof val === "string" ? val : "";
}

async function readPaymentVerificationBlock(
  locale: string
): Promise<Record<string, unknown>> {
  const messages = await readMessageFile(locale);
  const block = getNested(messages, PAYMENT_VERIFICATION_ROOT);
  return block && typeof block === "object"
    ? (block as Record<string, unknown>)
    : {};
}

export interface PaymentVerificationField {
  key: string;
  label: string;
  source: string;
  path: string;
}

export interface PaymentVerificationEntry extends PaymentVerificationField {
  translations: Record<string, string>;
}

export async function getPaymentVerificationCatalog(): Promise<{
  fields: PaymentVerificationField[];
  totalKeys: number;
}> {
  const sourceBlock = await readPaymentVerificationBlock(defaultLocale);
  const flat = collectTranslatableStrings(sourceBlock);

  const fields = flat.map((f) => ({
    key: f.path,
    label: FIELD_LABELS[f.path] ?? f.path,
    source: f.value,
    path: `${PAYMENT_VERIFICATION_ROOT}.${f.path}`,
  }));

  return { fields, totalKeys: fields.length };
}

export async function getPaymentVerificationForLocales(
  locales: string[]
): Promise<PaymentVerificationEntry[]> {
  const { fields } = await getPaymentVerificationCatalog();
  const localeBlocks = await Promise.all(
    locales.map(async (locale) => ({
      locale,
      block: await readPaymentVerificationBlock(locale),
    }))
  );

  return fields.map((field) => {
    const translations: Record<string, string> = {};
    for (const { locale, block } of localeBlocks) {
      const val = getByDotPath(block, field.key);
      if (val.trim()) translations[locale] = val;
    }
    return { ...field, translations };
  });
}

export async function savePaymentVerificationLocale(
  locale: string,
  values: Record<string, string>
): Promise<{ saved: number; locale: string }> {
  if (locale === defaultLocale) {
    throw new Error("English is the source language — edit messages/en.json directly.");
  }

  const messages = await readMessageFile(locale);
  const checkout =
    messages.checkout && typeof messages.checkout === "object"
      ? ({ ...(messages.checkout as Record<string, unknown>) } as Record<
          string,
          unknown
        >)
      : {};

  const existingBlock =
    checkout.paymentVerification &&
    typeof checkout.paymentVerification === "object"
      ? (checkout.paymentVerification as Record<string, unknown>)
      : {};

  const pathMap: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== "string") continue;
    pathMap[key] = value.trim();
  }

  checkout.paymentVerification = applyTranslationsToObject(
    existingBlock,
    pathMap
  );
  messages.checkout = checkout;
  await writeMessageFile(locale, messages);

  return { saved: Object.keys(pathMap).length, locale };
}

export async function translatePaymentVerificationToLocale(
  targetLocale: Locale,
  sourceLocale: Locale = defaultLocale,
  provider?: TranslationProvider
): Promise<{ translated: number; locale: string }> {
  if (targetLocale === sourceLocale) {
    return { translated: 0, locale: targetLocale };
  }

  const sourceBlock = await readPaymentVerificationBlock(sourceLocale);
  const fields = collectTranslatableStrings(sourceBlock);
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

  await savePaymentVerificationLocale(targetLocale, pathMap);
  return { translated: fields.length, locale: targetLocale };
}

export function paymentVerificationCoverage(
  entries: PaymentVerificationEntry[],
  locale: string
): { translated: number; total: number; percent: number } {
  const total = entries.length;
  const translated = entries.filter((e) => e.translations[locale]?.trim()).length;
  const percent = total > 0 ? Math.round((translated / total) * 100) : 0;
  return { translated, total, percent };
}
