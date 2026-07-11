export interface VisitorGeoDetails {
  ip: string;
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

export interface FirstVisitClientPayload {
  path?: string;
  referrer?: string | null;
  screen?: string;
  viewport?: string;
  language?: string;
  timezone?: string;
  platform?: string;
}

export interface FirstVisitContext extends FirstVisitClientPayload {
  userAgent: string;
  acceptLanguage?: string;
  geo: VisitorGeoDetails | null;
  visitedAt: string;
  storeName?: string;
}
