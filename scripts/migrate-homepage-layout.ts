/**
 * Migrates homepage to reference layout.
 * Run: npx tsx scripts/migrate-homepage-layout.ts
 */
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

import mongoose from "mongoose";
import { HomepageSection } from "../src/models/HomepageSection";
import { REFERENCE_HOMEPAGE_SECTIONS } from "./homepage-reference-layout";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Set MONGODB_URI in .env.local");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("Connected. Migrating homepage layout...");

  await HomepageSection.deleteMany({});
  await HomepageSection.insertMany(REFERENCE_HOMEPAGE_SECTIONS);
  console.log(`Inserted ${REFERENCE_HOMEPAGE_SECTIONS.length} reference homepage sections.`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
