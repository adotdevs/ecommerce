import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/models";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { withCustomerAuth } from "@/lib/api/authMiddleware";
import { apiError, apiSuccess } from "@/lib/api/response";
import { toCustomerProfile } from "@/lib/customer/profile";

const profilePatchSchema = z.object({
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
  preferences: z
    .object({
      locale: z.string().max(10).optional(),
      currency: z.string().max(5).optional(),
      country: z.string().max(2).optional(),
      emailOffers: z.boolean().optional(),
    })
    .optional(),
});

export const GET = withCustomerAuth(async (_request, { user }) => {
  await connectDB();
  const doc = await User.findById(user.id);
  if (!doc) return apiError("User not found", 404);
  return apiSuccess(toCustomerProfile(doc));
});

export const PATCH = withCustomerAuth(async (request, { user }) => {
  await connectDB();
  const body = await request.json();
  const parsed = profilePatchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const doc = await User.findById(user.id);
  if (!doc) return apiError("User not found", 404);

  const { firstName, lastName, email, currentPassword, newPassword, preferences } =
    parsed.data;

  if (firstName !== undefined) doc.firstName = firstName;
  if (lastName !== undefined) doc.lastName = lastName;

  if (email && email !== doc.email) {
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists && String(exists._id) !== user.id) {
      return apiError("Email is already in use", 409);
    }
    doc.email = email.toLowerCase();
  }

  if (newPassword) {
    if (!currentPassword) {
      return apiError("Current password is required", 400);
    }
    const valid = await verifyPassword(currentPassword, doc.passwordHash);
    if (!valid) return apiError("Current password is incorrect", 401);
    doc.passwordHash = await hashPassword(newPassword);
  }

  if (preferences) {
    doc.preferences = {
      ...doc.preferences,
      ...preferences,
    };
  }

  await doc.save();
  return apiSuccess(toCustomerProfile(doc));
});
