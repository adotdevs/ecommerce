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
  /** UTM params from landing URL (sent by client for attribution) */
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

export interface FirstVisitContext extends FirstVisitClientPayload {
  userAgent: string;
  acceptLanguage?: string;
  geo: VisitorGeoDetails | null;
  visitedAt: string;
  storeName?: string;
}

/**
 * Campaign attribution data resolved from the `em_attr` cookie and/or UTM params.
 * Attached to visitor logs when a user arrives from a marketing email / campaign.
 */
export interface CampaignAttribution {
  isCampaignVisit: boolean;
  campaignId?: string;
  campaignName?: string;
  emailMessageId?: string;
  leadId?: string;
  productId?: string;
  productName?: string;
  linkType?: string;
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  campaignClickedAt?: string;
  marketingSource?: string;
  /** Human-readable description: "Clicked product CTA from campaign email" */
  howTheyCame?: string;
}
