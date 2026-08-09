import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/models";
import { withCustomerAuth } from "@/lib/api/authMiddleware";
import { apiError, apiSuccess } from "@/lib/api/response";
import { toCustomerProfile } from "@/lib/customer/profile";

const addressSchema = z.object({
  label: z.string().min(1).max(40).default("Home"),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  street: z.string().min(1).max(200),
  city: z.string().min(1).max(80),
  state: z.string().min(1).max(80),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(2).max(2),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const GET = withCustomerAuth(async (_request, { user }) => {
  await connectDB();
  const doc = await User.findById(user.id);
  if (!doc) return apiError("User not found", 404);
  return apiSuccess(toCustomerProfile(doc).addresses);
});

export const POST = withCustomerAuth(async (request, { user }) => {
  await connectDB();
  const body = await request.json();
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const doc = await User.findById(user.id);
  if (!doc) return apiError("User not found", 404);

  const makeDefault = parsed.data.isDefault ?? doc.addresses.length === 0;
  if (makeDefault) {
    doc.addresses.forEach((address) => {
      address.isDefault = false;
    });
  }

  doc.addresses.push({
    ...parsed.data,
    isDefault: makeDefault,
  });
  await doc.save();

  return apiSuccess(toCustomerProfile(doc).addresses, 201);
});
