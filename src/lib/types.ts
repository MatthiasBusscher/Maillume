import { PUBLIC_CONTRACT } from "./contracts/public-contract";

export type RiskLevel = (typeof PUBLIC_CONTRACT.analysis.riskLevels)[number];
export type AssessmentClassification = (typeof PUBLIC_CONTRACT.analysis.classifications)[number];
export type EvidenceFamily = (typeof PUBLIC_CONTRACT.analysis.evidenceFamilies)[number];
export type AnalysisMode = (typeof PUBLIC_CONTRACT.analysis.modes)[number];
export type AiProviderName = (typeof PUBLIC_CONTRACT.analysis.aiProviders)[number];
export type AnalysisProviderName = "heuristic" | AiProviderName;
export type AnalysisLocale = (typeof PUBLIC_CONTRACT.analysis.locales)[number];

export const ANALYSIS_DISCLAIMERS = {
  en: "This is an automated risk assessment and should not be considered a guarantee.",
  nl: "Dit is een geautomatiseerde risicobeoordeling en geen garantie.",
} as const satisfies Record<AnalysisLocale, string>;
export const ANALYSIS_DISCLAIMER = ANALYSIS_DISCLAIMERS.en;
export const ANALYSIS_PIPELINE_VERSION = PUBLIC_CONTRACT.analysis.pipelineVersion;
export const ANALYSIS_ENVELOPE_VERSION = PUBLIC_CONTRACT.analysis.envelopeVersion;

export const MAX_SCAN_BODY_LENGTH = PUBLIC_CONTRACT.limits.scanBodyCharacters;

export type ScanSource = (typeof PUBLIC_CONTRACT.analysis.sources)[number];
export type WebScanSource = Exclude<ScanSource, "chrome">;

export type EmailLinkPair = {
  displayedUrl: string;
  destinationUrl: string;
};

export type AttachmentRiskType = (typeof PUBLIC_CONTRACT.analysis.attachmentRiskTypes)[number];

export const EMAIL_AUTHENTICATION_VERDICTS = PUBLIC_CONTRACT.analysis.emailAuthenticationVerdicts;

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
  attachmentEvidence: boolean;
  textExtraction: "direct" | "ocr" | "parsed";
  contentComplete: boolean;
};

export type EvidenceCoverage = {
  subject_available: boolean;
  sender_available: boolean;
  full_content_available: boolean;
  link_destinations_available: boolean;
  authentication_results_available: boolean;
  attachment_evidence_available: boolean;
  extraction_type: AnalysisEvidenceAvailability["textExtraction"];
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
  evidence_coverage: EvidenceCoverage;
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
