export interface VisitorStreamRecord {
  _id: string;
  ip?: string;
  geo?: {
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
    zip?: string;
    lat?: number;
    lon?: number;
    timezone?: string;
    isp?: string;
    org?: string;
    proxy?: boolean;
    mobile?: boolean;
    hosting?: boolean;
  };
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
  visitedAt: string;
}

export type VisitorStreamEvent =
  | { type: "connected" }
  | { type: "visitor"; visitor: VisitorStreamRecord }
  | { type: "deleted"; id: string }
  | { type: "error"; message: string };
