import type { SiteSettingsPublic } from "@/types";

export interface BrandingTokens {
  storeName: string;
  storeTagline: string;
  supportEmail: string;
  supportPhone: string;
  deliveryInfo: string;
}

export function brandingTokensFromSettings(
  settings: SiteSettingsPublic | null | undefined
): BrandingTokens {
  return {
    storeName: settings?.storeName?.trim() ?? "",
    storeTagline: settings?.storeTagline?.trim() ?? "",
    supportEmail: settings?.supportEmail?.trim() ?? "",
    supportPhone: settings?.supportPhone?.trim() ?? "",
    deliveryInfo: settings?.deliveryInfo?.trim() ?? "",
  };
}

/** Replace {storeName}, {supportEmail}, etc. in admin-authored copy. */
export function applyBrandingTokens(
  text: string,
  tokens: BrandingTokens,
  extra?: Record<string, string>
): string {
  if (!text) return text;

  const map: Record<string, string> = {
    storeName: tokens.storeName,
    storeTagline: tokens.storeTagline,
    supportEmail: tokens.supportEmail,
    supportPhone: tokens.supportPhone,
    deliveryInfo: tokens.deliveryInfo,
    ...extra,
  };

  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = map[key];
    return value !== undefined && value !== "" ? value : match;
  });
}

/**
 * Fill `{amount}` and replace leftover hardcoded prices (e.g. `$100`)
 * so announcement copy stays in sync with the free-shipping threshold.
 */
export function applyAnnouncementAmount(text: string, formattedAmount: string): string {
  if (!text) return text;
  const withToken = text.replace(/\{amount\}/gi, formattedAmount);
  return withToken
    .replace(/(?:USD|US\$)\s*\d+(?:[.,]\d+)?/gi, formattedAmount)
    .replace(/\$\s*\d+(?:[.,]\d+)?/g, formattedAmount)
    .replace(/\d+(?:[.,]\d+)?\s*\$/g, formattedAmount);
}

export function applyBrandingTokensDeep<T>(
  value: T,
  tokens: BrandingTokens,
  extra?: Record<string, string>
): T {
  if (typeof value === "string") {
    return applyBrandingTokens(value, tokens, extra) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      applyBrandingTokensDeep(item, tokens, extra)
    ) as T;
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = applyBrandingTokensDeep(nested, tokens, extra);
    }
    return result as T;
  }

  return value;
}
