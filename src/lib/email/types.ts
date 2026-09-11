export type SmtpErrorCategory =
  | "AUTHENTICATION"
  | "CONNECTION"
  | "TIMEOUT"
  | "INVALID_RECIPIENT"
  | "RECIPIENT_REJECTED"
  | "MAILBOX_NOT_FOUND"
  | "RATE_LIMIT"
  | "TEMPORARY_PROVIDER_ERROR"
  | "PERMANENT_PROVIDER_ERROR"
  | "CONFIGURATION"
  | "CONTENT"
  | "UNKNOWN";

export interface SmtpSendResult {
  success: boolean;
  messageId?: string;
  response?: string;
  smtpCode?: number;
  errorCategory?: SmtpErrorCategory;
  sanitizedError?: string;
  retryable: boolean;
  durationMs: number;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  metadata?: {
    lastEmailSentAt?: Date;
    cooldownUntil?: Date;
    emailSentCount?: number;
    isSuppressed?: boolean;
    suppressionReason?: string;
  };
}

export interface RenderedEmail {
  subject: string;
  previewText?: string;
  html: string;
  text: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
  missingVariables: string[];
}

export interface PersonalizationData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  productName?: string;
  productPrice?: string | number;
  salePrice?: string | number;
  discount?: string | number;
  couponCode?: string;
  productUrl?: string;
  campaignName?: string;
  [key: string]: string | number | undefined;
}

export interface AiDraftOutput {
  subject: string;
  previewText: string;
  headline: string;
  body: string;
  ctaText: string;
  tone: string;
  reasoningSummary?: string;
}

export interface AiSubjectOption {
  subject: string;
  angle: "direct_offer" | "curiosity" | "product_benefit" | "minimal_luxury" | "tasteful_urgency";
}

export interface AiPreSendReviewOutput {
  clarityScore: number; // 1-100
  toneAssessment: string;
  warnings: string[];
  suggestions: string[];
  isApprovedForSend: boolean;
}
