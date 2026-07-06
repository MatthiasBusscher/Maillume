export type RiskLevel = "low" | "medium" | "high";
export type AnalysisMode = "heuristic" | "ai";
export type AiProviderName = "openai" | "anthropic";
export type AnalysisProviderName = "heuristic" | AiProviderName;

export const ANALYSIS_DISCLAIMER =
  "This is an automated risk assessment and should not be considered a guarantee.";

export const MAX_SCAN_BODY_LENGTH = 20_000;

export type ScanSource = "paste" | "screenshot" | "eml";

export type EmailAnalysisInput = {
  subject?: string;
  senderEmail?: string;
  body: string;
};

export type NormalizedScanInput = EmailAnalysisInput & {
  source: ScanSource;
};

export type EmailAnalysisResult = {
  risk_level: RiskLevel;
  risk_score: number;
  suspicious_signals: string[];
  detected_links: string[];
  recommended_action: string;
  short_explanation: string;
};

export type AnalyzeResponse = {
  result: EmailAnalysisResult;
  analysis_mode: AnalysisMode;
  analysis_provider: AnalysisProviderName;
  disclaimer: typeof ANALYSIS_DISCLAIMER;
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
