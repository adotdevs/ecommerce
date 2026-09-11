import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveTokens,
  detectMissingTokens,
  renderEmail,
} from "../render";
import { classifySmtpError } from "../sender";
import {
  createTrackingToken,
  verifyTrackingToken,
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  buildTrackingUrl,
} from "../tracking";
import { checkLeadEligibility, isValidEmailSyntax } from "../eligibility";
import { canSendCount } from "../quota";
import { getSiteUrl, toAbsoluteUrl, isInternalUrl } from "@/lib/url";
import {
  createDefaultEmailDocument,
  createTextBlock,
  createButtonBlock,
  createProductBlock,
  createProductGridBlock,
  createCouponBlock,
} from "../document-defaults";
import { renderEmailDocument } from "../document-renderer";
import { validateEmailDocument } from "../document-validation";
import { formatCampaignVisitorTelegramMessage } from "@/lib/visitors/format-campaign-telegram";
import { formatFirstVisitTelegramMessage } from "@/lib/visitors/format-telegram";

describe("Email Token Resolution & Rendering", () => {
  it("resolves basic lead and product tokens", () => {
    const template = "Hi {{firstName}}, check out {{productName}} for {{productPrice}}!";
    const resolved = resolveTokens(template, {
      firstName: "Sarah",
      productName: "AirPods Pro",
      productPrice: "$249.00",
    });
    assert.equal(resolved, "Hi Sarah, check out AirPods Pro for $249.00!");
  });

  it("leaves unsupplied tokens intact so missing tokens can be detected", () => {
    const template = "Hello {{firstName}}, your code is {{promoCode}}.";
    const resolved = resolveTokens(template, { firstName: "Sarah" });
    assert.equal(resolved, "Hello Sarah, your code is {{promoCode}}.");
  });

  it("detects missing required tokens in content", () => {
    const template = "Hello {{firstName}}, view {{productName}} at {{productUrl}}";
    const resolved = resolveTokens(template, { firstName: "Alex" });
    const missing = detectMissingTokens(resolved);
    assert.deepEqual(missing.sort(), ["productName", "productUrl"].sort());
  });

  it("renders both responsive HTML container and plain text version", () => {
    const rendered = renderEmail({
      subject: "Special Offer: {{productName}}",
      body: "Hello {{firstName}}, here is our latest product.",
      previewText: "Don't miss out on {{productName}}",
      product: {
        name: "Mechanical Keyboard",
        price: 120,
      },
      recipient: {
        email: "jordan@example.com",
        firstName: "Jordan",
      },
      footerCopy: "You received this email from Store.",
      companyAddress: "123 Market St, New York, NY",
    });

    assert.ok(rendered.subject.includes("Mechanical Keyboard"));
    assert.ok(rendered.html.includes("Jordan"));
    assert.ok(rendered.html.includes("Mechanical Keyboard"));
    assert.ok(rendered.text.includes("Jordan"));
    assert.ok(rendered.text.includes("123 Market St, New York, NY"));
  });
});

describe("Deterministic SMTP Error Classification", () => {
  it("classifies 550 as RECIPIENT_REJECTED (non-retryable)", () => {
    const err = new Error("550 5.1.1 User unknown");
    (err as any).responseCode = 550;
    const classified = classifySmtpError(err);
    assert.equal(classified.category, "RECIPIENT_REJECTED");
    assert.equal(classified.retryable, false);
    assert.equal(classified.smtpCode, 550);
  });

  it("classifies 554 as RECIPIENT_REJECTED (non-retryable)", () => {
    const err = new Error("554 5.7.1 Message rejected");
    (err as any).responseCode = 554;
    const classified = classifySmtpError(err);
    assert.equal(classified.category, "RECIPIENT_REJECTED");
    assert.equal(classified.retryable, false);
  });

  it("classifies 421 and rate limits as RATE_LIMIT and retryable", () => {
    const err421 = new Error("421 4.4.2 Service not available, rate limit exceeded");
    (err421 as any).responseCode = 421;
    const classified421 = classifySmtpError(err421);
    assert.equal(classified421.category, "RATE_LIMIT");
    assert.equal(classified421.retryable, true);
  });

  it("classifies connection timeout as TIMEOUT and retryable", () => {
    const netErr = new Error("Connection timed out after 30000ms");
    (netErr as any).code = "ETIMEDOUT";
    const classified = classifySmtpError(netErr);
    assert.equal(classified.category, "TIMEOUT");
    assert.equal(classified.retryable, true);
  });
});

describe("HMAC Tracking & Unsubscribe Cryptographic Tokens", () => {
  it("generates and verifies valid tracking click token", () => {
    const token = createTrackingToken({
      m: "msg_456",
      c: "camp_123",
      u: "https://example.com/products/headphones",
      t: Date.now(),
    });

    assert.ok(token);
    const verified = verifyTrackingToken(token);
    assert.ok(verified);
    assert.equal(verified?.c, "camp_123");
    assert.equal(verified?.m, "msg_456");
    assert.equal(verified?.u, "https://example.com/products/headphones");
  });

  it("rejects tampered click tracking tokens", () => {
    const token = createTrackingToken({
      m: "msg_456",
      c: "camp_123",
      u: "https://example.com/products/headphones",
      t: Date.now(),
    });

    // Tamper with payload
    const tampered = token.slice(0, 10) + "X" + token.slice(11);
    const verified = verifyTrackingToken(tampered);
    assert.equal(verified, null);
  });

  it("generates and verifies unsubscribe tokens", () => {
    const unsubToken = createUnsubscribeToken("user@example.com", "lead_789");

    assert.ok(unsubToken);
    const verified = verifyUnsubscribeToken(unsubToken);
    assert.ok(verified);
    assert.equal(verified?.leadId, "lead_789");
    assert.equal(verified?.email, "user@example.com");
  });
});

describe("Email Syntax and Lead Eligibility Rules", () => {
  it("validates RFC-compliant email syntax strictly", () => {
    assert.equal(isValidEmailSyntax("customer@example.com"), true);
    assert.equal(isValidEmailSyntax("user.name+tag@domain.co.uk"), true);
    assert.equal(isValidEmailSyntax("invalid-at-sign"), false);
    assert.equal(isValidEmailSyntax("@nodomain.com"), false);
    assert.equal(isValidEmailSyntax("no-tld@domain"), false);
    assert.equal(isValidEmailSyntax(""), false);
  });

  it("rejects leads without email address", async () => {
    const result = await checkLeadEligibility({ firstName: "NoEmail" });
    assert.equal(result.eligible, false);
    assert.ok(result.reasons.includes("MISSING_EMAIL"));
  });

  it("rejects leads with invalid email format", async () => {
    const result = await checkLeadEligibility({ email: "not-an-email" });
    assert.equal(result.eligible, false);
    assert.ok(result.reasons.includes("INVALID_EMAIL_SYNTAX"));
  });

  it("rejects leads marked suppressed", async () => {
    const result = await checkLeadEligibility({
      email: "test@example.com",
      isSuppressed: true,
      suppressionReason: "MANUAL_BLOCK",
    });
    assert.equal(result.eligible, false);
    assert.ok(result.reasons.includes("SUPPRESSED_MANUAL_BLOCK"));
  });

  it("rejects leads currently within the cooldown window", async () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days in future
    const result = await checkLeadEligibility({
      email: "cleanlead@example.com",
      cooldownUntil: futureDate,
      lastEmailSentAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    });
    assert.equal(result.eligible, false);
    assert.ok(result.reasons.includes("COOLDOWN_ACTIVE"));
  });
});

describe("Outreach Quota Checks", () => {
  it("determines if count can be sent within daily quota", async () => {
    const check = await canSendCount(1);
    assert.ok(typeof check.allowed === "boolean");
    assert.ok(typeof check.remaining === "number");
  });
});

describe("Central Site URL & Domain Resolution", () => {
  it("returns configured site URL", () => {
    const siteUrl = getSiteUrl();
    assert.ok(siteUrl.startsWith("http"));
    assert.equal(siteUrl.endsWith("/"), false);
  });

  it("converts relative paths to absolute URLs correctly", () => {
    const abs = toAbsoluteUrl("/products/wireless-headphones");
    const siteUrl = getSiteUrl();
    assert.equal(abs, `${siteUrl}/products/wireless-headphones`);
  });

  it("preserves already absolute URLs", () => {
    const abs = toAbsoluteUrl("https://external-store.com/item");
    assert.equal(abs, "https://external-store.com/item");
  });

  it("preserves query parameters and UTM tags", () => {
    const abs = toAbsoluteUrl("/products/smartwatch?utm_source=email&utm_campaign=summer");
    const siteUrl = getSiteUrl();
    assert.equal(abs, `${siteUrl}/products/smartwatch?utm_source=email&utm_campaign=summer`);
  });

  it("correctly identifies internal vs external URLs", () => {
    const siteUrl = getSiteUrl();
    assert.equal(isInternalUrl("/products"), true);
    assert.equal(isInternalUrl(`${siteUrl}/cart`), true);
    assert.equal(isInternalUrl("https://malicious-phishing.com"), false);
  });
});

describe("Extended Tracking Payload with Product & Link Types", () => {
  it("builds and verifies tracking token with product and block metadata", () => {
    const payload = {
      m: "msg_999",
      c: "camp_888",
      l: "lead_777",
      u: "https://findora.market/products/sneakers",
      t: Date.now(),
      p: "prod_123",
      pn: "Ultra Runner Sneakers",
      lt: "PRODUCT_CTA",
      bi: "blk_456",
    };

    const token = createTrackingToken(payload);
    assert.ok(token);

    const verified = verifyTrackingToken(token);
    assert.ok(verified);
    assert.equal(verified?.m, "msg_999");
    assert.equal(verified?.c, "camp_888");
    assert.equal(verified?.p, "prod_123");
    assert.equal(verified?.pn, "Ultra Runner Sneakers");
    assert.equal(verified?.lt, "PRODUCT_CTA");
    assert.equal(verified?.bi, "blk_456");
  });

  it("buildTrackingUrl includes all UTM and tracking parameters", () => {
    const url = buildTrackingUrl({
      targetUrl: "/products/classic-watch",
      emailMessageId: "msg_abc",
      campaignId: "camp_xyz",
      productId: "prod_99",
      productName: "Classic Watch",
      linkType: "PRODUCT_IMAGE",
      utmSource: "outreach",
      utmCampaign: "spring_sale",
    });

    assert.ok(url.includes("/api/v1/email/c/"));
  });
});

describe("Campaign Attribution Telegram Intelligence", () => {
  it("differentiates campaign visitor message with high-priority header and arrival info", () => {
    const ctx = {
      ip: "103.255.4.1",
      path: "/products/air-jordan",
      country: "Pakistan",
      countryCode: "PK",
      city: "Lahore",
      region: "Punjab",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      isBot: false,
    };

    const campaignAttr = {
      isCampaignVisit: true,
      campaignName: "End of Season Sale",
      productName: "Air Jordan Retro",
      linkType: "PRODUCT_CTA",
      howTheyCame: 'Clicked product CTA button for "Air Jordan Retro"',
      utmSource: "email_outreach",
      utmCampaign: "eos_clearance",
    };

    const campaignMsg = formatCampaignVisitorTelegramMessage(ctx as any, campaignAttr);
    assert.ok(campaignMsg.includes("EMAIL CAMPAIGN VISITOR"));
    assert.ok(campaignMsg.includes("🚨🔥"));
    assert.ok(campaignMsg.includes("End of Season Sale"));
    assert.ok(campaignMsg.includes("Air Jordan Retro"));
    assert.ok(campaignMsg.includes('Clicked product CTA button for "Air Jordan Retro"'));
    assert.ok(campaignMsg.includes("email_outreach"));

    // Normal message does NOT have campaign alert header
    const normalMsg = formatFirstVisitTelegramMessage(ctx as any);
    assert.ok(!normalMsg.includes("EMAIL CAMPAIGN VISITOR"));
    assert.ok(normalMsg.includes("New visitor"));
  });
});

describe("Structured Email Document Schema & Validation", () => {
  it("validates a healthy EmailDocument with zero blocking errors", () => {
    const doc = createDefaultEmailDocument("Special Sale Announcement");
    const val = validateEmailDocument(doc);
    assert.equal(val.isValid, true);
    assert.equal(val.errors.length, 0);
  });

  it("catches missing subject line as blocking error", () => {
    const doc = createDefaultEmailDocument("");
    const val = validateEmailDocument(doc);
    assert.equal(val.isValid, false);
    assert.ok(val.errors.some((e) => e.includes("Subject line is required")));
  });

  it("catches empty email sections as blocking error", () => {
    const doc = createDefaultEmailDocument("Subject");
    doc.sections = [];
    const val = validateEmailDocument(doc);
    assert.equal(val.isValid, false);
    assert.ok(val.errors.some((e) => e.includes("Email must have at least one visible content section")));
  });
});

describe("Structured Document Renderer (HTML & Text)", () => {
  it("renders email-safe HTML table with inline styles and personalization", () => {
    const doc = createDefaultEmailDocument("Exclusive offer for {{firstName}}");
    doc.previewText = "Save big on your next order";
    doc.sections = [
      createTextBlock({
        text: "Hi {{firstName}}, check out our latest store drop!",
        headingLevel: "h1",
        fontSize: 24,
      }),
      createProductBlock("prod_88", {
        name: "Wireless ANC Headphones",
        slug: "wireless-anc-headphones",
        price: 9999,
        salePrice: 7999,
        currency: "Rs",
        description: "Active noise cancelling with 40h battery life.",
      }),
      createButtonBlock({
        text: "Shop Headphones",
        url: "/products/wireless-anc-headphones",
        linkType: "PRODUCT_CTA",
      }),
      createCouponBlock({
        code: "SUMMER25",
        title: "25% OFF Code",
        discountAmount: "25% OFF",
      }),
    ];

    const result = renderEmailDocument(doc, {
      personalization: {
        firstName: "Zubair",
        email: "zubair@example.com",
      },
      recipientEmail: "zubair@example.com",
    });

    assert.ok(result.subject.includes("Zubair"));
    assert.ok(result.html.includes("Hi Zubair"));
    assert.ok(result.html.includes("Wireless ANC Headphones"));
    assert.ok(result.html.includes("7,999"));
    assert.ok(result.html.includes("SUMMER25"));
    assert.ok(result.html.includes("Shop Headphones"));
    assert.ok(result.html.includes("Unsubscribe"));

    // Plain text output
    assert.ok(result.text.includes("Hi Zubair"));
    assert.ok(result.text.includes("Wireless ANC Headphones"));
    assert.ok(result.text.includes("SUMMER25"));
    assert.ok(result.text.includes("Unsubscribe"));
  });
});

describe("Multilingual & Multi-Currency Email Rendering", () => {
  it("renders localized translation variant when targetLocale matches", () => {
    const doc = createDefaultEmailDocument("Hello {{firstName}}! Exclusive Flash Sale");
    doc.previewText = "Don't miss our summer sale";
    doc.sections = [
      createTextBlock({ text: "Welcome to our online store!" }),
      createProductBlock(
        "prod_test",
        { name: "Wireless ANC Headphones", slug: "wireless-anc-headphones", price: 100 },
        "image-top",
        { ctaText: "Buy Now" }
      ),
    ];

    // Add French translation variant
    doc.translations = {
      fr: {
        locale: "fr",
        subject: "Bonjour {{firstName}} ! Vente Flash Exclusive",
        previewText: "Ne manquez pas nos soldes d'été",
        sections: [
          createTextBlock({ text: "Bienvenue sur notre boutique en ligne !" }),
          createProductBlock(
            "prod_test",
            { name: "Wireless ANC Headphones", slug: "wireless-anc-headphones", price: 100 },
            "image-top",
            { ctaText: "Acheter maintenant" }
          ),
        ],
        direction: "ltr",
      },
    };

    // Render for French recipient
    const rendered = renderEmailDocument(doc, {
      targetLocale: "fr",
      personalization: { firstName: "Amélie" },
    });

    assert.equal(rendered.subject, "Bonjour Amélie ! Vente Flash Exclusive");
    assert.equal(rendered.previewText, "Ne manquez pas nos soldes d'été");
    assert.ok(rendered.html.includes("Bienvenue sur notre boutique en ligne !"));
    assert.ok(rendered.html.includes("Acheter maintenant"));
    assert.ok(rendered.html.includes('lang="fr"'));
  });

  it("applies RTL direction for Arabic and Urdu recipients", () => {
    const doc = createDefaultEmailDocument("Welcome");
    doc.sections = [createTextBlock({ text: "Hello" })];

    doc.translations = {
      ar: {
        locale: "ar",
        subject: "مرحباً بك",
        sections: [createTextBlock({ text: "أهلاً وسهلاً" })],
        direction: "rtl",
      },
    };

    const rendered = renderEmailDocument(doc, {
      targetLocale: "ar",
    });

    assert.ok(rendered.html.includes('dir="rtl"'));
    assert.ok(rendered.html.includes('lang="ar"'));
    assert.equal(rendered.subject, "مرحباً بك");
  });

  it("converts product price dynamically based on targetCurrency and exchangeRates", () => {
    const doc = createDefaultEmailDocument("Great Deals");
    doc.sections = [
      createProductBlock(
        "prod_test",
        { name: "Premium Leather Jacket", slug: "premium-leather-jacket", price: 100 },
        "image-top",
        { ctaText: "Order Now" }
      ),
    ];

    const rates = {
      USD: 1,
      EUR: 0.92,
      GBP: 0.8,
      AED: 3.67,
      PKR: 278,
    };

    // Render in EUR
    const eurResult = renderEmailDocument(doc, {
      targetCurrency: "EUR",
      exchangeRates: rates,
    });
    // 100 * 0.92 = 92 EUR
    assert.ok(eurResult.html.includes("92") || eurResult.html.includes("€92"));
    // Ensure no double symbol like $$
    assert.ok(!eurResult.html.includes("$$"));
    assert.ok(!eurResult.html.includes("€€"));

    // Render in AED
    const aedResult = renderEmailDocument(doc, {
      targetCurrency: "AED",
      exchangeRates: rates,
    });
    // 100 * 3.67 = 367 AED
    assert.ok(aedResult.html.includes("367"));
  });

  it("renders translated product titles and product grid item names accurately", () => {
    const doc = createDefaultEmailDocument("Exclusive Collection");
    doc.sections = [
      createProductBlock(
        "prod_leather",
        { name: "Men's Luxury Leather Jacket", slug: "mens-luxury-leather-jacket", price: 250, description: "Handcrafted Italian leather" },
        "image-top",
        { ctaText: "Shop Now" }
      ),
      createProductGridBlock({
        title: "Trending Items",
        items: [
          {
            id: "grid_1",
            productId: "prod_1",
            name: "Wireless Noise Cancelling Earbuds",
            slug: "wireless-earbuds",
            price: 79,
            badge: "Best Seller",
          },
          {
            id: "grid_2",
            productId: "prod_2",
            name: "Smart Fitness Watch",
            slug: "smart-watch",
            price: 120,
            badge: "New",
          },
        ],
      }),
    ];

    // Arabic translation with fully localized product titles
    doc.translations = {
      ar: {
        locale: "ar",
        subject: "تشكيلة حصرية فاخرة",
        direction: "rtl",
        sections: [
          createProductBlock(
            "prod_leather",
            {
              name: "جاكيت جلد رجالي فاخر",
              slug: "mens-luxury-leather-jacket",
              price: 250,
              description: "مصنوع يدوياً من الجلد الإيطالي الفاخر",
            },
            "image-top",
            {
              displayTitle: "جاكيت جلد رجالي فاخر",
              displayDescription: "مصنوع يدوياً من الجلد الإيطالي الفاخر",
              ctaText: "تسوق الآن",
            }
          ),
          createProductGridBlock({
            title: "المنتجات الأكثر رواجاً",
            items: [
              {
                id: "grid_1",
                productId: "prod_1",
                name: "سماعات أذن لاسلكية عازلة للضوضاء",
                slug: "wireless-earbuds",
                price: 79,
                badge: "الأكثر مبيعاً",
              },
              {
                id: "grid_2",
                productId: "prod_2",
                name: "ساعة ذكية للياقة البدنية",
                slug: "smart-watch",
                price: 120,
                badge: "جديد",
              },
            ],
          }),
        ],
      },
    };

    const rendered = renderEmailDocument(doc, {
      targetLocale: "ar",
    });

    // Verify product title translated in HTML & Text
    assert.ok(rendered.html.includes("جاكيت جلد رجالي فاخر"), "HTML should contain translated product title");
    assert.ok(rendered.html.includes("مصنوع يدوياً من الجلد الإيطالي الفاخر"), "HTML should contain translated product description");
    assert.ok(rendered.html.includes("سماعات أذن لاسلكية عازلة للضوضاء"), "HTML should contain translated grid product title 1");
    assert.ok(rendered.html.includes("ساعة ذكية للياقة البدنية"), "HTML should contain translated grid product title 2");
    assert.ok(rendered.html.includes("الأكثر مبيعاً"), "HTML should contain translated badge");
    assert.ok(rendered.html.includes("المنتجات الأكثر رواجاً"), "HTML should contain translated grid section title");
    assert.ok(rendered.html.includes("تسوق الآن"), "HTML should contain translated CTA");

    // Plain text check
    assert.ok(rendered.text.includes("جاكيت جلد رجالي فاخر"), "Text version should include translated product title");
    assert.ok(rendered.text.includes("سماعات أذن لاسلكية عازلة للضوضاء"), "Text version should include translated grid product title 1");
  });
});


