import type { AuthUser } from "@/types";

/** Edge-safe JWT payload decode for routing (API routes still verify signatures). */
export function decodeAccessTokenPayload(
  token: string
): Pick<AuthUser, "id" | "email" | "roles" | "permissions"> | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;

    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const json =
      typeof atob !== "undefined"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");

    const payload = JSON.parse(json) as {
      sub?: string;
      email?: string;
      roles?: string[];
      permissions?: string[];
      exp?: number;
    };

    if (payload.exp && payload.exp * 1000 <= Date.now()) return null;
    if (!payload.sub || !payload.email || !payload.roles) return null;

    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
      permissions: (payload.permissions ?? []) as AuthUser["permissions"],
    };
  } catch {
    return null;
  }
}
