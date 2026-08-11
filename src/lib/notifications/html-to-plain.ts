/** Convert Telegram-style HTML alerts to plain text for email/discord. */
export function htmlToPlain(html: string): string {
  return html
    .replace(/<b>(.*?)<\/b>/gi, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** Discord-friendly markdown from alert HTML. */
export function htmlToDiscordMarkdown(subject: string, html: string): string {
  const body = html
    .replace(/<b>(.*?)<\/b>/gi, "**$1**")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

  return `**${subject}**\n\n${body}`.slice(0, 2000);
}
