import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return apiError(
        "BLOB_READ_WRITE_TOKEN is not configured. Add it from Vercel Blob storage.",
        503
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) return apiError("No file provided", 400);

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!allowed.includes(file.type)) {
      return apiError("Invalid file type. Use JPEG, PNG, WebP, GIF, or AVIF.", 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return apiError("File too large. Maximum size is 5MB.", 400);
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const pathname = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(pathname, file, {
      access: "public",
      token,
    });

    return apiSuccess({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return apiError("Upload failed", 500);
  }
}, PERMISSIONS.CMS_WRITE);
