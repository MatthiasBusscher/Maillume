import type {
  AnalysisLocale,
  AssessmentClassification,
  EmailAnalysisResult,
  RiskLevel,
  ScanSource,
} from "../types";

export const EVALUATION_EXPECTATIONS = ["phishing", "spam", "legitimate"] as const;
export type EvaluationExpectation = (typeof EVALUATION_EXPECTATIONS)[number];

export const EVALUATION_PREDICTIONS = [
  "phishing",
  "spam",
  "legitimate",
  "uncertain",
] as const;
export type EvaluationPrediction = (typeof EVALUATION_PREDICTIONS)[number];

export const EVALUATION_DATASETS = [
  "calibration",
  "public-advisory-holdout",
  "independent-development",
  "independent-validation",
  "independent-locked",
  "synthetic-development",
  "synthetic-locked",
  "cross-input",
] as const;
export type EvaluationDataset = (typeof EVALUATION_DATASETS)[number];

export const EVALUATION_SCENARIO_CATEGORIES = [
  "account-access",
  "identity-verification",
  "payment-change",
  "invoice-payment",
  "delivery",
  "mfa-oauth",
  "link-deception",
  "attachment-document",
  "qr-lure",
  "security-callback",
  "subscription-security",
  "sales-outreach",
  "promotion",
  "investment",
  "high-risk-spam",
  "business-routine",
  "account-notification",
  "security-guidance",
  "order-tracking",
  "support",
] as const;
export type EvaluationScenarioCategory =
  (typeof EVALUATION_SCENARIO_CATEGORIES)[number];

export type EvidenceCompleteness = "complete" | "incomplete";

export type EvaluationObservation = {
  dataset: EvaluationDataset;
  caseId: string;
  scenarioId: string;
  scenarioCategory: EvaluationScenarioCategory;
  expected: EvaluationExpectation;
  language: AnalysisLocale;
  source: ScanSource;
  evidenceCompleteness: EvidenceCompleteness;
  result: Pick<
    EmailAnalysisResult,
    "classification" | "risk_level" | "risk_score" | "score_factors"
  >;
};

export function predictionFromClassification(
  classification: AssessmentClassification,
): EvaluationPrediction {
  if (classification === "likely_phishing") return "phishing";
  if (classification === "likely_spam") return "spam";
  if (classification === "likely_legitimate") return "legitimate";
  return "uncertain";
}

export function isNonLow(level: RiskLevel): boolean {
  return level !== "low";
}
