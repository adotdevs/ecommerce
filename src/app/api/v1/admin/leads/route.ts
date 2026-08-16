import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getLeadModel } from "@/models/Lead";
import { getPhoneCountryByIso } from "@/lib/leads/phone-countries";
import {
  expandCountryAliases,
  normalizeCountryName,
} from "@/lib/leads/countries";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  q: z.string().optional(),
  country: z.string().optional(),
  countrySearch: z.string().optional(),
  phonePrefix: z.string().optional(),
  phoneCountry: z.string().optional(),
  phoneLength: z.coerce.number().int().min(6).max(20).optional(),
  status: z.string().optional(),
  brand: z.string().optional(),
  hasEmail: z.enum(["true", "false"]).optional(),
  hasPhone: z.enum(["true", "false"]).optional(),
});

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildLeadFilter(params: z.infer<typeof listQuerySchema>) {
  const {
    q,
    country,
    countrySearch,
    phonePrefix,
    phoneCountry,
    phoneLength,
    status,
    brand,
    hasEmail,
    hasPhone,
  } = params;

  const filter: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];

  if (q?.trim()) {
    const term = q.trim();
    and.push({
      $or: [
        { email: { $regex: term, $options: "i" } },
        { phone: { $regex: term, $options: "i" } },
        { firstName: { $regex: term, $options: "i" } },
        { lastName: { $regex: term, $options: "i" } },
        { brand: { $regex: term, $options: "i" } },
        { country: { $regex: term, $options: "i" } },
        { phoneCountry: { $regex: term, $options: "i" } },
        { phoneDialCode: { $regex: term, $options: "i" } },
      ],
    });
  }

  if (country?.trim()) {
    const variants = expandCountryAliases(country);
    const canonical = normalizeCountryName(country);
    and.push({
      $or: [
        ...variants.map((v) => ({
          country: new RegExp(`^${escapeRegex(v)}$`, "i"),
        })),
        // Also match any spacing/case variant of the canonical name
        {
          country: new RegExp(
            `^\\s*${escapeRegex(canonical).replace(/\s+/g, "\\s+")}\\s*$`,
            "i"
          ),
        },
      ],
    });
  } else if (countrySearch?.trim()) {
    const needle = normalizeCountryName(countrySearch) || countrySearch.trim();
    const variants = expandCountryAliases(needle);
    and.push({
      $or: [
        { country: new RegExp(escapeRegex(countrySearch.trim()), "i") },
        ...variants.map((v) => ({
          country: new RegExp(escapeRegex(v), "i"),
        })),
      ],
    });
  }

  if (phonePrefix?.trim()) {
    and.push({ phone: new RegExp(`^${escapeRegex(phonePrefix.trim())}`) });
  }

  if (phoneCountry?.trim()) {
    const iso = phoneCountry.trim().toUpperCase();
    const cfg = getPhoneCountryByIso(iso);
    if (cfg) {
      and.push({
        $or: [
          { phoneCountry: iso },
          { phoneDialCode: cfg.dialCode },
          { phone: new RegExp(`^\\${cfg.dialCode}`) },
        ],
      });
    } else {
      filter.phoneCountry = iso;
    }
  }

  if (typeof phoneLength === "number") {
    // Match stored phoneLength OR compute from +E.164 phone string
    and.push({
      $or: [
        { phoneLength },
        {
          $expr: {
            $eq: [
              {
                $cond: [
                  { $eq: [{ $substrCP: ["$phone", 0, 1] }, "+"] },
                  { $subtract: [{ $strLenCP: "$phone" }, 1] },
                  { $strLenCP: "$phone" },
                ],
              },
              phoneLength,
            ],
          },
        },
      ],
    });
  }

  if (status?.trim()) {
    filter.status = new RegExp(`^${escapeRegex(status.trim())}$`, "i");
  }
  if (brand?.trim()) {
    filter.brand = new RegExp(escapeRegex(brand.trim()), "i");
  }
  if (hasEmail === "true") and.push({ email: { $exists: true, $nin: [null, ""] } });
  if (hasEmail === "false") {
    and.push({
      $or: [{ email: { $exists: false } }, { email: null }, { email: "" }],
    });
  }
  if (hasPhone === "true") and.push({ phone: { $exists: true, $nin: [null, ""] } });
  if (hasPhone === "false") {
    and.push({
      $or: [{ phone: { $exists: false } }, { phone: null }, { phone: "" }],
    });
  }

  if (and.length) filter.$and = and;
  return filter;
}

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const Lead = await getLeadModel();
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = listQuerySchema.safeParse(params);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const { page, limit } = parsed.data;
    const filter = buildLeadFilter(parsed.data);

    const [items, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return apiSuccess({
      items,
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list leads";
    return apiError(message, message.includes("MONGODB_LEADS_URI") ? 503 : 500);
  }
}, PERMISSIONS.MARKETING_WRITE);

export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const Lead = await getLeadModel();
    const body = await request.json().catch(() => ({}));
    const ids = z.array(z.string().min(1)).safeParse(body?.ids);
    if (!ids.success || ids.data.length === 0) {
      return apiError("Provide ids: string[]");
    }

    const result = await Lead.deleteMany({ _id: { $in: ids.data } });
    return apiSuccess({ deleted: result.deletedCount ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete leads";
    return apiError(message, 500);
  }
}, PERMISSIONS.MARKETING_WRITE);
