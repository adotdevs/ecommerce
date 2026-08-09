export type SupportedCardBrand =
  | "visa"
  | "mastercard"
  | "amex"
  | "discover"
  | "unionpay";

export type CardBrand = SupportedCardBrand | "diners" | "jcb" | "unknown";

export const SUPPORTED_CARD_BRANDS: SupportedCardBrand[] = [
  "visa",
  "mastercard",
  "amex",
  "discover",
  "unionpay",
];

export const CARD_BRAND_LOGOS: Record<
  SupportedCardBrand,
  { src: string; alt: string }
> = {
  visa: { src: "/payments/visa.svg", alt: "Visa" },
  mastercard: { src: "/payments/mastercard.svg", alt: "Mastercard" },
  amex: { src: "/payments/amex.svg", alt: "American Express" },
  discover: { src: "/payments/discover.svg", alt: "Discover" },
  unionpay: { src: "/payments/unionpay.svg", alt: "UnionPay" },
};

export const SUPPORTED_CARD_LOGOS = SUPPORTED_CARD_BRANDS.map((brand) => ({
  brand,
  ...CARD_BRAND_LOGOS[brand],
}));

const BRAND_LENGTHS: Record<CardBrand, number[]> = {
  visa: [16, 19],
  mastercard: [16],
  amex: [15],
  discover: [16, 19],
  unionpay: [16, 17, 18, 19],
  diners: [14, 16, 19],
  jcb: [16, 19],
  unknown: [13, 14, 15, 16, 17, 18, 19],
};

/** Discover co-branded BIN ranges that also start with 62. */
const DISCOVER_62_RANGE =
  /^622(?:12[6-9]|1[3-9]\d|[2-8]\d{2}|9[01]\d|92[0-5])/;

export function cardDigits(cardNumber: string): string {
  return cardNumber.replace(/\D/g, "");
}

export function detectCardBrand(digits: string): CardBrand {
  if (!digits) return "unknown";
  if (/^4/.test(digits)) return "visa";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^3(?:0[0-5]|[68])/.test(digits)) return "diners";
  if (/^35(?:2[89]|[3-8]\d)/.test(digits)) return "jcb";
  if (/^(?:6011|65|64[4-9])/.test(digits)) return "discover";
  if (DISCOVER_62_RANGE.test(digits)) return "discover";
  if (/^62/.test(digits)) return "unionpay";
  if (/^(?:5[1-5]|2(?:2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) {
    return "mastercard";
  }
  return "unknown";
}

/** Standard digit count shown in the input for each network. */
const PRIMARY_CARD_LENGTH: Record<CardBrand, number> = {
  visa: 16,
  mastercard: 16,
  amex: 15,
  discover: 16,
  unionpay: 19,
  diners: 16,
  jcb: 16,
  unknown: 19,
};

export function primaryCardDigits(brand: CardBrand): number {
  return PRIMARY_CARD_LENGTH[brand];
}

export function maxCardDigits(brand: CardBrand): number {
  return Math.max(...BRAND_LENGTHS[brand]);
}

export function cvvLength(brand: CardBrand): number {
  return brand === "amex" ? 4 : 3;
}

export function passesLuhn(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let doubleDigit = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

export function isSupportedBrand(brand: CardBrand): brand is SupportedCardBrand {
  return SUPPORTED_CARD_BRANDS.includes(brand as SupportedCardBrand);
}

export function isValidCardNumberLength(digits: string, brand: CardBrand): boolean {
  return BRAND_LENGTHS[brand].includes(digits.length);
}

export function isValidCardNumber(cardNumber: string): boolean {
  const digits = cardDigits(cardNumber);
  if (digits.length < 13) return false;
  const brand = detectCardBrand(digits);
  if (isSupportedBrand(brand)) {
    return digits.length === primaryCardDigits(brand);
  }
  return digits.length >= 13 && digits.length <= 19;
}

export function formatCardNumber(value: string, brand?: CardBrand): string {
  const raw = cardDigits(value);
  const resolvedBrand = brand ?? detectCardBrand(raw);
  const maxLen = primaryCardDigits(resolvedBrand);
  const digits = raw.slice(0, maxLen);

  if (resolvedBrand === "amex") {
    const p1 = digits.slice(0, 4);
    const p2 = digits.slice(4, 10);
    const p3 = digits.slice(10, 15);
    return [p1, p2, p3].filter(Boolean).join(" ");
  }

  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function parseExpiry(expiry: string): { month: number; year: number } | null {
  const match = expiry.trim().match(/^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/);
  if (!match) return null;
  return {
    month: Number(match[1]),
    year: 2000 + Number(match[2]),
  };
}

export function isExpiryFormatValid(expiry: string): boolean {
  return parseExpiry(expiry) !== null;
}

export function isExpiryExpired(expiry: string): boolean {
  const parsed = parseExpiry(expiry);
  if (!parsed) return false;
  const now = new Date();
  const expiryEnd = new Date(parsed.year, parsed.month, 0, 23, 59, 59, 999);
  return expiryEnd < now;
}

export function isExpiryValid(expiry: string): boolean {
  return isExpiryFormatValid(expiry) && !isExpiryExpired(expiry);
}

export type CardExpiryErrorKey = "invalidExpiry" | "cardExpired";

export function getExpiryErrorKey(expiry: string): CardExpiryErrorKey | null {
  if (!expiry.trim()) return null;
  if (!/^\d{2}\s*\/\s*\d{2}$/.test(expiry.trim())) {
    return expiry.replace(/\D/g, "").length >= 4 ? "invalidExpiry" : null;
  }
  if (!isExpiryFormatValid(expiry)) return "invalidExpiry";
  if (isExpiryExpired(expiry)) return "cardExpired";
  return null;
}

export function isValidCvv(cvv: string, brand: CardBrand = "unknown"): boolean {
  const len = cvvLength(brand);
  return new RegExp(`^\\d{${len}}$`).test(cvv.trim());
}

export function isValidCardName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && /^[\p{L}\s'.-]+$/u.test(trimmed);
}

export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function maskCardNumber(cardNumber: string): string {
  const digits = cardDigits(cardNumber);
  if (digits.length < 4) return "****";
  return `**** ${digits.slice(-4)}`;
}

export type CardFieldErrorKey =
  | "required"
  | "unsupportedCard"
  | "invalidExpiry"
  | "cardExpired"
  | "invalidCvv"
  | "invalidCardName";

export function getCardNumberErrorKey(_cardNumber: string): CardFieldErrorKey | null {
  return null;
}

export function getLiveCardFieldErrors(form: {
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cardCvv: string;
}): Partial<Record<"cardNumber" | "cardName" | "cardExpiry" | "cardCvv", CardFieldErrorKey>> {
  const errors: Partial<
    Record<"cardNumber" | "cardName" | "cardExpiry" | "cardCvv", CardFieldErrorKey>
  > = {};

  const digits = cardDigits(form.cardNumber);
  const brand = detectCardBrand(digits);

  if (form.cardName.trim() && !isValidCardName(form.cardName)) {
    errors.cardName = "invalidCardName";
  }

  const expiryError = getExpiryErrorKey(form.cardExpiry);
  if (expiryError) errors.cardExpiry = expiryError;

  if (form.cardCvv.trim()) {
    const expectedLen = cvvLength(brand);
    if (form.cardCvv.length >= expectedLen && !isValidCvv(form.cardCvv, brand)) {
      errors.cardCvv = "invalidCvv";
    }
  }

  return errors;
}

export function getCardFieldErrors(form: {
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cardCvv: string;
}): Partial<Record<"cardNumber" | "cardName" | "cardExpiry" | "cardCvv", CardFieldErrorKey>> {
  const errors: Partial<
    Record<"cardNumber" | "cardName" | "cardExpiry" | "cardCvv", CardFieldErrorKey>
  > = {};

  if (!isValidCardNumber(form.cardNumber)) {
    errors.cardNumber = "required";
  }

  if (!form.cardName.trim()) {
    errors.cardName = "required";
  } else if (!isValidCardName(form.cardName)) {
    errors.cardName = "invalidCardName";
  }

  if (!isExpiryFormatValid(form.cardExpiry)) {
    errors.cardExpiry = "invalidExpiry";
  } else if (isExpiryExpired(form.cardExpiry)) {
    errors.cardExpiry = "cardExpired";
  }

  const brand = detectCardBrand(cardDigits(form.cardNumber));
  if (!isValidCvv(form.cardCvv, brand)) {
    errors.cardCvv = "invalidCvv";
  }

  return errors;
}
