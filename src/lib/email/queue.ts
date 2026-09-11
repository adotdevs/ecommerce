import crypto from "crypto";
import { getEmailMessageModel, type IEmailMessage } from "@/models/EmailMessage";
import { getEmailCampaignModel } from "@/models/EmailCampaign";
import { getEmailAttemptModel } from "@/models/EmailAttempt";
import { getLeadModel } from "@/models/Lead";
import { getEmailEventModel } from "@/models/EmailEvent";
import { sendOutreachEmail } from "./sender";
import { isEmailSuppressed, suppressEmail } from "./suppression";
import { getEmailSettings } from "./settings";
import { getDailyQuotaStatus } from "./quota";

export interface ProcessResult {
  messageId: string;
  success: boolean;
  status: string;
  error?: string;
  retryable?: boolean;
}

export async function claimNextMessage(): Promise<IEmailMessage | null> {
  const MessageModel = await getEmailMessageModel();
  const now = new Date();
  const lockToken = crypto.randomUUID();

  // Atomically claim one queued or due-to-retry message
  const message = await MessageModel.findOneAndUpdate(
    {
      $or: [
        { status: "QUEUED", queuedAt: { $lte: now } },
        { status: "RETRYING", nextRetryAt: { $lte: now } },
      ],
    },
    {
      $set: {
        status: "PROCESSING",
        processingStartedAt: now,
        lockToken,
      },
      $inc: { totalAttempts: 1 },
    },
    { new: true, sort: { queuedAt: 1 } }
  );

  return message;
}

export async function processEmailMessage(message: IEmailMessage): Promise<ProcessResult> {
  const settings = await getEmailSettings();
  const MessageModel = await getEmailMessageModel();
  const CampaignModel = await getEmailCampaignModel();
  const AttemptModel = await getEmailAttemptModel();
  const LeadModel = await getLeadModel();
  const EventModel = await getEmailEventModel();

  // Emergency kill switch
  if (settings.isMarketingPaused) {
    await MessageModel.updateOne(
      { _id: message._id },
      { $set: { status: "QUEUED", processingStartedAt: null, lockToken: null } }
    );
    return {
      messageId: String(message._id),
      success: false,
      status: "PAUSED",
      error: "Marketing is paused.",
    };
  }

  // Pre-send suppression re-check
  const suppCheck = await isEmailSuppressed(message.recipientEmail);
  if (suppCheck.suppressed) {
    await MessageModel.updateOne(
      { _id: message._id },
      {
        $set: {
          status: "SUPPRESSED",
          suppressedAt: new Date(),
          failureCategory: "SUPPRESSED",
          failureReason: `Suppressed: ${suppCheck.reason || "Unsubscribed"}`,
        },
      }
    );
    if (message.campaignId) {
      await CampaignModel.updateOne(
        { _id: message.campaignId as any },
        { $inc: { suppressedCount: 1, processingCount: -1 } }
      );
    }
    return {
      messageId: String(message._id),
      success: false,
      status: "SUPPRESSED",
      error: `Recipient is suppressed (${suppCheck.reason})`,
    };
  }

  // Quota check
  const quota = await getDailyQuotaStatus();
  if (quota.isExhausted) {
    await MessageModel.updateOne(
      { _id: message._id },
      { $set: { status: "QUEUED", processingStartedAt: null, lockToken: null } }
    );
    return {
      messageId: String(message._id),
      success: false,
      status: "QUOTA_EXHAUSTED",
      error: "Daily email quota reached.",
    };
  }

  const startTime = Date.now();
  const sendRes = await sendOutreachEmail({
    to: message.recipientEmail,
    subject: message.subjectSnapshot,
    html: message.renderedHtmlSnapshot,
    text: message.renderedPlainTextSnapshot,
    fromName: settings.defaultSenderName,
    fromEmail: settings.defaultSenderEmail,
    replyTo: settings.defaultReplyTo,
  });

  const durationMs = Date.now() - startTime;

  // Persist attempt log
  await AttemptModel.create({
    emailMessageId: message._id,
    campaignId: message.campaignId,
    leadId: message.leadId,
    attemptNumber: message.totalAttempts,
    startedAt: new Date(startTime),
    finishedAt: new Date(),
    success: sendRes.success,
    providerResponse: sendRes.response,
    providerMessageId: sendRes.messageId,
    smtpCode: sendRes.smtpCode,
    errorCategory: sendRes.errorCategory,
    sanitizedError: sendRes.sanitizedError,
    retryable: sendRes.retryable,
    durationMs,
  });

  if (sendRes.success) {
    const now = new Date();
    const cooldownUntil = new Date(now.getTime() + settings.cooldownDays * 24 * 60 * 60 * 1000);

    // Update Message state
    await MessageModel.updateOne(
      { _id: message._id },
      {
        $set: {
          status: "SENT",
          sentAt: now,
          lastAttemptAt: now,
          providerMessageId: sendRes.messageId,
        },
      }
    );

    // Atomically increment Lead counter and set cooldown
    await LeadModel.updateOne(
      { _id: message.leadId as any },
      {
        $inc: { emailSentCount: 1 },
        $set: {
          lastEmailSentAt: now,
          lastEmailStatus: "SENT",
          cooldownUntil,
          lastCampaignId: message.campaignId ? String(message.campaignId) : undefined,
        },
      }
    );

    // Update Campaign counters
    if (message.campaignId) {
      await CampaignModel.updateOne(
        { _id: message.campaignId as any },
        {
          $inc: { sentCount: 1, processingCount: -1 },
          $set: { startedAt: message.sentAt || now },
        }
      );
    }

    // Record Event
    await EventModel.create({
      campaignId: message.campaignId,
      emailMessageId: message._id,
      leadId: message.leadId,
      recipientEmail: message.recipientEmail,
      type: "SENT",
      actor: "system",
      metadata: { messageId: sendRes.messageId, durationMs },
    });

    return {
      messageId: String(message._id),
      success: true,
      status: "SENT",
    };
  }

  // Handle Failure
  const now = new Date();
  const willRetry = sendRes.retryable && message.totalAttempts < message.maxAttempts;
  const nextRetryAt = willRetry
    ? new Date(now.getTime() + settings.retryDelayMinutes * 60 * 1000)
    : undefined;

  const newStatus = willRetry ? "RETRYING" : "FAILED";

  await MessageModel.updateOne(
    { _id: message._id },
    {
      $set: {
        status: newStatus,
        failedAt: willRetry ? undefined : now,
        lastAttemptAt: now,
        nextRetryAt,
        failureCategory: sendRes.errorCategory,
        failureReason: sendRes.sanitizedError,
      },
    }
  );

  // Update Lead lastEmailStatus
  await LeadModel.updateOne(
    { _id: message.leadId as any },
    {
      $set: {
        lastEmailStatus: "FAILED",
      },
    }
  );

  // If permanent hard bounce, suppress future sends
  if (
    sendRes.errorCategory === "MAILBOX_NOT_FOUND" ||
    sendRes.errorCategory === "RECIPIENT_REJECTED" ||
    sendRes.errorCategory === "INVALID_RECIPIENT"
  ) {
    await suppressEmail({
      email: message.recipientEmail,
      reason: "HARD_FAILURE",
      source: "smtp_hard_bounce",
      leadId: String(message.leadId),
      notes: sendRes.sanitizedError,
    });
  }

  // Update Campaign stats
  if (message.campaignId) {
    await CampaignModel.updateOne(
      { _id: message.campaignId as any },
      {
        $inc: willRetry
          ? { processingCount: -1 }
          : { failedCount: 1, processingCount: -1 },
      }
    );
  }

  // Record Event
  await EventModel.create({
    campaignId: message.campaignId,
    emailMessageId: message._id,
    leadId: message.leadId,
    recipientEmail: message.recipientEmail,
    type: willRetry ? "RETRY_SCHEDULED" : "FAILED",
    actor: "system",
    metadata: {
      category: sendRes.errorCategory,
      error: sendRes.sanitizedError,
      nextRetryAt,
    },
  });

  return {
    messageId: String(message._id),
    success: false,
    status: newStatus,
    error: sendRes.sanitizedError,
    retryable: willRetry,
  };
}

export async function processPendingQueue(maxMessages: number = 10): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];

  for (let i = 0; i < maxMessages; i++) {
    const message = await claimNextMessage();
    if (!message) break;
    const res = await processEmailMessage(message);
    results.push(res);
  }

  return results;
}

export async function recoverStaleProcessingJobs(): Promise<number> {
  const MessageModel = await getEmailMessageModel();
  const staleThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

  const result = await MessageModel.updateMany(
    {
      status: "PROCESSING",
      processingStartedAt: { $lte: staleThreshold },
    },
    {
      $set: {
        status: "QUEUED",
        processingStartedAt: null,
        lockToken: null,
      },
    }
  );

  return result.modifiedCount || 0;
}
