import { connectDB } from "@/lib/db/mongoose";
import { VisitorLog } from "@/models";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiNotFound } from "@/lib/api/response";

export const DELETE = withAuth(async (_request, { params }) => {
  await connectDB();
  const deleted = await VisitorLog.findByIdAndDelete(params?.id);
  if (!deleted) return apiNotFound("Visitor not found");
  return apiSuccess({ deleted: true });
}, PERMISSIONS.ANALYTICS_READ);
