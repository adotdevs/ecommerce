import { NextRequest } from "next/server";
import {
  payloadToAuthUser,
  verifyAccessToken,
  verifyRefreshToken,
  REFRESH_COOKIE,
} from "@/lib/auth/jwt";
import type { AuthUser } from "@/types";

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return request.cookies.get("access_token")?.value ?? null;
}

export function getAuthUser(request: NextRequest): AuthUser | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  try {
    return payloadToAuthUser(verifyAccessToken(token));
  } catch {
    return null;
  }
}

export function getRefreshToken(request: NextRequest): string | null {
  return request.cookies.get(REFRESH_COOKIE)?.value ?? null;
}

export function verifyRefreshFromRequest(request: NextRequest): AuthUser | null {
  const token = getRefreshToken(request);
  if (!token) return null;
  try {
    return payloadToAuthUser(verifyRefreshToken(token));
  } catch {
    return null;
  }
}

export function hasPermission(user: AuthUser, permission: string): boolean {
  if (user.roles.includes("super_admin")) return true;
  return user.permissions.includes(permission as AuthUser["permissions"][number]);
}

export function hasAnyAdminRole(user: AuthUser): boolean {
  const adminRoles = [
    "super_admin",
    "admin",
    "manager",
    "inventory_manager",
    "marketing_manager",
    "customer_support",
  ];
  return user.roles.some((r) => adminRoles.includes(r));
}
