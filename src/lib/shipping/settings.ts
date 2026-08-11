import type { ShippingMethodId } from "@/lib/checkout/types";

export interface ShippingCountryRule {
  countryCode: string;
  /** When true, all shipping methods are free for this country. */
  shippingOff?: boolean;
  /** Percentage discount applied to shipping (0–100). */
  percentOff?: number;
  standardRateUsd?: number;
  expressRateUsd?: number;
  overnightRateUsd?: number;
  freeShippingThresholdUsd?: number;
}

export interface ShippingSettings {
  standardRateUsd: number;
  expressRateUsd: number;
  overnightRateUsd: number;
  freeShippingThresholdUsd: number;
  countryRules: ShippingCountryRule[];
}

export interface ResolvedShippingRates {
  standardRateUsd: number;
  expressRateUsd: number;
  overnightRateUsd: number;
  freeShippingThresholdUsd: number;
  shippingOff: boolean;
  percentOff: number;
}

export interface ShippingCalculationOptions {
  countryCode?: string;
  config?: ShippingSettings;
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  standardRateUsd: 9.99,
  expressRateUsd: 14.99,
  overnightRateUsd: 29.99,
  freeShippingThresholdUsd: 100,
  countryRules: [],
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function positiveNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export function normalizeShippingSettings(raw: unknown): ShippingSettings {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const countryRules: ShippingCountryRule[] = Array.isArray(source.countryRules)
    ? source.countryRules.flatMap((rule) => {
          if (!rule || typeof rule !== "object") return [];
          const r = rule as Record<string, unknown>;
          const countryCode = String(r.countryCode ?? "")
            .trim()
            .toUpperCase();
          if (!countryCode) return [];
          return [
            {
              countryCode,
              shippingOff: r.shippingOff === true,
              percentOff: clampPercent(Number(r.percentOff ?? 0)),
              standardRateUsd:
                r.standardRateUsd != null
                  ? positiveNumber(
                      r.standardRateUsd,
                      DEFAULT_SHIPPING_SETTINGS.standardRateUsd
                    )
                  : undefined,
              expressRateUsd:
                r.expressRateUsd != null
                  ? positiveNumber(
                      r.expressRateUsd,
                      DEFAULT_SHIPPING_SETTINGS.expressRateUsd
                    )
                  : undefined,
              overnightRateUsd:
                r.overnightRateUsd != null
                  ? positiveNumber(
                      r.overnightRateUsd,
                      DEFAULT_SHIPPING_SETTINGS.overnightRateUsd
                    )
                  : undefined,
              freeShippingThresholdUsd:
                r.freeShippingThresholdUsd != null
                  ? positiveNumber(
                      r.freeShippingThresholdUsd,
                      DEFAULT_SHIPPING_SETTINGS.freeShippingThresholdUsd
                    )
                  : undefined,
            },
          ];
        })
    : [];

  return {
    standardRateUsd: positiveNumber(
      source.standardRateUsd,
      DEFAULT_SHIPPING_SETTINGS.standardRateUsd
    ),
    expressRateUsd: positiveNumber(
      source.expressRateUsd,
      DEFAULT_SHIPPING_SETTINGS.expressRateUsd
    ),
    overnightRateUsd: positiveNumber(
      source.overnightRateUsd,
      DEFAULT_SHIPPING_SETTINGS.overnightRateUsd
    ),
    freeShippingThresholdUsd: positiveNumber(
      source.freeShippingThresholdUsd,
      DEFAULT_SHIPPING_SETTINGS.freeShippingThresholdUsd
    ),
    countryRules,
  };
}

export function resolveShippingRates(
  config: ShippingSettings = DEFAULT_SHIPPING_SETTINGS,
  countryCode?: string
): ResolvedShippingRates {
  const code = countryCode?.trim().toUpperCase();
  const rule = code
    ? config.countryRules.find((entry) => entry.countryCode === code)
    : undefined;

  return {
    standardRateUsd: rule?.standardRateUsd ?? config.standardRateUsd,
    expressRateUsd: rule?.expressRateUsd ?? config.expressRateUsd,
    overnightRateUsd: rule?.overnightRateUsd ?? config.overnightRateUsd,
    freeShippingThresholdUsd:
      rule?.freeShippingThresholdUsd ?? config.freeShippingThresholdUsd,
    shippingOff: rule?.shippingOff === true,
    percentOff: clampPercent(rule?.percentOff ?? 0),
  };
}

function applyShippingDiscount(baseUsd: number, percentOff: number): number {
  const discounted = baseUsd * (1 - percentOff / 100);
  return Math.max(0, Math.round(discounted * 100) / 100);
}

export function calculateShippingUsd(
  subtotalUsd: number,
  method: ShippingMethodId = "standard",
  options?: ShippingCalculationOptions
): number {
  const config = options?.config ?? DEFAULT_SHIPPING_SETTINGS;
  const resolved = resolveShippingRates(config, options?.countryCode);

  if (resolved.shippingOff) return 0;

  let baseUsd: number;
  if (method === "standard") {
    if (subtotalUsd >= resolved.freeShippingThresholdUsd) return 0;
    baseUsd = resolved.standardRateUsd;
  } else if (method === "express") {
    baseUsd = resolved.expressRateUsd;
  } else {
    baseUsd = resolved.overnightRateUsd;
  }

  return applyShippingDiscount(baseUsd, resolved.percentOff);
}

export function resolveFreeShippingThresholdUsd(
  options?: ShippingCalculationOptions
): number {
  const config = options?.config ?? DEFAULT_SHIPPING_SETTINGS;
  return resolveShippingRates(config, options?.countryCode).freeShippingThresholdUsd;
}
