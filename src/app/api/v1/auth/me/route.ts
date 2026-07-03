import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { User, Role } from "@/models";
import { getAuthUser } from "@/lib/auth/session";
import { apiSuccess, apiUnauthorized } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) return apiUnauthorized();

  await connectDB();
  const user = await User.findById(authUser.id).select("-passwordHash").lean();
  if (!user) return apiUnauthorized();

  const roleDocs = await Role.find({ name: { $in: user.roles } }).lean();
  const permissions = roleDocs.flatMap((r) => r.permissions);

  return apiSuccess({
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    permissions: [...new Set(permissions)],
  });
}
