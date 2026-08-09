import { User } from "@/models";

interface ShippingAddressInput {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export async function saveCheckoutAddressForUser(
  userId: string,
  shippingAddress: ShippingAddressInput
) {
  const user = await User.findById(userId);
  if (!user) return;

  const duplicate = user.addresses.find(
    (address) =>
      address.street === shippingAddress.street &&
      address.postalCode === shippingAddress.postalCode &&
      address.country === shippingAddress.country
  );

  user.addresses.forEach((address) => {
    address.isDefault = false;
  });

  if (duplicate) {
    Object.assign(duplicate, {
      ...shippingAddress,
      label: duplicate.label || "Home",
      isDefault: true,
    });
  } else {
    user.addresses.push({
      label: "Home",
      ...shippingAddress,
      isDefault: true,
    });
  }

  await user.save();
}
