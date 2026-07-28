export type RiskLevel = "low" | "medium" | "high";
export type AssessmentClassification =
  | "likely_phishing"
  | "likely_spam"
  | "likely_legitimate"
  | "uncertain";
export type EvidenceFamily = "identity" | "destination" | "intent" | "delivery" | "style";
export type AnalysisMode = "heuristic" | "ai";
export type AiProviderName = "openai" | "anthropic" | "openai-compatible";
export type AnalysisProviderName = "heuristic" | AiProviderName;
export type AnalysisLocale = "en" | "nl";

export const ANALYSIS_DISCLAIMERS = {
  en: "This is an automated risk assessment and should not be considered a guarantee.",
  nl: "Dit is een geautomatiseerde risicobeoordeling en geen garantie.",
} as const satisfies Record<AnalysisLocale, string>;
export const ANALYSIS_DISCLAIMER = ANALYSIS_DISCLAIMERS.en;
export const ANALYSIS_PIPELINE_VERSION = "analysis-v8";
export const ANALYSIS_ENVELOPE_VERSION = "analysis-envelope-v2";

export const MAX_SCAN_BODY_LENGTH = 20_000;

export type ScanSource = "paste" | "screenshot" | "eml" | "chrome";
export type WebScanSource = Exclude<ScanSource, "chrome">;

export type EmailLinkPair = {
  displayedUrl: string;
  destinationUrl: string;
};

export type AttachmentRiskType = "executable" | "macro_enabled" | "double_extension";

export const EMAIL_AUTHENTICATION_VERDICTS = [
  "pass",
  "fail",
  "softfail",
  "neutral",
  "none",
  "temperror",
  "permerror",
] as const;

export type EmailAuthenticationVerdict = (typeof EMAIL_AUTHENTICATION_VERDICTS)[number];

/**
 * Verdicts recorded by the receiving provider, reduced to enums in the browser.
 * Header text never leaves the client.
 */
export type EmailAuthenticationSummary = {
  spf?: EmailAuthenticationVerdict;
  dkim?: EmailAuthenticationVerdict;
  dmarc?: EmailAuthenticationVerdict;
  replyToMismatch?: boolean;
  returnPathMismatch?: boolean;
};

export function isEmailAuthenticationVerdict(value: unknown): value is EmailAuthenticationVerdict {
  return typeof value === "string"
    && (EMAIL_AUTHENTICATION_VERDICTS as readonly string[]).includes(value);
}

export type EmailAnalysisInput = {
  subject?: string;
  senderEmail?: string;
  body: string;
  locale?: AnalysisLocale;
  links?: string[];
  linkPairs?: EmailLinkPair[];
  attachmentRiskTypes?: AttachmentRiskType[];
  emailAuthentication?: EmailAuthenticationSummary;
  evidenceTruncated?: boolean;
};

export type NormalizedScanInput = EmailAnalysisInput & {
  source: ScanSource;
  locale: AnalysisLocale;
};

export type AnalysisEvidenceAvailability = {
  subject: boolean;
  sender: boolean;
  linkDestinations: boolean;
  authenticationHeaders: boolean;
  textExtraction: "direct" | "ocr" | "parsed";
  contentComplete: boolean;
};

export type AnalysisEnvelope = {
  version: typeof ANALYSIS_ENVELOPE_VERSION;
  source: ScanSource;
  locale: AnalysisLocale;
  subject?: string;
  senderEmail?: string;
  body: string;
  links: string[];
  linkPairs: EmailLinkPair[];
  attachmentRiskTypes: AttachmentRiskType[];
  emailAuthentication?: EmailAuthenticationSummary;
  availability: AnalysisEvidenceAvailability;
};

export type EmailAnalysisResult = {
  classification: AssessmentClassification;
  risk_level: RiskLevel;
  risk_score: number;
  score_factors: Array<{
    id: string;
    family: EvidenceFamily;
    contribution: number;
    label: string;
  }>;
  suspicious_signals: string[];
  detected_links: string[];
  recommended_action: string;
  short_explanation: string;
};

export type AnalyzeResponse = {
  result: EmailAnalysisResult;
  analysis_mode: AnalysisMode;
  analysis_provider: AnalysisProviderName;
  analysis_version: typeof ANALYSIS_PIPELINE_VERSION;
  disclaimer: (typeof ANALYSIS_DISCLAIMERS)[AnalysisLocale];
  privacy: {
    stored: false;
    retention: "not_stored";
    message: string;
  };
};

export type AnalyzeErrorResponse = {
  error: string;
  fieldErrors?: Partial<Record<keyof NormalizedScanInput, string>>;
};
