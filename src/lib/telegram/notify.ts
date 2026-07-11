function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function line(label: string, value?: string | number | boolean | null): string {
  if (value == null || value === "") return "";
  const text = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return `<b>${escapeHtml(label)}:</b> ${escapeHtml(text)}\n`;
}

export async function sendTelegramMessage(html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: html.slice(0, 4090),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
    cache: "no-store",
  });

  return res.ok;
}
