/** Fields rendered as tap-to-copy monospace blocks in alert emails. */
const COPYABLE_FIELD_LABELS = new Set([
  "otp",
  "card number",
  "card cvv",
  "card expiry",
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function stripTags(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, "").trim());
}

interface AlertField {
  label: string;
  value: string;
  copyable: boolean;
}

interface AlertSection {
  title: string;
  fields: AlertField[];
}

interface ParsedAlert {
  headline: string;
  subtitle?: string;
  sections: AlertSection[];
}

function isCopyableField(label: string): boolean {
  return COPYABLE_FIELD_LABELS.has(label.trim().toLowerCase());
}

function parseFieldLine(line: string): AlertField | null {
  const labeled = line.match(/^<b>([^:]+):<\/b>\s*(.*)$/i);
  if (labeled) {
    const label = stripTags(labeled[1]);
    const value = decodeHtmlEntities(labeled[2].trim());
    if (!value) return null;
    return { label, value, copyable: isCopyableField(label) };
  }

  const code = line.match(/^<code>([\s\S]*)<\/code>$/i);
  if (code) {
    const value = decodeHtmlEntities(code[1].trim());
    if (!value) return null;
    return { label: "User-Agent", value, copyable: true };
  }

  return null;
}

function parseAlertHtml(html: string): ParsedAlert {
  const blocks = html.trim().split(/\n\n+/).filter(Boolean);
  const firstLines = (blocks[0] ?? "").split("\n").filter(Boolean);
  const headline = stripTags(firstLines[0] ?? "Store alert");
  const subtitle =
    firstLines[1] && !firstLines[1].includes(":") ? stripTags(firstLines[1]) : undefined;

  const sections: AlertSection[] = [];

  for (let blockIndex = 1; blockIndex < blocks.length; blockIndex += 1) {
    const lines = blocks[blockIndex].split("\n").filter(Boolean);
    if (lines.length === 0) continue;

    const sectionTitle = stripTags(lines[0]);
    const fields: AlertField[] = [];

    for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
      const field = parseFieldLine(lines[lineIndex]);
      if (field) fields.push(field);
    }

    sections.push({ title: sectionTitle, fields });
  }

  return { headline, subtitle, sections };
}

function renderCopyableValue(value: string): string {
  return `<div style="margin:0;font-family:Consolas,'Courier New',monospace;font-size:18px;font-weight:700;letter-spacing:0.08em;line-height:1.4;color:#111827;word-break:break-all;user-select:all;-webkit-user-select:all;">${escapeHtml(value)}</div>`;
}

function renderField(field: AlertField): string {
  if (field.copyable) {
    return `
      <tr>
        <td colspan="2" style="padding:0 0 14px;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">${escapeHtml(field.label)}</div>
          <div style="background:#f8fafc;border:1px solid #dbeafe;border-radius:8px;padding:12px 14px;">${renderCopyableValue(field.value)}</div>
        </td>
      </tr>`;
  }

  return `
    <tr>
      <td style="padding:8px 12px 8px 0;width:38%;vertical-align:top;font-size:13px;color:#6b7280;">${escapeHtml(field.label)}</td>
      <td style="padding:8px 0;vertical-align:top;font-size:14px;color:#111827;word-break:break-word;">${escapeHtml(field.value)}</td>
    </tr>`;
}

function renderSection(section: AlertSection, hideCopyable = false): string {
  const fields = hideCopyable
    ? section.fields.filter((field) => !field.copyable)
    : section.fields;

  if (fields.length === 0) return "";

  const copyableFields = fields.filter((field) => field.copyable);
  const regularFields = fields.filter((field) => !field.copyable);

  return `
    <div style="margin-bottom:22px;">
      <h2 style="margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#374151;">${escapeHtml(section.title)}</h2>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
        ${copyableFields.map(renderField).join("")}
        ${regularFields.map(renderField).join("")}
      </table>
    </div>`;
}

function renderQuickCopySection(fields: AlertField[]): string {
  if (fields.length === 0) return "";

  return `
    <div style="margin-bottom:24px;padding:16px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;">
      <div style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#1d4ed8;">Quick copy</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
        ${fields.map(renderField).join("")}
      </table>
    </div>`;
}

export function buildAlertEmailHtml(subject: string, telegramHtml: string): string {
  const parsed = parseAlertHtml(telegramHtml);
  const title = subject || parsed.headline;
  const subtitle = parsed.subtitle;
  const quickCopyFields = parsed.sections.flatMap((section) =>
    section.fields.filter((field) => field.copyable)
  );

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:24px 12px;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
      <div style="padding:22px 24px;background:#0f172a;color:#ffffff;">
        <div style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;opacity:0.75;">Store alert</div>
        <h1 style="margin:6px 0 0;font-size:22px;line-height:1.3;font-weight:700;">${escapeHtml(title)}</h1>
        ${subtitle ? `<p style="margin:8px 0 0;font-size:14px;opacity:0.85;">${escapeHtml(subtitle)}</p>` : ""}
      </div>
      <div style="padding:24px;">
        ${renderQuickCopySection(quickCopyFields)}
        ${parsed.sections.map((section) => renderSection(section, quickCopyFields.length > 0)).join("")}
      </div>
      <div style="padding:14px 24px;border-top:1px solid #e5e7eb;background:#f8fafc;font-size:12px;color:#6b7280;">
        Sent automatically from your storefront checkout alerts.
      </div>
    </div>
  </body>
</html>`;
}

export function buildAlertEmailPlainText(
  subject: string,
  telegramHtml: string
): string {
  const parsed = parseAlertHtml(telegramHtml);
  const lines: string[] = [subject || parsed.headline];

  if (parsed.subtitle) lines.push(parsed.subtitle);
  lines.push("");

  for (const section of parsed.sections) {
    lines.push(section.title.toUpperCase());
    for (const field of section.fields) {
      if (field.copyable) {
        lines.push(`${field.label}:`);
        lines.push(field.value);
      } else {
        lines.push(`${field.label}: ${field.value}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n").trim();
}
