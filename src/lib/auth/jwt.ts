import jwt, { type SignOptions } from "jsonwebtoken";
import type { AuthUser } from "@/types";
import {
  ACCESS_TOKEN_JWT_EXPIRES_IN,
  REFRESH_TOKEN_JWT_EXPIRES_IN,
} from "@/lib/auth/session-config";

export interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export function signAccessToken(payload: TokenPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not defined");
  return jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_JWT_EXPIRES_IN });
}

export function signRefreshToken(
  payload: TokenPayload,
  expiresIn: SignOptions["expiresIn"] = REFRESH_TOKEN_JWT_EXPIRES_IN
): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not defined");
  return jwt.sign(payload, secret, { expiresIn });
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
