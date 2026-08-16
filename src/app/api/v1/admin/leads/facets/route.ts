import { withAuth } from "@/lib/api/authMiddleware";
import { PERMISSIONS } from "@/config/permissions";
import { apiSuccess, apiError } from "@/lib/api/response";
import { getLeadModel } from "@/models/Lead";
import { PHONE_COUNTRY_OPTIONS } from "@/lib/leads/phone-countries";
import { mergeCountryFacetCounts } from "@/lib/leads/countries";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** One option per dial code (e.g. +1 = US/CA) so counts are not split/duplicated. */
function phoneOptionsByDialCode() {
  const map = new Map<
    string,
    {
      value: string;
      label: string;
      dialCode: string;
      isos: string[];
      minLength: number;
      maxLength: number;
    }
  >();

  for (const c of PHONE_COUNTRY_OPTIONS) {
    const existing = map.get(c.dialCode);
    if (existing) {
      existing.isos.push(c.iso);
      if (!existing.label.includes(c.name)) {
        existing.label = `${existing.label} / ${c.name}`;
      }
      existing.minLength = Math.min(existing.minLength, c.minLength);
      existing.maxLength = Math.max(existing.maxLength, c.maxLength);
    } else {
      map.set(c.dialCode, {
        value: c.iso,
        label: c.name,
        dialCode: c.dialCode,
        isos: [c.iso],
        minLength: c.minLength,
        maxLength: c.maxLength,
      });
    }
  }

  return Array.from(map.values());
}

export const GET = withAuth(async () => {
  try {
    const Lead = await getLeadModel();
    const dialOptions = phoneOptionsByDialCode();

    const [
      countries,
      phoneLengthRows,
      statuses,
      brands,
      total,
      ...phoneCounts
    ] = await Promise.all([
      Lead.aggregate<{ _id: string; count: number }>([
        { $match: { country: { $type: "string", $gt: "" } } },
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 500 },
      ]),
      // Prefer stored phoneLength; otherwise digit count from normalized +E.164 phones
      Lead.aggregate<{ _id: number; count: number }>([
        { $match: { phone: { $type: "string", $gt: "" } } },
        {
          $project: {
            len: {
              $ifNull: [
                "$phoneLength",
                {
                  $let: {
                    vars: {
                      raw: "$phone",
                      startsPlus: {
                        $eq: [{ $substrCP: ["$phone", 0, 1] }, "+"],
                      },
                    },
                    in: {
                      $cond: [
                        "$$startsPlus",
                        { $subtract: [{ $strLenCP: "$$raw" }, 1] },
                        { $strLenCP: "$$raw" },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
        { $match: { len: { $gte: 6, $lte: 20 } } },
        { $group: { _id: "$len", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
      Lead.aggregate<{ _id: string; count: number }>([
        { $match: { status: { $type: "string", $gt: "" } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]),
      Lead.aggregate<{ _id: string; count: number }>([
        { $match: { brand: { $type: "string", $gt: "" } } },
        { $group: { _id: "$brand", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]),
      Lead.countDocuments(),
      ...dialOptions.map((opt) =>
        Lead.countDocuments({
          $or: [
            { phoneCountry: { $in: opt.isos } },
            { phoneDialCode: opt.dialCode },
            {
              phone: {
                $regex: `^${escapeRegex(opt.dialCode)}`,
              },
            },
          ],
        })
      ),
    ]);

    const phoneCountries = dialOptions
      .map((opt, idx) => ({
        value: opt.value,
        count: Number(phoneCounts[idx] ?? 0),
        label: opt.label,
        dialCode: opt.dialCode,
        minLength: opt.minLength,
        maxLength: opt.maxLength,
        isos: opt.isos,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    return apiSuccess({
      total,
      countries: mergeCountryFacetCounts(
        countries.map((c) => ({ value: c._id, count: c.count }))
      ),
      phoneCountries,
      phoneLengths: phoneLengthRows.map((c) => ({
        value: c._id,
        count: c.count,
      })),
      statuses: statuses.map((c) => ({ value: c._id, count: c.count })),
      brands: brands.map((c) => ({ value: c._id, count: c.count })),
      phoneCountryOptions: PHONE_COUNTRY_OPTIONS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load facets";
    return apiError(message, message.includes("MONGODB_LEADS_URI") ? 503 : 500);
  }
}, PERMISSIONS.MARKETING_WRITE);
