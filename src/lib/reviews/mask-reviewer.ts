/**
 * Mask reviewer identity for storefront display, e.g. "ahmed92" → "ah****92"
 */
export function maskReviewerName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "****";

  const alnum = trimmed.replace(/[^a-zA-Z0-9]/g, "");
  if (alnum.length >= 4) {
    const start = alnum.slice(0, 2).toLowerCase();
    const end = alnum.slice(-2);
    return `${start}****${end}`;
  }

  if (trimmed.length >= 3) {
    return `${trimmed.slice(0, 2).toLowerCase()}****`;
  }

  return `${trimmed.charAt(0).toLowerCase()}****`;
}

export function reviewerInitial(masked: string): string {
  return masked.charAt(0).toUpperCase();
}
