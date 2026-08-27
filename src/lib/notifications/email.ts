import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import {
  buildAlertEmailHtml,
  buildAlertEmailPlainText,
} from "@/lib/notifications/email-template";
import { parseEnvList } from "@/lib/notifications/parse-env-list";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export type AlertEmailProvider = "gmail" | "private";

function createTransporter(config: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

/** Namecheap / private mailbox — promotions and alerts when provider=private. */
export function getPrivateSmtpConfig(): SmtpConfig | null {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || 465);
  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureEnv === "true" || (secureEnv !== "false" && port === 465);

  return {
    host: process.env.SMTP_HOST?.trim() || "mail.privateemail.com",
    port,
    secure,
    user,
    pass,
    from:
      process.env.SMTP_FROM?.trim() ||
      process.env.NOTIFY_EMAIL_FROM?.trim() ||
      user,
  };
}

/** Gmail — alerts only, when ALERT_EMAIL_PROVIDER=gmail. */
export function getGmailSmtpConfig(): SmtpConfig | null {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "").trim();
  if (!user || !pass) return null;

  return {
    host: process.env.GMAIL_SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number(process.env.GMAIL_SMTP_PORT || 587),
    secure: process.env.GMAIL_SMTP_SECURE === "true",
    user,
    pass,
    from: process.env.GMAIL_FROM?.trim() || user,
  };
}

export function getAlertEmailProvider(): AlertEmailProvider {
  const raw = process.env.ALERT_EMAIL_PROVIDER?.trim().toLowerCase();
  return raw === "gmail" ? "gmail" : "private";
}

function getAlertSmtpConfig(): SmtpConfig | null {
  return getAlertEmailProvider() === "gmail"
    ? getGmailSmtpConfig()
    : getPrivateSmtpConfig();
}

export async function sendEmailAlert(
  subject: string,
  html: string
): Promise<boolean> {
  const config = getAlertSmtpConfig();
  const to = parseEnvList(
    process.env.NOTIFY_EMAIL_TO ?? process.env.NOTIFY_EMAIL_TO_LIST
  );
  if (!config || to.length === 0) return false;

  try {
    await createTransporter(config).sendMail({
      from: config.from,
      to,
      subject: subject.slice(0, 998),
      html: buildAlertEmailHtml(subject, html),
      text: buildAlertEmailPlainText(subject, html),
    });
    return true;
  } catch (error) {
    console.error("[email-alert]", getAlertEmailProvider(), error);
    return false;
  }
}

/** Promotional / customer mail always goes through the private mailbox. */
export async function sendPrivateEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}): Promise<boolean> {
  const config = getPrivateSmtpConfig();
  if (!config) return false;

  try {
    await createTransporter(config).sendMail({
      from: options.from?.trim() || config.from,
      to: options.to,
      subject: options.subject.slice(0, 998),
      html: options.html,
      text: options.text,
    });
    return true;
  } catch {
    return false;
  }
}
