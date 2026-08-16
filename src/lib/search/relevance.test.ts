import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rankProducts, scoreProductAgainstQuery } from "./relevance";
import { normalizeQuery } from "./normalize";
import { correctToken } from "./vocabulary";

function product(
  id: string,
  name: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    _id: id,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    sku: extra.sku ?? id.toUpperCase(),
    brandName: extra.brandName ?? "",
    categoryNames: extra.categoryNames ?? [],
    tags: extra.tags ?? [],
    featured: extra.featured ?? false,
    ...extra,
  };
}

const catalog = [
  product("washer", "Whirlpool 3.5 Cu. Ft. Top Load Washing Machine, White", {
    brandName: "Whirlpool",
    categoryNames: ["Appliances"],
    featured: true,
    sku: "WH-WASH-35",
  }),
  product("mac-neo", "Apple 2026 Macbook Neo 13-Inch Laptop", {
    brandName: "Apple",
    categoryNames: ["Laptops"],
    featured: true,
    sku: "MB-NEO-13",
  }),
  product("mac-pro", "Apple 2025 Macbook Pro Laptop", {
    brandName: "Apple",
    categoryNames: ["Laptops"],
    featured: true,
    sku: "MB-PRO-25",
  }),
  product("polo", "French Toast Kids' Pique Polo", {
    brandName: "French Toast",
    categoryNames: ["Kids Clothing"],
    tags: ["shirt"],
    featured: true,
    sku: "FT-POLO",
  }),
  product("tee", "Classic Cotton T-Shirt", {
    brandName: "Hanes",
    categoryNames: ["Apparel"],
    sku: "HN-TEE",
  }),
  product("iphone", "Apple iPhone 15 Pro Max", {
    brandName: "Apple",
    categoryNames: ["Smartphones"],
    sku: "IP15PM",
  }),
  product("iphone-case", "iPhone 15 Pro Max Silicone Case", {
    brandName: "Apple",
    categoryNames: ["Phone Cases"],
    tags: ["case"],
    sku: "IP15CASE",
  }),
  product("s24", "Samsung Galaxy S24 Ultra", {
    brandName: "Samsung",
    categoryNames: ["Smartphones"],
    sku: "SM-S24U",
  }),
  product("charger", "USB-C Fast Charger 20W", {
    brandName: "Anker",
    categoryNames: ["Chargers"],
    tags: ["iphone"],
    sku: "ANK-20W",
  }),
  product("shoes", "Nike Men's Running Shoes", {
    brandName: "Nike",
    categoryNames: ["Shoes"],
    sku: "NK-RUN",
  }),
  product("headphones", "Wireless Bluetooth Headphones", {
    brandName: "Sony",
    categoryNames: ["Audio"],
    sku: "SN-BT",
  }),
  product("wallet", "Men's Leather Wallet", {
    brandName: "Fossil",
    categoryNames: ["Accessories"],
    sku: "WAL-1",
  }),
];

function ids(query: string) {
  return rankProducts(catalog, query).map((row) => String(row.product._id));
}

describe("ecommerce search relevance", () => {
  it("keeps shirts and rejects washers and laptops for shirt", () => {
    const found = ids("shirt");
    assert.ok(found.includes("polo"));
    assert.ok(found.includes("tee"));
    assert.ok(!found.includes("washer"));
    assert.ok(!found.includes("mac-neo"));
    assert.ok(!found.includes("mac-pro"));
  });

  it("is case insensitive", () => {
    const found = ids("APPLE IPHONE");
    assert.equal(found[0], "iphone");
  });

  it("finds a product from a title typo", () => {
    const found = ids("iphnoe");
    assert.ok(found.includes("iphone"));
  });

  it("finds leather wallet despite multiple typos after correction", () => {
    const vocab = new Set(["leather", "wallet", "men"]);
    const corrected = ["lether", "walet"].map((t) => correctToken(t, vocab)).join(" ");
    assert.equal(corrected, "leather wallet");
    const found = ids(corrected);
    assert.ok(found.includes("wallet"));
  });

  it("matches a 3-letter prefix to iPhone", () => {
    const found = ids("iph");
    assert.ok(found.includes("iphone"));
  });

  it("returns only Samsung products for brand Samsung", () => {
    const found = ids("Samsung");
    assert.ok(found.includes("s24"));
    assert.ok(!found.includes("iphone"));
    assert.ok(!found.includes("shoes"));
  });

  it("ranks Samsung S24 Ultra first for brand + model", () => {
    const found = ids("Samsung S24 Ultra");
    assert.equal(found[0], "s24");
  });

  it("does not autocorrect model tokens like S24", () => {
    const vocab = new Set(["sale", "salt", "samsung"]);
    assert.equal(correctToken("s24", vocab), "s24");
  });

  it("ranks exact SKU first", () => {
    const found = ids("IP15PM");
    assert.equal(found[0], "iphone");
  });

  it("finds a 20W charger from a unit-style query", () => {
    const q = normalizeQuery("20 watt iphone charger");
    assert.ok(q.meaningfulTokens.includes("20w"));
    const found = ids("20 watt iphone charger");
    assert.ok(found.includes("charger"));
  });

  it("matches the cellphone synonym to a smartphone", () => {
    const found = ids("cell phone");
    assert.ok(found.includes("iphone") || found.includes("s24"));
  });

  it("treats singular and plural as the same", () => {
    const found = ids("running shoe");
    assert.ok(found.includes("shoes"));
  });

  it("ignores word order", () => {
    const found = ids("max pro iphone 15");
    assert.equal(found[0], "iphone");
  });

  it("ranks the core phone above its case", () => {
    const found = ids("iphone 15 pro max");
    assert.ok(found.indexOf("iphone") < found.indexOf("iphone-case"));
    assert.equal(found[0], "iphone");
  });

  it("ranks the case first when the query asks for a case", () => {
    const found = ids("iphone 15 pro max case");
    assert.equal(found[0], "iphone-case");
  });

  it("does not return wallets or shoes for iphone", () => {
    const found = ids("iphone");
    assert.ok(found.includes("iphone"));
    assert.ok(!found.includes("wallet"));
    assert.ok(!found.includes("shoes"));
    assert.ok(!found.includes("washer"));
  });

  it("returns nothing for a nonsense query", () => {
    assert.deepEqual(ids("xyzzynonsense"), []);
  });

  it("matches bluetooth earphones to headphones via synonym", () => {
    const found = ids("bluetooth earphones");
    assert.ok(found.includes("headphones"));
  });

  it("does not match appliances from a short app prefix", () => {
    const found = ids("app");
    assert.ok(!found.includes("washer"));
    assert.ok(found.includes("iphone") || found.includes("mac-neo"));
  });

  it("rejects a featured washer that only shares a stopword", () => {
    const hit = scoreProductAgainstQuery(
      catalog.find((p) => p._id === "washer")!,
      normalizeQuery("shirt")
    );
    assert.equal(hit, null);
  });
});
