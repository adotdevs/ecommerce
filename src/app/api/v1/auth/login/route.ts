import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { User, Role } from "@/models";
import { verifyPassword } from "@/lib/auth/password";
import {
  signAccessToken,
  signRefreshToken,
  REFRESH_COOKIE,
  ACCESS_COOKIE,
} from "@/lib/auth/jwt";
import { loginSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/api/response";

async function getUserPermissions(roles: string[]): Promise<string[]> {
  const roleDocs = await Role.find({ name: { $in: roles } }).lean();
  const perms = new Set<string>();
  for (const role of roleDocs) {
    for (const p of role.permissions) perms.add(p);
  }
  return Array.from(perms);
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const user = await User.findOne({ email: parsed.data.email });
    if (!user) return apiError("Invalid credentials", 401);

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) return apiError("Invalid credentials", 401);

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
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        permissions,
      },
      accessToken,
    });

    const maxAge = parsed.data.rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    response.headers.append(
      "Set-Cookie",
      `${ACCESS_COOKIE}=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 15}`
    );
    response.headers.append(
      "Set-Cookie",
      `${REFRESH_COOKIE}=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
    );

    return response;
  } catch (err) {
    console.error(err);
    return apiError("Login failed", 500);
  }
}
