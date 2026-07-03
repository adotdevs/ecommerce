/**
 * Atlas Search Index Setup
 *
 * Run this after connecting to MongoDB Atlas.
 * Creates the products_search index for full-text search with typo tolerance.
 *
 * In Atlas UI: Search → Create Index → JSON Editor:
 *
 * {
 *   "mappings": {
 *     "dynamic": false,
 *     "fields": {
 *       "name": { "type": "string", "analyzer": "lucene.standard" },
 *       "description": { "type": "string" },
 *       "tags": { "type": "string" },
 *       "brandName": { "type": "string" },
 *       "categoryNames": { "type": "string" },
 *       "status": { "type": "string" },
 *       "pricing.price": { "type": "number" }
 *     }
 *   }
 * }
 *
 * Index name: products_search
 * Collection: products
 * Database: ecommerce
 *
 * The app falls back to MongoDB text indexes if Atlas Search is unavailable.
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

import { connectDB } from "../src/lib/db/mongoose";

async function setupSearchIndex() {
  await connectDB();
  console.log("Connected to MongoDB");
  console.log("\nAtlas Search Index Configuration:");
  console.log("================================");
  console.log("Index Name: products_search");
  console.log("Collection: products");
  console.log("\nCreate this index in MongoDB Atlas UI → Search → Create Index");
  console.log("Or use the MongoDB MCP plugin: atlas-connect-cluster + create-index");
  console.log("\nFallback: MongoDB text index on products collection is already configured in the Product model.");
  process.exit(0);
}

setupSearchIndex().catch(console.error);
