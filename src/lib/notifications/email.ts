import nodemailer from "nodemailer";
import {
  buildAlertEmailHtml,
  buildAlertEmailPlainText,
} from "@/lib/notifications/email-template";
import { parseEnvList } from "@/lib/notifications/parse-env-list";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string[];
}

function getEmailConfig(): EmailConfig | null {
  const user =
    process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
  const pass =
    process.env.SMTP_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim();
  const to = parseEnvList(
    process.env.NOTIFY_EMAIL_TO ?? process.env.NOTIFY_EMAIL_TO_LIST
  );

  if (!user || !pass || to.length === 0) return null;

  return {
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user,
    pass,
    from: process.env.NOTIFY_EMAIL_FROM?.trim() || user,
    to,
  };
}

export async function sendEmailAlert(
  subject: string,
  html: string
): Promise<boolean> {
  const config = getEmailConfig();
  if (!config) return false;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  try {
    const emailHtml = buildAlertEmailHtml(subject, html);
    await transporter.sendMail({
      from: config.from,
      to: config.to,
      subject: subject.slice(0, 998),
      html: emailHtml,
      text: buildAlertEmailPlainText(subject, html),
    });
    return true;
  } catch {
    return false;
  }
}
