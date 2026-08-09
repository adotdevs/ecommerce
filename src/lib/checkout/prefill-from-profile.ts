import { getPhoneFieldConfig } from "@/lib/checkout/phone-fields";
import type { CustomerAddressResponse, CustomerProfileResponse } from "@/lib/customer/profile";
import type { CheckoutFormState } from "@/lib/checkout/types";

function parseStoredPhone(countryCode: string, phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  const dialDigits = getPhoneFieldConfig(countryCode).dialCode.replace(/\D/g, "");
  if (dialDigits && digits.startsWith(dialDigits)) {
    return digits.slice(dialDigits.length);
  }
  return digits;
}

export function checkoutPatchFromSavedAddress(
  address: CustomerAddressResponse
): Partial<CheckoutFormState> {
  return {
    selectedSavedAddressId: address._id,
    fullName: [address.firstName, address.lastName].filter(Boolean).join(" "),
    street: address.street ?? "",
    apartment: "",
    city: address.city ?? "",
    state: address.state ?? "",
    postalCode: address.postalCode ?? "",
    phoneCountryCode: address.country || "",
    phone: parseStoredPhone(address.country, address.phone),
  };
}

export function prefillCheckoutFromProfile(
  form: CheckoutFormState,
  profile: CustomerProfileResponse
): Partial<CheckoutFormState> {
  const patch: Partial<CheckoutFormState> = {
    email: profile.email,
    emailOffers: profile.preferences.emailOffers ?? form.emailOffers,
  };

  if (profile.firstName || profile.lastName) {
    patch.fullName =
      form.fullName ||
      [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  }

  const defaultAddress =
    profile.addresses.find((address) => address.isDefault) ?? profile.addresses[0];

  if (defaultAddress && !form.street) {
    Object.assign(patch, checkoutPatchFromSavedAddress(defaultAddress));
    if (profile.firstName || profile.lastName) {
      patch.fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
    }
  }

  return patch;
}
