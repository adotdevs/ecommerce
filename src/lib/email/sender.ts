import nodemailer from "nodemailer";
import { getPrivateSmtpConfig, getGmailSmtpConfig } from "@/lib/notifications/email";
import type { SmtpErrorCategory, SmtpSendResult } from "./types";

export function classifySmtpError(error: unknown): {
  category: SmtpErrorCategory;
  smtpCode?: number;
  retryable: boolean;
  sanitized: string;
} {
  if (!error) {
    return { category: "UNKNOWN", retryable: false, sanitized: "Unknown error" };
  }

  const errObj = error as {
    responseCode?: number;
    response?: string;
    code?: string;
    message?: string;
    command?: string;
  };

  const code = errObj.responseCode || (errObj.response ? parseInt(errObj.response.slice(0, 3), 10) : undefined);
  const msg = (errObj.message || errObj.response || String(error)).toLowerCase();

  // Authentication errors (never retry automatically)
  if (errObj.code === "EAUTH" || code === 535 || msg.includes("invalid login") || msg.includes("authentication")) {
    return {
      category: "AUTHENTICATION",
      smtpCode: code || 535,
      retryable: false,
      sanitized: "SMTP authentication failed. Check credentials in server configuration.",
    };
  }

  // Mailbox does not exist / recipient rejected (permanent hard bounce)
  if (
    code === 550 ||
    code === 551 ||
    code === 553 ||
    code === 554 ||
    msg.includes("recipient rejected") ||
    msg.includes("user unknown") ||
    msg.includes("mailbox unavailable") ||
    msg.includes("does not exist") ||
    msg.includes("invalid recipient")
  ) {
    return {
      category: code === 550 && msg.includes("mailbox") ? "MAILBOX_NOT_FOUND" : "RECIPIENT_REJECTED",
      smtpCode: code || 550,
      retryable: false,
      sanitized: errObj.response || "Recipient address was rejected by receiving server.",
    };
  }

  // Mailbox full / quota exceeded
  if (code === 552 && (msg.includes("mailbox") || msg.includes("full") || msg.includes("quota"))) {
    return {
      category: "MAILBOX_FULL",
      smtpCode: 552,
      retryable: false,
      sanitized: "Recipient mailbox is full or quota exceeded.",
    };
  }

  // Network / Connection / DNS (temporary, retryable)
  if (
    errObj.code === "ETIMEDOUT" ||
    errObj.code === "ECONNRESET" ||
    errObj.code === "ECONNREFUSED" ||
    errObj.code === "ENOTFOUND" ||
    errObj.code === "EAI_AGAIN" ||
    msg.includes("timeout") ||
    msg.includes("connection reset") ||
    msg.includes("enotfound")
  ) {
    const isDns = errObj.code === "ENOTFOUND" || msg.includes("enotfound");
    return {
      category: isDns ? "DNS_ERROR" : "TIMEOUT",
      retryable: true,
      sanitized: isDns
        ? "DNS lookup failed for destination mail server."
        : "Connection to SMTP server timed out or was reset.",
    };
  }

  // Rate limiting / Temporary provider errors (4xx codes, retryable)
  if (code && code >= 400 && code < 500) {
    const isRate = code === 421 || msg.includes("rate") || msg.includes("too many");
    return {
      category: isRate ? "RATE_LIMIT" : "TEMPORARY_PROVIDER_ERROR",
      smtpCode: code,
      retryable: true,
      sanitized: errObj.response || "Temporary server issue or rate limit reached. Can be retried.",
    };
  }

  // Content / Spam trigger by remote server (permanent)
  if (code === 552 || msg.includes("spam") || msg.includes("blocked")) {
    return {
      category: "CONTENT",
      smtpCode: code,
      retryable: false,
      sanitized: "Email blocked by recipient filters or message content was rejected.",
    };
  }

  return {
    category: "UNKNOWN",
    smtpCode: code,
    retryable: code ? code >= 400 && code < 500 : false,
    sanitized: (errObj.message || "Failed to send email").slice(0, 300),
  };
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}

export async function sendOutreachEmail(options: SendMailOptions): Promise<SmtpSendResult> {
  const startTime = Date.now();
  const config = getPrivateSmtpConfig() || getGmailSmtpConfig();

  if (!config) {
    return {
      success: false,
      errorCategory: "CONFIGURATION",
      sanitizedError: "SMTP configuration is missing. Configure SMTP_USER/SMTP_PASS (or GMAIL_USER/GMAIL_APP_PASSWORD) in your server environment.",
      retryable: false,
      durationMs: Date.now() - startTime,
    };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    // Prevent hanging worker if connection freezes
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  const from = options.fromName
    ? `"${options.fromName.replace(/"/g, "")}" <${options.fromEmail?.trim() || config.from}>`
    : options.fromEmail?.trim() || config.from;

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject.slice(0, 998),
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    return {
      success: true,
      messageId: info.messageId,
      response: typeof info.response === "string" ? info.response : JSON.stringify(info.response),
      durationMs: Date.now() - startTime,
      retryable: false,
    };
  } catch (error) {
    const classified = classifySmtpError(error);
    return {
      success: false,
      errorCategory: classified.category,
      smtpCode: classified.smtpCode,
      sanitizedError: classified.sanitized,
      retryable: classified.retryable,
      durationMs: Date.now() - startTime,
    };
  }
}
