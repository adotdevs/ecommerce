import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { User, Role } from "@/models";
import { getAuthUser, hasAnyAdminRole } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { appendAuthCookies } from "@/lib/auth/cookies";
import { changeAccountSchema } from "@/lib/validators";
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from "@/lib/api/response";

async function getUserPermissions(roles: string[]): Promise<string[]> {
  const roleDocs = await Role.find({ name: { $in: roles } }).lean();
  const perms = new Set<string>();
  for (const role of roleDocs) {
    for (const p of role.permissions) perms.add(p);
  }
  return Array.from(perms);
}

function duplicateEmailMessage(err: unknown): string | null {
  if (err && typeof err === "object" && "code" in err && err.code === 11000) {
    return "That email address is already in use";
  }
  return null;
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return apiUnauthorized();
    if (!hasAnyAdminRole(authUser)) return apiForbidden();

    const body = await request.json();
    const parsed = changeAccountSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    await connectDB();
    const user = await User.findById(authUser.id);
    if (!user) return apiUnauthorized();

    const validPassword = await verifyPassword(
      parsed.data.currentPassword,
      user.passwordHash
    );
    if (!validPassword) {
      return apiError("Current password is incorrect", 401);
    }

    if (parsed.data.action === "email") {
      const newEmail = parsed.data.newEmail.trim().toLowerCase();
      if (newEmail === user.email) {
        return apiError("New email must be different from your current email");
      }

      const taken = await User.findOne({ email: newEmail, _id: { $ne: user._id } })
        .select("_id")
        .lean();
      if (taken) {
        return apiError("That email address is already in use", 409);
      }

      user.email = newEmail;
      user.emailVerified = false;
      await user.save();
    } else {
      if (parsed.data.newPassword === parsed.data.currentPassword) {
        return apiError("New password must be different from your current password");
      }
      user.passwordHash = await hashPassword(parsed.data.newPassword);
      await user.save();
    }

    const permissions = await getUserPermissions(user.roles);
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
      permissions,
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const response = apiSuccess({
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        permissions,
      },
      message:
        parsed.data.action === "email"
          ? "Email updated successfully"
          : "Password updated successfully",
    });
    appendAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (err) {
    console.error(err);
    const duplicate = duplicateEmailMessage(err);
    return apiError(duplicate ?? "Failed to update account", duplicate ? 409 : 500);
  }
}
