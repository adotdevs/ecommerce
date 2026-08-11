import { htmlToDiscordMarkdown } from "@/lib/notifications/html-to-plain";
import { parseEnvList } from "@/lib/notifications/parse-env-list";

function getDiscordWebhookUrls(): string[] {
  return parseEnvList(
    [
      process.env.DISCORD_WEBHOOK_URL,
      process.env.DISCORD_WEBHOOK_URLS,
      process.env.DISCORD_WEBHOOK_URL_LIST,
    ]
      .filter(Boolean)
      .join(",")
  );
}

async function postDiscordWebhook(
  webhookUrl: string,
  subject: string,
  html: string
): Promise<boolean> {
  const payload: { content: string; username?: string } = {
    content: htmlToDiscordMarkdown(subject, html),
  };

  const username = process.env.DISCORD_WEBHOOK_USERNAME?.trim();
  if (username) {
    payload.username = username.slice(0, 80);
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendDiscordAlert(
  subject: string,
  html: string
): Promise<boolean> {
  const webhookUrls = getDiscordWebhookUrls();
  if (webhookUrls.length === 0) return false;

  const results = await Promise.all(
    webhookUrls.map((url) => postDiscordWebhook(url, subject, html))
  );

  return results.some(Boolean);
}
