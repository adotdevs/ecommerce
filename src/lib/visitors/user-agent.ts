export function parseUserAgent(userAgent: string): {
  browser: string;
  os: string;
  device: string;
} {
  const ua = userAgent || "Unknown";

  let browser = "Unknown browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";

  let os = "Unknown OS";
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let device = "Desktop";
  if (/iPad|Tablet/i.test(ua)) device = "Tablet";
  else if (/Mobile|iPhone|Android/i.test(ua)) device = "Mobile";

  return { browser, os, device };
}

const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|preview|headless|lighthouse|pingdom|gtmetrix/i;

export function isLikelyBot(userAgent: string): boolean {
  return BOT_PATTERN.test(userAgent);
}
