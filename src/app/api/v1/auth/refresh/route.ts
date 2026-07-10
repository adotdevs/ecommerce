import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { User, Role } from "@/models";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_COOKIE,
} from "@/lib/auth/jwt";
import { appendAuthCookies, appendClearAuthCookies } from "@/lib/auth/cookies";
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
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) return apiError("No refresh token", 401);

    const payload = verifyRefreshToken(refreshToken);
    await connectDB();

    const user = await User.findById(payload.sub);
    if (!user) return apiError("User not found", 401);

    const permissions = await getUserPermissions(user.roles);
    const newPayload = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
      permissions,
    };

    const accessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    const response = apiSuccess({ accessToken });
    appendAuthCookies(response, accessToken, newRefreshToken);
    return response;
  } catch {
    return apiError("Invalid refresh token", 401);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  appendClearAuthCookies(response);
  return response;
}
