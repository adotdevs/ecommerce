import jwt from "jsonwebtoken";
import type { AuthUser } from "@/types";

export interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export function signAccessToken(payload: TokenPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not defined");
  return jwt.sign(payload, secret, { expiresIn: "15m" });
}

export function signRefreshToken(payload: TokenPayload): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not defined");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): TokenPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not defined");
  return jwt.verify(token, secret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not defined");
  return jwt.verify(token, secret) as TokenPayload;
}

export function payloadToAuthUser(payload: TokenPayload): AuthUser {
  return {
    id: payload.sub,
    email: payload.email,
    roles: payload.roles,
    permissions: payload.permissions as AuthUser["permissions"],
  };
}

export const REFRESH_COOKIE = "refresh_token";
export const ACCESS_COOKIE = "access_token";
