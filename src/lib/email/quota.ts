import { getEmailMessageModel } from "@/models/EmailMessage";
import { getEmailSettings } from "./settings";

export function getStartOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

export interface QuotaStatus {
  dailyLimit: number;
  sentToday: number;
  processingToday: number;
  queuedToday: number;
  remaining: number;
  isExhausted: boolean;
  isPaused: boolean;
}

export async function getDailyQuotaStatus(): Promise<QuotaStatus> {
  const settings = await getEmailSettings();
  if (settings.isMarketingPaused) {
    return {
      dailyLimit: settings.dailyLimit,
      sentToday: 0,
      processingToday: 0,
      queuedToday: 0,
      remaining: 0,
      isExhausted: true,
      isPaused: true,
    };
  }

  const startOfDay = getStartOfTodayUtc();
  const MessageModel = await getEmailMessageModel();

  const [sentToday, processingToday, queuedToday] = await Promise.all([
    MessageModel.countDocuments({
      status: "SENT",
      sentAt: { $gte: startOfDay },
    }),
    MessageModel.countDocuments({
      status: "PROCESSING",
      processingStartedAt: { $gte: startOfDay },
    }),
    MessageModel.countDocuments({
      status: "QUEUED",
      queuedAt: { $gte: startOfDay },
    }),
  ]);

  const totalUsed = sentToday + processingToday;
  const remaining = Math.max(0, settings.dailyLimit - totalUsed);

  return {
    dailyLimit: settings.dailyLimit,
    sentToday,
    processingToday,
    queuedToday,
    remaining,
    isExhausted: remaining <= 0,
    isPaused: false,
  };
}

export async function canSendCount(count: number): Promise<{ allowed: boolean; remaining: number; reason?: string }> {
  const status = await getDailyQuotaStatus();
  if (status.isPaused) {
    return { allowed: false, remaining: 0, reason: "MARKETING_PAUSED" };
  }
  if (status.remaining < count) {
    return {
      allowed: false,
      remaining: status.remaining,
      reason: `Daily quota limit reached. Only ${status.remaining} remaining today out of ${status.dailyLimit}.`,
    };
  }
  return { allowed: true, remaining: status.remaining };
}
