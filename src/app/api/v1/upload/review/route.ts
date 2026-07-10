import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { getAuthUser } from "@/lib/auth/session";
import { apiSuccess, apiError, apiUnauthorized } from "@/lib/api/response";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return apiUnauthorized("Sign in to upload review images");

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return apiError(
      "Image upload is not configured. Contact support.",
      503
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return apiError("No file provided", 400);

    if (!ALLOWED.includes(file.type)) {
      return apiError("Invalid file type. Use JPEG, PNG, WebP, GIF, or AVIF.", 400);
    }
    if (file.size > MAX_SIZE) {
      return apiError("File too large. Maximum size is 5MB.", 400);
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const pathname = `reviews/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

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
    console.error("Review upload error:", err);
    return apiError("Upload failed", 500);
  }
}
