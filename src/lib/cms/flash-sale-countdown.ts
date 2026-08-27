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

/** Hours between auto-picked flash-sale batches. 168 = follow the 7-day countdown. */
export const FLASH_SALE_ROTATION_HOURS = [6, 12, 24, 168] as const;

export function resolveFlashSaleRotationHours(value: unknown): number {
  const hours = Number(value);
  if (Number.isFinite(hours) && hours > 0) return hours;
  return 24;
}

/** Stable window index so the same visitors see the same batch until it rotates. */
export function flashSaleRotationWindow(
  rotationHours: number,
  anchorEndsAt?: string | Date | null,
  now = Date.now()
): number {
  const hours = resolveFlashSaleRotationHours(rotationHours);
  if (hours >= 168) {
    const end = resolveFlashSaleEndsAt(anchorEndsAt, now).getTime();
    return Math.floor(end / FLASH_SALE_DURATION_MS);
  }
  return Math.floor(now / (hours * 60 * 60 * 1000));
}

export function rotateSlice<T>(items: T[], limit: number, window: number): T[] {
  if (items.length === 0 || limit <= 0) return [];
  if (items.length <= limit) return items.slice(0, limit);
  const offset = ((window % items.length) + items.length) % items.length;
  const start = (offset * limit) % items.length;
  const out: T[] = [];
  for (let i = 0; i < limit; i++) {
    out.push(items[(start + i) % items.length]);
  }
  return out;
}
