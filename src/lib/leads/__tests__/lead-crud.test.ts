import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEmail,
  normalizePhone,
  enrichPhoneFields,
  normalizeString,
  normalizeTags,
} from "@/lib/leads/normalize";
import { normalizeCountryName } from "@/lib/leads/countries";
import { detectPhoneMeta } from "@/lib/leads/phone-countries";

describe("Manual Lead Normalization & Field Enrichment", () => {
  it("normalizes and lowercases valid email addresses", () => {
    assert.strictEqual(normalizeEmail("  John.Doe@EXAMPLE.COM  "), "john.doe@example.com");
    assert.strictEqual(normalizeEmail("invalid-email"), undefined);
    assert.strictEqual(normalizeEmail(""), undefined);
    assert.strictEqual(normalizeEmail(null), undefined);
  });

  it("normalizes phone numbers to standard E.164-style formats", () => {
    assert.strictEqual(normalizePhone("+44 7012 345678"), "+447012345678");
    assert.strictEqual(normalizePhone("0049 151 2345678"), "+491512345678");
    assert.strictEqual(normalizePhone("123"), undefined); // too short (< 6 digits)
  });

  it("enriches UK phone number with dial code +44, ISO GB, and length", () => {
    const enriched = enrichPhoneFields("+447012345678");
    assert.strictEqual(enriched.phone, "+447012345678");
    assert.strictEqual(enriched.phoneDialCode, "+44");
    assert.strictEqual(enriched.phoneCountry, "GB");
    assert.strictEqual(enriched.phoneLength, 12);
  });

  it("enriches German phone number with dial code +49, ISO DE, and length", () => {
    const enriched = enrichPhoneFields("+491512345678");
    assert.strictEqual(enriched.phone, "+491512345678");
    assert.strictEqual(enriched.phoneDialCode, "+49");
    assert.strictEqual(enriched.phoneCountry, "DE");
    assert.strictEqual(enriched.phoneLength, 12);
  });

  it("enriches UAE phone number with dial code +971, ISO AE, and length", () => {
    const enriched = enrichPhoneFields("+971501234567");
    assert.strictEqual(enriched.phone, "+971501234567");
    assert.strictEqual(enriched.phoneDialCode, "+971");
    assert.strictEqual(enriched.phoneCountry, "AE");
    assert.strictEqual(enriched.phoneLength, 12);
  });

  it("normalizes country aliases to canonical country names", () => {
    assert.strictEqual(normalizeCountryName("uk"), "United Kingdom");
    assert.strictEqual(normalizeCountryName("GB"), "United Kingdom");
    assert.strictEqual(normalizeCountryName("usa"), "United States");
    assert.strictEqual(normalizeCountryName("u.a.e"), "United Arab Emirates");
    assert.strictEqual(normalizeCountryName("deutschland"), "Germany");
  });

  it("normalizes tags from both string arrays and comma-separated strings", () => {
    assert.deepStrictEqual(normalizeTags("vip, high-intent, ecommerce"), [
      "vip",
      "high-intent",
      "ecommerce",
    ]);
    assert.deepStrictEqual(normalizeTags(["  vip  ", "retail ", ""]), [
      "vip",
      "retail",
    ]);
    assert.strictEqual(normalizeTags(""), undefined);
    assert.strictEqual(normalizeTags(null), undefined);
  });
});

describe("Manual Lead Validation Rules", () => {
  it("rejects lead creation payload if both email and phone are missing or invalid", () => {
    const email = normalizeEmail("not-an-email");
    const rawPhone = normalizeString("   ");
    const phone = rawPhone ? normalizePhone(rawPhone) : undefined;

    const hasIdentifier = Boolean(email || phone);
    assert.strictEqual(hasIdentifier, false);
  });

  it("accepts lead creation payload when only valid email is provided", () => {
    const email = normalizeEmail("lead@domain.com");
    const phone = normalizePhone(undefined);

    const hasIdentifier = Boolean(email || phone);
    assert.strictEqual(hasIdentifier, true);
    assert.strictEqual(email, "lead@domain.com");
  });

  it("accepts lead creation payload when only valid phone is provided", () => {
    const email = normalizeEmail("");
    const phone = normalizePhone("+447012345678");

    const hasIdentifier = Boolean(email || phone);
    assert.strictEqual(hasIdentifier, true);
    assert.strictEqual(phone, "+447012345678");
  });

  it("properly detects duplicate query parameters for pre-check", () => {
    const email = normalizeEmail("user@example.com");
    const phone = normalizePhone("+447012345678");

    const duplicateChecks: Record<string, unknown>[] = [];
    if (email) duplicateChecks.push({ email });
    if (phone) duplicateChecks.push({ phone });

    assert.strictEqual(duplicateChecks.length, 2);
    assert.deepStrictEqual(duplicateChecks[0], { email: "user@example.com" });
    assert.deepStrictEqual(duplicateChecks[1], { phone: "+447012345678" });
  });

  it("excludes current lead ID during edit duplicate checks", () => {
    const currentId = "60c72b2f9b1d8b2bad000001";
    const nextEmail: string = "updated@example.com";
    const existingLeadEmail: string = "old@example.com";

    const duplicateChecks: Record<string, unknown>[] = [];
    if (nextEmail && nextEmail !== existingLeadEmail) {
      duplicateChecks.push({ email: nextEmail });
    }

    const query = {
      _id: { $ne: currentId },
      $or: duplicateChecks,
    };

    assert.strictEqual(query._id.$ne, currentId);
    assert.deepStrictEqual(query.$or, [{ email: "updated@example.com" }]);
  });
});
