import {
  getAddressFieldConfig,
  isValidPostalForCountry,
  isValidRegionForCountry,
  normalizeAddressForCountry,
} from "@/lib/checkout/address-fields";
import {
  isValidPhoneForCountry,
  normalizePhoneForCountry,
} from "@/lib/checkout/phone-fields";
import { PAYMENT_METHODS } from "@/lib/checkout/constants";
import {
  getCardFieldErrors,
  isExpiryValid,
  isValidCardNumber,
} from "@/lib/checkout/card-validation";
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

export function isValidPhoneForCountryCode(
  countryCode: string,
  phone: string
): boolean {
  return isValidPhoneForCountry(countryCode, phone);
}

export {
  cardDigits,
  cvvLength,
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  getCardFieldErrors,
  getExpiryErrorKey,
  getLiveCardFieldErrors,
  isExpiryValid,
  isSupportedBrand,
  isValidCardName,
  isValidCardNumber,
  isValidCvv,
  maskCardNumber,
  primaryCardDigits,
  SUPPORTED_CARD_BRANDS,
  SUPPORTED_CARD_LOGOS,
  CARD_BRAND_LOGOS,
} from "@/lib/checkout/card-validation";

/** @deprecated Use isExpiryValid */
export function isValidExpiry(expiry: string) {
  return isExpiryValid(expiry);
}

export function mapPaymentToApi(method: CheckoutPaymentMethod) {
  return PAYMENT_METHODS.find((m) => m.id === method)?.apiValue ?? "bank_transfer";
}

export function getPaymentLabelKey(method: CheckoutPaymentMethod) {
  return PAYMENT_METHODS.find((m) => m.id === method)?.labelKey ?? "card";
}

export function validateShippingStep(form: CheckoutFormState): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  const country = form.country;
  const config = getAddressFieldConfig(country);

  if (!isValidEmail(form.email)) errors.email = "invalidEmail";
  if (!form.fullName.trim()) errors.fullName = "required";
  if (!isValidPhoneForCountry(form.phoneCountryCode || country, form.phone)) {
    errors.phone = "invalidPhone";
  }
  if (!form.street.trim()) errors.street = "required";
  if (!form.city.trim()) errors.city = "required";

  if (config.region.type !== "none") {
    if (config.region.required && !form.state.trim()) {
      errors.state = "required";
    } else if (form.state.trim() && !isValidRegionForCountry(country, form.state)) {
      errors.state = "invalidState";
    }
  }

  if (config.postalCode.required && !form.postalCode.trim()) {
    errors.postalCode = "required";
  } else if (form.postalCode.trim() && !isValidPostalForCountry(country, form.postalCode)) {
    errors.postalCode = "invalidPostal";
  }

  if (!country.trim()) errors.country = "required";
  return errors;
}

export function validatePaymentStep(form: CheckoutFormState): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  if (form.paymentMethod === "paypal") {
    errors.paymentMethod = "paypalUnavailable";
  }
  if (form.paymentMethod === "card") {
    Object.assign(errors, getCardFieldErrors(form));
  }
  if (!form.billingSameAsShipping) {
    const billingCountry = form.billingCountry || form.country;
    const billingConfig = getAddressFieldConfig(billingCountry);

    if (!form.billingFullName.trim()) errors.billingFullName = "required";
    if (!form.billingStreet.trim()) errors.billingStreet = "required";
    if (!form.billingCity.trim()) errors.billingCity = "required";

    if (billingConfig.region.type !== "none") {
      if (billingConfig.region.required && !form.billingState.trim()) {
        errors.billingState = "required";
      } else if (
        form.billingState.trim() &&
        !isValidRegionForCountry(billingCountry, form.billingState)
      ) {
        errors.billingState = "invalidState";
      }
    }

    if (billingConfig.postalCode.required && !form.billingPostalCode.trim()) {
      errors.billingPostalCode = "required";
    } else if (
      form.billingPostalCode.trim() &&
      !isValidPostalForCountry(billingCountry, form.billingPostalCode)
    ) {
      errors.billingPostalCode = "invalidPostal";
    }
  }
  return errors;
}

export function normalizeCheckoutFormForCountry(
  form: CheckoutFormState,
  countryCode: string
): CheckoutFormState {
  const shipping = normalizeAddressForCountry(countryCode, form.state, form.postalCode);
  const billing = form.billingSameAsShipping
    ? shipping
    : normalizeAddressForCountry(
        countryCode,
        form.billingState,
        form.billingPostalCode
      );

  const phoneCode = form.phoneCountryCode || countryCode;

  return {
    ...form,
    country: countryCode,
    billingCountry: countryCode,
    phoneCountryCode:
      form.phoneCountryCode === form.country ? countryCode : phoneCode,
    state: shipping.state,
    postalCode: shipping.postalCode,
    billingState: billing.state,
    billingPostalCode: billing.postalCode,
    phone: normalizePhoneForCountry(phoneCode, form.phone),
  };
}

export function stepIndex(step: CheckoutStep) {
  if (step === "shipping") return 0;
  if (step === "payment") return 1;
  if (step === "review") return 2;
  return 3;
}

/** Coalesce partial/draft form values so string fields are never undefined. */
export function ensureCheckoutForm(
  form: Partial<CheckoutFormState>,
  fallback: CheckoutFormState
): CheckoutFormState {
  return {
    ...fallback,
    ...form,
    email: form.email ?? fallback.email,
    fullName: form.fullName ?? fallback.fullName,
    phone: form.phone ?? fallback.phone,
    phoneCountryCode: form.phoneCountryCode ?? fallback.phoneCountryCode,
    street: form.street ?? fallback.street,
    apartment: form.apartment ?? fallback.apartment,
    city: form.city ?? fallback.city,
    state: form.state ?? fallback.state,
    postalCode: form.postalCode ?? fallback.postalCode,
    country: form.country ?? fallback.country,
    emailOffers: form.emailOffers ?? fallback.emailOffers,
    saveAddress: form.saveAddress ?? fallback.saveAddress,
    selectedSavedAddressId:
      form.selectedSavedAddressId ?? fallback.selectedSavedAddressId,
    shippingMethod: form.shippingMethod ?? fallback.shippingMethod,
    paymentMethod: form.paymentMethod ?? fallback.paymentMethod,
    cardNumber: form.cardNumber ?? fallback.cardNumber,
    cardName: form.cardName ?? fallback.cardName,
    cardExpiry: form.cardExpiry ?? fallback.cardExpiry,
    cardCvv: form.cardCvv ?? fallback.cardCvv,
    saveCard: form.saveCard ?? fallback.saveCard,
    billingSameAsShipping:
      form.billingSameAsShipping ?? fallback.billingSameAsShipping,
    billingFullName: form.billingFullName ?? fallback.billingFullName,
    billingStreet: form.billingStreet ?? fallback.billingStreet,
    billingCity: form.billingCity ?? fallback.billingCity,
    billingState: form.billingState ?? fallback.billingState,
    billingPostalCode: form.billingPostalCode ?? fallback.billingPostalCode,
    billingCountry: form.billingCountry ?? fallback.billingCountry,
  };
}
