import { connectDB } from "@/lib/db/mongoose";
import { Product } from "@/models";
import { openAiChatJson } from "@/lib/ai/openai-client";

export interface MerchSuggestion {
  productId: string;
  name: string;
  sku: string;
  reason: string;
}

export interface DealSuggestion extends MerchSuggestion {
  compareAtPrice: number;
  salePrice: number;
}

export interface MerchandisingAutopilotResult {
  bestsellers: MerchSuggestion[];
  newArrivals: MerchSuggestion[];
  deals: DealSuggestion[];
  applied?: boolean;
}

function scoreBestseller(p: {
  rating?: { average: number; count: number };
  inventory?: { stock: number };
  featured?: boolean;
  pricing?: { price: number };
}): number {
  const rating = (p.rating?.average ?? 0) * Math.log10((p.rating?.count ?? 0) + 1);
  const stock = Math.min(p.inventory?.stock ?? 0, 100) / 10;
  const featured = p.featured ? 5 : 0;
  return rating * 3 + stock + featured;
}

export async function computeMerchandisingSuggestions(): Promise<MerchandisingAutopilotResult> {
  await connectDB();
  const products = await Product.find({ status: "published" })
    .select(
      "name slug sku pricing inventory rating featured isNewArrival tags categoryNames createdAt"
    )
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const inStock = products.filter((p) => (p.inventory?.stock ?? 0) > 0);

  const bestsellerRanked = [...inStock]
    .sort((a, b) => scoreBestseller(b) - scoreBestseller(a))
    .slice(0, 15);

  const newArrivalRanked = [...inStock]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 12);

  const dealCandidates = inStock
    .filter((p) => {
      const price = p.pricing?.price ?? 0;
      const compare = p.pricing?.compareAtPrice ?? 0;
      return price > 0 && compare <= price;
    })
    .slice(0, 20);

  const summary = {
    bestsellers: bestsellerRanked.map((p) => ({
      id: String(p._id),
      name: p.name,
      sku: p.sku,
      price: p.pricing?.price,
      rating: p.rating,
      stock: p.inventory?.stock,
    })),
    newArrivals: newArrivalRanked.map((p) => ({
      id: String(p._id),
      name: p.name,
      sku: p.sku,
      createdAt: p.createdAt,
    })),
    dealCandidates: dealCandidates.map((p) => ({
      id: String(p._id),
      name: p.name,
      price: p.pricing?.price,
    })),
  };

  const ai = await openAiChatJson<{
    bestsellers?: string[];
    newArrivals?: string[];
    deals?: { id: string; compareAtPrice: number; reason?: string }[];
  }>(
    `You are an e-commerce merchandising manager. Pick the best products for each collection. Return JSON:
{ bestsellers: string[] (max 8 product ids), newArrivals: string[] (max 8 ids), deals: [{ id, compareAtPrice (realistic original price above sale price), reason }] (max 6) }
Pick diverse, appealing products. Deals compareAtPrice should be 15-35% above current price.`,
    JSON.stringify(summary)
  );

  const byId = new Map(products.map((p) => [String(p._id), p]));

  const pickList = (ids: string[] | undefined, fallback: typeof products, max: number) => {
    const chosen = (ids ?? [])
      .map((id) => byId.get(id))
      .filter(Boolean)
      .slice(0, max) as typeof products;
    if (chosen.length >= 3) return chosen;
    return fallback.slice(0, max);
  };

  const bestPicks = pickList(ai?.bestsellers, bestsellerRanked, 8);
  const newPicks = pickList(ai?.newArrivals, newArrivalRanked, 8);
  const dealIds = new Map(
    (ai?.deals ?? []).map((d) => [d.id, d])
  );

  const dealPicks = dealCandidates.slice(0, 6).map((p) => {
    const id = String(p._id);
    const aiDeal = dealIds.get(id);
    const price = p.pricing?.price ?? 0;
    const compareAt =
      aiDeal?.compareAtPrice && aiDeal.compareAtPrice > price
        ? aiDeal.compareAtPrice
        : Math.round(price * 1.25 * 100) / 100;
    return {
      productId: id,
      name: p.name,
      sku: p.sku,
      reason: aiDeal?.reason ?? "AI-suggested seasonal deal",
      compareAtPrice: compareAt,
      salePrice: price,
    };
  });

  return {
    bestsellers: bestPicks.map((p) => ({
      productId: String(p._id),
      name: p.name,
      sku: p.sku,
      reason: "High rating, stock, and shopper appeal",
    })),
    newArrivals: newPicks.map((p) => ({
      productId: String(p._id),
      name: p.name,
      sku: p.sku,
      reason: "Recently added to catalog",
    })),
    deals: dealPicks,
  };
}

export async function applyMerchandisingSuggestions(
  result: MerchandisingAutopilotResult
): Promise<{ updated: number }> {
  await connectDB();

  await Product.updateMany(
    { featured: true },
    { $set: { featured: false } }
  );
  await Product.updateMany(
    { isNewArrival: true },
    { $set: { isNewArrival: false } }
  );

  let updated = 0;

  for (const b of result.bestsellers) {
    await Product.findByIdAndUpdate(b.productId, { $set: { featured: true } });
    updated++;
  }
  for (const n of result.newArrivals) {
    await Product.findByIdAndUpdate(n.productId, {
      $set: { isNewArrival: true },
    });
    updated++;
  }
  for (const d of result.deals) {
    await Product.findByIdAndUpdate(d.productId, {
      $set: { "pricing.compareAtPrice": d.compareAtPrice },
    });
    updated++;
  }

  return { updated };
}
