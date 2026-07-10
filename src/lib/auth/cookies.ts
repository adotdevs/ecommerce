import {
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_REMEMBER_ME_MAX_AGE_SECONDS,
} from "@/lib/auth/session-config";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/jwt";

export function appendAuthCookies(
  response: { headers: { append: (name: string, value: string) => void } },
  accessToken: string,
  refreshToken: string,
  rememberMe = false
) {
  const refreshMaxAge = rememberMe
    ? REFRESH_TOKEN_REMEMBER_ME_MAX_AGE_SECONDS
    : REFRESH_TOKEN_MAX_AGE_SECONDS;

  response.headers.append(
    "Set-Cookie",
    `${ACCESS_COOKIE}=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ACCESS_TOKEN_MAX_AGE_SECONDS}`
  );
  response.headers.append(
    "Set-Cookie",
    `${REFRESH_COOKIE}=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${refreshMaxAge}`
  );
}

export function appendClearAuthCookies(response: {
  headers: { append: (name: string, value: string) => void };
}) {
  response.headers.append(
    "Set-Cookie",
    `${ACCESS_COOKIE}=; Path=/; HttpOnly; Max-Age=0`
  );
  response.headers.append(
    "Set-Cookie",
    `${REFRESH_COOKIE}=; Path=/; HttpOnly; Max-Age=0`
  );
}
