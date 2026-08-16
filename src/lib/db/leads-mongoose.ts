import mongoose, { type Connection } from "mongoose";

interface LeadsMongooseCache {
  conn: Connection | null;
  promise: Promise<Connection> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var leadsMongooseCache: LeadsMongooseCache | undefined;
}

const cached: LeadsMongooseCache = global.leadsMongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global.leadsMongooseCache) {
  global.leadsMongooseCache = cached;
}

/** Atlas placeholder host — not a real cluster. */
const PLACEHOLDER_HOSTS = new Set([
  "cluster.mongodb.net",
  "cluster0.mongodb.net",
]);

function assertValidMongoUri(uri: string, envName: string) {
  const srvMatch = uri.match(/^mongodb\+srv:\/\/[^/]+@([^/?]+)/);
  const stdMatch = uri.match(/^mongodb:\/\/[^/]+@([^/?]+)/);
  const host = (srvMatch?.[1] ?? stdMatch?.[1] ?? "").split(",")[0]?.trim();

  if (!host) {
    throw new Error(
      `${envName} is malformed. Copy the full connection string from Atlas → Connect → Drivers.`
    );
  }

  if (PLACEHOLDER_HOSTS.has(host) || host === "mongodb.net") {
    throw new Error(
      `${envName} uses placeholder host "${host}". Replace it with your real Atlas host.`
    );
  }
}

/** Separate Mongo connection for CRM / marketing leads (2nd account). */
export async function connectLeadsDB(): Promise<Connection> {
  const uri = process.env.MONGODB_LEADS_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_LEADS_URI is not configured. Set it in .env.local (development) or Vercel env vars (production)."
    );
  }

  assertValidMongoUri(uri, "MONGODB_LEADS_URI");

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .createConnection(uri, { bufferCommands: false })
      .asPromise();
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
