import type { CheckoutPaymentMethod, ShippingMethodId } from "@/lib/checkout/types";

export const SHIPPING_METHODS: {
  id: ShippingMethodId;
  labelKey: string;
  etaKey: string;
}[] = [
  { id: "standard", labelKey: "standard", etaKey: "standardEta" },
  { id: "express", labelKey: "express", etaKey: "expressEta" },
  { id: "overnight", labelKey: "overnight", etaKey: "overnightEta" },
];

export const PAYMENT_METHODS: {
  id: CheckoutPaymentMethod;
  labelKey: string;
  apiValue: "stripe" | "paypal" | "bank_transfer";
  logo?: string;
}[] = [
  { id: "card", labelKey: "card", apiValue: "stripe" },
  { id: "easypaisa", labelKey: "easypaisa", apiValue: "bank_transfer" },
  { id: "jazzcash", labelKey: "jazzcash", apiValue: "bank_transfer" },
  { id: "paypal", labelKey: "paypal", apiValue: "paypal", logo: "/payments/paypal.svg" },
  { id: "cod", labelKey: "cod", apiValue: "bank_transfer" },
];

export const COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "PK", label: "Pakistan" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IN", label: "India" },
  { value: "SA", label: "Saudi Arabia" },
] as const;
