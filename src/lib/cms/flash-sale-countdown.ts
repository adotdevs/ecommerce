export const FLASH_SALE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/** Default cycle anchor when no custom end date is stored. */
const DEFAULT_ANCHOR_MS = Date.UTC(2026, 0, 1, 0, 0, 0);

/**
 * Resolves the active flash sale end time. When the countdown reaches zero,
 * the next end is automatically anchor + N×7 days (always in the future).
 */
export function resolveFlashSaleEndsAt(
  anchorEndsAt?: string | Date | null,
  now = Date.now()
): Date {
  let anchor = DEFAULT_ANCHOR_MS;

  if (anchorEndsAt) {
    const parsed = new Date(anchorEndsAt).getTime();
    if (!Number.isNaN(parsed)) anchor = parsed;
  }

  if (anchor > now) {
    return new Date(anchor);
  }

  const elapsed = now - anchor;
  const cycles = Math.floor(elapsed / FLASH_SALE_DURATION_MS) + 1;
  return new Date(anchor + cycles * FLASH_SALE_DURATION_MS);
}

export function resolveFlashSaleEndsAtIso(
  anchorEndsAt?: string | Date | null,
  now = Date.now()
): string {
  return resolveFlashSaleEndsAt(anchorEndsAt, now).toISOString();
}
