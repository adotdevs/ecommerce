import { PAYMENT_METHODS } from "@/lib/checkout/constants";
import type {
  CheckoutFieldErrors,
  CheckoutFormState,
  CheckoutPaymentMethod,
  CheckoutStep,
} from "@/lib/checkout/types";

export function splitFullName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7;
}

export function isValidCardNumber(cardNumber: string) {
  const digits = cardNumber.replace(/\s/g, "");
  return /^\d{13,19}$/.test(digits);
}

export function isValidExpiry(expiry: string) {
  return /^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(expiry.trim());
}

export function isValidCvv(cvv: string) {
  return /^\d{3,4}$/.test(cvv.trim());
}

export function maskCardNumber(cardNumber: string) {
  const digits = cardNumber.replace(/\s/g, "");
  if (digits.length < 4) return "****";
  return `**** ${digits.slice(-4)}`;
}

export function mapPaymentToApi(method: CheckoutPaymentMethod) {
  return PAYMENT_METHODS.find((m) => m.id === method)?.apiValue ?? "bank_transfer";
}

export function getPaymentLabelKey(method: CheckoutPaymentMethod) {
  return PAYMENT_METHODS.find((m) => m.id === method)?.labelKey ?? "card";
}

export function validateShippingStep(form: CheckoutFormState): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  if (!isValidEmail(form.email)) errors.email = "invalidEmail";
  if (!form.fullName.trim()) errors.fullName = "required";
  if (!isValidPhone(form.phone)) errors.phone = "invalidPhone";
  if (!form.street.trim()) errors.street = "required";
  if (!form.city.trim()) errors.city = "required";
  if (!form.state.trim()) errors.state = "required";
  if (!form.postalCode.trim()) errors.postalCode = "required";
  if (!form.country.trim()) errors.country = "required";
  return errors;
}

export function validatePaymentStep(form: CheckoutFormState): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  if (form.paymentMethod === "card") {
    if (!isValidCardNumber(form.cardNumber)) errors.cardNumber = "invalidCard";
    if (!form.cardName.trim()) errors.cardName = "required";
    if (!isValidExpiry(form.cardExpiry)) errors.cardExpiry = "invalidExpiry";
    if (!isValidCvv(form.cardCvv)) errors.cardCvv = "invalidCvv";
  }
  if (!form.billingSameAsShipping) {
    if (!form.billingFullName.trim()) errors.billingFullName = "required";
    if (!form.billingStreet.trim()) errors.billingStreet = "required";
    if (!form.billingCity.trim()) errors.billingCity = "required";
    if (!form.billingState.trim()) errors.billingState = "required";
    if (!form.billingPostalCode.trim()) errors.billingPostalCode = "required";
    if (!form.billingCountry.trim()) errors.billingCountry = "required";
  }
  return errors;
}

export function stepIndex(step: CheckoutStep) {
  if (step === "shipping") return 0;
  if (step === "payment") return 1;
  if (step === "review") return 2;
  return 3;
}
