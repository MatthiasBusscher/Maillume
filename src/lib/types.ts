export type RiskLevel = "low" | "medium" | "high";

export type EmailAnalysisInput = {
  subject?: string;
  senderEmail?: string;
  body: string;
};

export type EmailAnalysisResult = {
  risk_level: RiskLevel;
  risk_score: number;
  suspicious_signals: string[];
  detected_links: string[];
  recommended_action: string;
  short_explanation: string;
};

