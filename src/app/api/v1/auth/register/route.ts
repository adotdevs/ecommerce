import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { User, Role } from "@/models";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  signAccessToken,
  signRefreshToken,
  REFRESH_COOKIE,
  ACCESS_COOKIE,
} from "@/lib/auth/jwt";
import { registerSchema, loginSchema } from "@/lib/validators";
import { apiSuccess, apiError } from "@/lib/api/response";
import crypto from "crypto";

async function getUserPermissions(roles: string[]): Promise<string[]> {
  const roleDocs = await Role.find({ name: { $in: roles } }).lean();
  const perms = new Set<string>();
  for (const role of roleDocs) {
    for (const p of role.permissions) perms.add(p);
  }
  return Array.from(perms);
}

function setAuthCookies(
  response: Response,
  accessToken: string,
  refreshToken: string,
  rememberMe = false
) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
  response.headers.append(
    "Set-Cookie",
    `${ACCESS_COOKIE}=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 15}`
  );
  response.headers.append(
    "Set-Cookie",
    `${REFRESH_COOKIE}=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
  );
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const existing = await User.findOne({ email: parsed.data.email });
    if (existing) return apiError("Email already registered", 409);

    const passwordHash = await hashPassword(parsed.data.password);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      email: parsed.data.email,
      passwordHash,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      roles: ["customer"],
      verificationToken,
    });

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
      },
      accessToken,
    });

    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (err) {
    console.error(err);
    return apiError("Registration failed", 500);
  }
}
