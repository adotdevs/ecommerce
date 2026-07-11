import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IVisitorGeo {
  continent?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  district?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  offset?: number;
  currency?: string;
  isp?: string;
  org?: string;
  as?: string;
  asname?: string;
  reverse?: string;
  mobile?: boolean;
  proxy?: boolean;
  hosting?: boolean;
}

export interface IVisitorLog extends Document {
  ip?: string;
  geo?: IVisitorGeo;
  landingPath?: string;
  referrer?: string;
  userAgent: string;
  browser?: string;
  os?: string;
  device?: string;
  language?: string;
  acceptLanguage?: string;
  screen?: string;
  viewport?: string;
  timezone?: string;
  platform?: string;
  telegramSent: boolean;
  visitedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const VisitorGeoSchema = new Schema<IVisitorGeo>(
  {
    continent: String,
    country: String,
    countryCode: String,
    region: String,
    city: String,
    district: String,
    zip: String,
    lat: Number,
    lon: Number,
    timezone: String,
    offset: Number,
    currency: String,
    isp: String,
    org: String,
    as: String,
    asname: String,
    reverse: String,
    mobile: Boolean,
    proxy: Boolean,
    hosting: Boolean,
  },
  { _id: false }
);

const VisitorLogSchema = new Schema<IVisitorLog>(
  {
    ip: { type: String, index: true },
    geo: VisitorGeoSchema,
    landingPath: String,
    referrer: String,
    userAgent: { type: String, required: true },
    browser: String,
    os: String,
    device: String,
    language: String,
    acceptLanguage: String,
    screen: String,
    viewport: String,
    timezone: String,
    platform: String,
    telegramSent: { type: Boolean, default: false },
    visitedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

VisitorLogSchema.index({ "geo.countryCode": 1, visitedAt: -1 });
VisitorLogSchema.index({ createdAt: -1 });

if (mongoose.models.VisitorLog) {
  delete mongoose.models.VisitorLog;
}

export const VisitorLog: Model<IVisitorLog> = mongoose.model<IVisitorLog>(
  "VisitorLog",
  VisitorLogSchema
);
