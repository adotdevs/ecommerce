import { openAiChatJson } from "@/lib/ai/openai-client";

export interface GeneratedReviewDraft {
  userName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: Date;
}

export interface GenerateProductReviewsInput {
  productName: string;
  productDescription?: string;
  count: number;
  targetAverage: number;
  dateRangeDays: number;
  notes?: string;
}

const FIRST = [
  "alex", "jordan", "sam", "chris", "taylor", "morgan", "jamie", "casey",
  "riley", "drew", "avery", "quinn", "blake", "cameron", "devon", "skyler",
  "maria", "david", "emma", "james", "olivia", "noah", "sophia", "liam",
  "ahmar", "sara", "omar", "nina", "leo", "mia", "ryan", "zoe",
];

const LAST_INITIAL = "abcdefghjklmnprstw".split("");

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateReviewerUserName(): string {
  const style = randomInt(0, 3);
  const first = pick(FIRST);
  switch (style) {
    case 0:
      return `${first}${randomInt(7, 99)}`;
    case 1:
      return `${first}_${randomInt(100, 9999)}`;
    case 2:
      return `${first}.${pick(LAST_INITIAL)}${randomInt(10, 99)}`;
    default:
      return `${first.slice(0, 1)}${pick(LAST_INITIAL)}${randomInt(100, 999)}`;
  }
}

export function distributeRatings(count: number, targetAverage: number): number[] {
  const avg = Math.min(5, Math.max(1, targetAverage));
  const ratings: number[] = [];
  let remaining = Math.round(avg * count);

  for (let i = 0; i < count; i++) {
    const slotsLeft = count - i;
    if (slotsLeft === 1) {
      ratings.push(Math.min(5, Math.max(1, remaining)));
      break;
    }

    const ideal = remaining / slotsLeft;
    const minNeeded = slotsLeft - 1;
    const maxNeeded = (slotsLeft - 1) * 5;
    const candidates = [1, 2, 3, 4, 5].filter(
      (r) => r + minNeeded <= remaining && r + maxNeeded >= remaining
    );
    const pool = candidates.length ? candidates : [4, 5, 3];
    const chosen = pool.reduce((best, r) =>
      Math.abs(r - ideal) < Math.abs(best - ideal) ? r : best
    );
    ratings.push(chosen);
    remaining -= chosen;
  }

  return shuffle(ratings);
}

export function randomReviewDate(withinDays: number): Date {
  const days = Math.max(1, withinDays);
  const offsetMs = randomInt(0, days * 24 * 60 * 60 * 1000);
  return new Date(Date.now() - offsetMs);
}

const TEMPLATE_TITLES: Record<number, string[]> = {
  5: [
    "Exactly what I needed",
    "Really happy with this",
    "Great purchase",
    "Would buy again",
    "Solid quality",
  ],
  4: [
    "Pretty good overall",
    "Happy with it",
    "Minor quirks but worth it",
    "Good for the price",
    "Does the job well",
  ],
  3: [
    "It's okay",
    "Mixed feelings",
    "Average experience",
    "Fine but not amazing",
    "Decent enough",
  ],
  2: [
    "Not quite right for me",
    "Expected a bit more",
    "Some issues",
    "Okay-ish",
  ],
  1: [
    "Disappointed",
    "Wouldn't recommend",
    "Not for me",
  ],
};

const TEMPLATE_BODIES: Record<number, string[]> = {
  5: [
    "Showed up on time and matches the listing. Been using it daily for a couple weeks — no complaints so far.",
    "Packaging was fine. Setup took maybe 10 minutes. Feels well made compared to others I've tried.",
    "My partner actually noticed the difference right away. Glad I went with this one instead of the cheaper option.",
    "Does what it says. Shipping was quick and customer service answered a sizing question before I ordered.",
  ],
  4: [
    "Works well for everyday use. Took a day to get used to it but I'd still recommend if you're on the fence.",
    "Good value. One small thing in the instructions was confusing but figured it out. Would buy again maybe.",
    "Quality is there — just wish the color was slightly different in person. Still keeping it.",
  ],
  3: [
    "It's fine for casual use. Nothing special but nothing terrible either. Middle of the road purchase.",
    "Had higher hopes based on photos. Functional but I probably wouldn't reorder unless it goes on sale.",
  ],
  2: [
    "Arrived okay but didn't fit my setup the way I expected. Might work better for someone else.",
    "Build is alright. Just not what I was looking for personally.",
  ],
  1: [
    "Didn't match the description for my use case. Returned it.",
    "Stopped working after light use. Support was slow to reply.",
  ],
};

function templateReview(
  productName: string,
  rating: number,
  userName: string
): Pick<GeneratedReviewDraft, "userName" | "rating" | "title" | "body"> {
  const titles = TEMPLATE_TITLES[rating] ?? TEMPLATE_TITLES[4];
  const bodies = TEMPLATE_BODIES[rating] ?? TEMPLATE_BODIES[4];
  const body = pick(bodies).replace(/this one/gi, productName.split(" ").slice(0, 3).join(" "));
  return {
    userName,
    rating,
    title: pick(titles),
    body,
  };
}

interface AiReviewBatch {
  reviews?: {
    userName?: string;
    rating?: number;
    title?: string;
    body?: string;
    daysAgo?: number;
  }[];
}

export async function generateProductReviews(
  input: GenerateProductReviewsInput
): Promise<GeneratedReviewDraft[]> {
  const count = Math.min(50, Math.max(1, Math.round(input.count)));
  const ratings = distributeRatings(count, input.targetAverage);
  const userNames = Array.from({ length: count }, () => generateReviewerUserName());

  const ai = await openAiChatJson<AiReviewBatch>(
    `You write realistic e-commerce product reviews that sound like real shoppers — casual, specific, sometimes short, occasionally imperfect grammar. Never mention AI. Never use marketing buzzwords like "game-changer", "must-have", "absolutely love", "exceeded expectations". Vary sentence length. Some reviews 1-2 sentences, others 3-5. Return JSON: { "reviews": [{ "userName", "rating", "title", "body", "daysAgo" }] }`,
    `Product: ${input.productName}
${input.productDescription ? `About: ${input.productDescription.slice(0, 400)}` : ""}
Generate exactly ${count} unique reviews.
Target average rating: ${input.targetAverage.toFixed(1)} — use these exact star ratings in order (shuffle in output): ${ratings.join(", ")}
Suggested usernames (you may tweak slightly): ${userNames.join(", ")}
Spread review dates across the last ${input.dateRangeDays} days using daysAgo (integer).
${input.notes ? `Extra guidance: ${input.notes}` : ""}`,
    { temperature: 0.85 }
  );

  if (ai?.reviews?.length) {
    return ai.reviews.slice(0, count).map((r, i) => {
      const rating = ratings[i] ?? Math.min(5, Math.max(1, Number(r.rating) || 4));
      const daysAgo = Math.min(
        input.dateRangeDays,
        Math.max(0, Number(r.daysAgo) || randomInt(0, input.dateRangeDays))
      );
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      return {
        userName: String(r.userName ?? userNames[i]).trim().slice(0, 40) || userNames[i],
        rating,
        title: String(r.title ?? "Good purchase").trim().slice(0, 120),
        body: String(r.body ?? "Works as expected.").trim().slice(0, 2000),
        createdAt,
      };
    });
  }

  return ratings.map((rating, i) => {
    const base = templateReview(input.productName, rating, userNames[i]);
    return {
      ...base,
      createdAt: randomReviewDate(input.dateRangeDays),
    };
  });
}
