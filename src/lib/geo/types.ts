export interface GeoPreferences {
  country: string;
  currency: string;
  locale: string;
}

export interface IpApiResult {
  status: string;
  countryCode?: string;
  currency?: string;
  query?: string;
}
