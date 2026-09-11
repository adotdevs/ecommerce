import { getEmailOutreachSettingsModel, type IEmailOutreachSettings } from "@/models/EmailOutreachSettings";
import { getEmailEventModel } from "@/models/EmailEvent";

export const DEFAULT_EMAIL_SETTINGS = {
  dailyLimit: 10,
  hourlyLimit: 0,
  cooldownDays: 14,
  maxRetries: 2,
  retryDelayMinutes: 30,
  defaultSenderName: "Findora Store",
  defaultSenderEmail: "shop@findora.market",
  defaultReplyTo: "support@findora.market",
  defaultFooterCopy: "You received this email because you subscribed to updates from Findora.",
  companyAddress: "Findora Market, 100 Market St.",
  defaultUtmSource: "email",
  defaultUtmMedium: "campaign",
  isAiAssistanceEnabled: true,
  isMarketingPaused: false,
};

export async function getEmailSettings(): Promise<IEmailOutreachSettings> {
  const SettingsModel = await getEmailOutreachSettingsModel();
  let settings = await SettingsModel.findOne({ key: "global" });
  if (!settings) {
    settings = await SettingsModel.create({
      key: "global",
      ...DEFAULT_EMAIL_SETTINGS,
    });
  }
  return settings;
}

export async function updateEmailSettings(
  updates: Partial<IEmailOutreachSettings>,
  actor: string
): Promise<IEmailOutreachSettings> {
  const SettingsModel = await getEmailOutreachSettingsModel();
  const EventModel = await getEmailEventModel();

  const settings = await SettingsModel.findOneAndUpdate(
    { key: "global" },
    { $set: updates },
    { new: true, upsert: true }
  );

  await EventModel.create({
    type: "SETTINGS_UPDATED",
    actor,
    metadata: { updates },
  });

  return settings;
}
