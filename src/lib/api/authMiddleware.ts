import { NextRequest } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth/session";
import { apiForbidden, apiUnauthorized } from "@/lib/api/response";
import type { AuthUser } from "@/types";

type Handler = (
  request: NextRequest,
  context: { user: AuthUser; params?: Record<string, string> }
) => Promise<Response>;

export function withAuth(handler: Handler, permission?: string) {
  return async (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    const user = getAuthUser(request);
    if (!user) return apiUnauthorized();

    if (permission && !hasPermission(user, permission)) {
      return apiForbidden();
    }

    const params = context?.params ? await context.params : undefined;
    return handler(request, { user, params });
  };
}

export function withOptionalAuth(handler: Handler) {
  return async (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    const user = getAuthUser(request);
    const params = context?.params ? await context.params : undefined;
    if (!user) {
      return handler(request, {
        user: { id: "", email: "", roles: ["guest"], permissions: [] },
        params,
      });
    }
    return handler(request, { user, params });
  };
}
