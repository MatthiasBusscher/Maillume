import type { Locale } from "@/lib/i18n/dictionary";
import type { RiskLevel, ScanSource } from "@/lib/types";

export const feedbackClassifications = ["phishing", "spam", "legitimate", "unsure"] as const;
export const feedbackKinds = ["accurate", "false_positive", "false_negative", "unsure"] as const;
export const feedbackSignalCategories = [
  "urgency",
  "impersonation",
  "credential_request",
  "payment_request",
  "suspicious_link",
] as const;

export type FeedbackClassification = (typeof feedbackClassifications)[number];
export type FeedbackKind = (typeof feedbackKinds)[number];
export type FeedbackSignalCategory = (typeof feedbackSignalCategories)[number];

export type DetectionFeedbackSubmission = {
  helpful: boolean;
  expectedClassification: FeedbackClassification;
  feedbackKind: FeedbackKind;
  locale: Locale;
  source: ScanSource;
  analyzerVersion: string;
  scoreBand: RiskLevel;
  signalCategories: FeedbackSignalCategory[];
};

export type DetectionFeedbackResponse = {
  accepted: true;
  storedContent: false;
  retention: "up_to_90_days";
};

export type DetectionFeedbackErrorResponse = {
  error: string;
};
