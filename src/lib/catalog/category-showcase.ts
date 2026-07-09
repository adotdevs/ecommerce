/** Plain category shape safe to pass into Client Components (no ObjectIds). */
export interface CategoryShowcaseData {
  _id: string;
  name: string;
  slug: string;
  image?: string;
}

export function toCategoryShowcaseData(
  category: Record<string, unknown> | null | undefined
): CategoryShowcaseData | null {
  const c = category ?? {};
  const slug = String(c.slug ?? "");
  const name = String(c.name ?? "");
  if (!slug && !name) return null;

  return {
    _id: String(c._id ?? ""),
    name,
    slug,
    image: c.image != null ? String(c.image) : undefined,
  };
}

export function toCategoryShowcaseList(
  categories: unknown[]
): CategoryShowcaseData[] {
  return categories
    .map((c) =>
      toCategoryShowcaseData(c as Record<string, unknown>)
    )
    .filter((c): c is CategoryShowcaseData => c !== null);
}
