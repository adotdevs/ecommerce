import { sendTelegramMessage } from "@/lib/telegram/notify";
import { sendEmailAlert } from "@/lib/notifications/email";
import { sendDiscordAlert } from "@/lib/notifications/discord";

export interface AlertDeliveryResult {
  telegram: boolean;
  email: boolean;
  discord: boolean;
  sent: boolean;
  reason: string;
}

export async function sendAlert(
  subject: string,
  html: string
): Promise<AlertDeliveryResult> {
  const [telegram, email, discord] = await Promise.all([
    sendTelegramMessage(html),
    sendEmailAlert(subject, html),
    sendDiscordAlert(subject, html),
  ]);

  const channels: string[] = [];
  if (telegram) channels.push("telegram");
  if (email) channels.push("email");
  if (discord) channels.push("discord");

  return {
    telegram,
    email,
    discord,
    sent: channels.length > 0,
    reason: channels.length > 0 ? channels.join(",") : "not_configured",
  };
}
