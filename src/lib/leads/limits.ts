/** Max upload size for lead imports (JSON/CSV). */
export const MAX_LEADS_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
