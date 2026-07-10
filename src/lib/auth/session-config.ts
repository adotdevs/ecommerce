/** Keep admin signed in for several days without re-login. */
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;
export const REFRESH_TOKEN_REMEMBER_ME_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const ACCESS_TOKEN_JWT_EXPIRES_IN = "5d" as const;
export const REFRESH_TOKEN_JWT_EXPIRES_IN = "5d" as const;
export const REFRESH_TOKEN_REMEMBER_ME_JWT_EXPIRES_IN = "30d" as const;
