import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

/** Atlas placeholder host — not a real cluster. */
const PLACEHOLDER_HOSTS = new Set([
  "cluster.mongodb.net",
  "cluster0.mongodb.net",
]);

function assertValidMongoUri(uri: string) {
  const srvMatch = uri.match(/^mongodb\+srv:\/\/[^/]+@([^/?]+)/);
  const stdMatch = uri.match(/^mongodb:\/\/[^/]+@([^/?]+)/);
  const host = (srvMatch?.[1] ?? stdMatch?.[1] ?? "").split(",")[0]?.trim();

  if (!host) {
    throw new Error(
      "MONGODB_URI is malformed. Copy the full connection string from Atlas → Connect → Drivers."
    );
  }

  if (PLACEHOLDER_HOSTS.has(host) || host === "mongodb.net") {
    throw new Error(
      `MONGODB_URI uses placeholder host "${host}". Replace it with your real Atlas host (e.g. cluster0.xxxxx.mongodb.net) from the Atlas dashboard.`
    );
  }
}

export async function connectDB(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not configured. Set it in .env.local (development) or Vercel project environment variables (production)."
    );
  }

  assertValidMongoUri(MONGODB_URI);

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
