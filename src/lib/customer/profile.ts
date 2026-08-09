import type { IUser, IUserAddress } from "@/models/User";

export interface CustomerAddressResponse {
  _id: string;
  label: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

export interface CustomerProfileResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  addresses: CustomerAddressResponse[];
  preferences: {
    locale?: string;
    currency?: string;
    country?: string;
    emailOffers?: boolean;
  };
}

type AddressLike = IUserAddress & {
  _id?: unknown;
  toObject?: () => IUserAddress & { _id?: unknown };
};

function serializeAddress(address: AddressLike): CustomerAddressResponse {
  const plain =
    typeof address.toObject === "function" ? address.toObject() : address;

  return {
    _id: String(plain._id ?? ""),
    label: plain.label?.trim() || "Home",
    firstName: plain.firstName?.trim() ?? "",
    lastName: plain.lastName?.trim() ?? "",
    street: plain.street?.trim() ?? "",
    city: plain.city?.trim() ?? "",
    state: plain.state?.trim() ?? "",
    postalCode: plain.postalCode?.trim() ?? "",
    country: plain.country?.trim().toUpperCase() ?? "",
    phone: plain.phone?.trim() || undefined,
    isDefault: plain.isDefault ?? false,
  };
}

export function toCustomerProfile(user: IUser): CustomerProfileResponse {
  return {
    id: String(user._id),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    addresses: (user.addresses ?? []).map((address) =>
      serializeAddress(address as AddressLike)
    ),
    preferences: {
      locale: user.preferences?.locale,
      currency: user.preferences?.currency,
      country: user.preferences?.country,
      emailOffers: user.preferences?.emailOffers ?? false,
    },
  };
}

export function hasAddressDetails(address: CustomerAddressResponse): boolean {
  return Boolean(
    address.street ||
      address.city ||
      address.state ||
      address.postalCode ||
      address.firstName ||
      address.lastName
  );
}
