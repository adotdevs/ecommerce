import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { User, type IUserAddress } from "@/models/User";
import { withCustomerAuth } from "@/lib/api/authMiddleware";
import { apiError, apiSuccess } from "@/lib/api/response";
import { toCustomerProfile } from "@/lib/customer/profile";

type StoredAddress = IUserAddress & { _id?: { toString(): string } };

const addressPatchSchema = z.object({
  label: z.string().min(1).max(40).optional(),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  street: z.string().min(1).max(200).optional(),
  city: z.string().min(1).max(80).optional(),
  state: z.string().min(1).max(80).optional(),
  postalCode: z.string().min(1).max(20).optional(),
  country: z.string().min(2).max(2).optional(),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

function findAddressById(
  addresses: StoredAddress[],
  addressId: string
): StoredAddress | undefined {
  return addresses.find((address) => String(address._id) === addressId);
}

export const PATCH = withCustomerAuth(async (request, { user, params }) => {
  const addressId = params?.id;
  if (!addressId) return apiError("Address id required", 400);

  await connectDB();
  const body = await request.json();
  const parsed = addressPatchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const doc = await User.findById(user.id);
  if (!doc) return apiError("User not found", 404);

  const addresses = doc.addresses as StoredAddress[];
  const address = findAddressById(addresses, addressId);
  if (!address) return apiError("Address not found", 404);

  Object.assign(address, parsed.data);

  if (parsed.data.isDefault) {
    addresses.forEach((entry) => {
      entry.isDefault = String(entry._id) === addressId;
    });
  }

  doc.markModified("addresses");
  await doc.save();
  return apiSuccess(toCustomerProfile(doc).addresses);
});

export const DELETE = withCustomerAuth(async (_request, { user, params }) => {
  const addressId = params?.id;
  if (!addressId) return apiError("Address id required", 400);

  await connectDB();
  const doc = await User.findById(user.id);
  if (!doc) return apiError("User not found", 404);

  const addresses = doc.addresses as StoredAddress[];
  const index = addresses.findIndex(
    (address) => String(address._id) === addressId
  );
  if (index === -1) return apiError("Address not found", 404);

  const wasDefault = addresses[index]?.isDefault;
  addresses.splice(index, 1);

  if (wasDefault && addresses.length > 0) {
    addresses[0].isDefault = true;
  }

  doc.markModified("addresses");
  await doc.save();
  return apiSuccess(toCustomerProfile(doc).addresses);
});
