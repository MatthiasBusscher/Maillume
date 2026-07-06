import type { EmailAnalysisResult, RiskLevel } from "../types";

export const AI_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    risk_level: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "Overall risk band. The server will verify this against risk_score.",
    },
    risk_score: {
      type: "integer",
      description: "Risk score from 0 to 100, where higher means more suspicious.",
    },
    suspicious_signals: {
      type: "array",
      description: "Concise reasons that explain the assigned risk score.",
      items: {
        type: "string",
      },
    },
    detected_links: {
      type: "array",
      description: "HTTP or HTTPS links detected in the analyzed content.",
      items: {
        type: "string",
      },
    },
    recommended_action: {
      type: "string",
      description: "Practical next step for a non-technical user.",
    },
    short_explanation: {
      type: "string",
      description: "Short explanation of the assessment without claiming certainty.",
    },
  },
  required: [
    "risk_level",
    "risk_score",
    "suspicious_signals",
    "detected_links",
    "recommended_action",
    "short_explanation",
  ],
} as const;

const CERTAINTY_PATTERN = /\b(100%|always|guaranteed|guarantee|definitely|certainly)\b/i;

export class AiResponseValidationError extends Error {
  constructor(message = "AI provider response could not be validated.") {
    super(message);
    this.name = "AiResponseValidationError";
  }
}

export function parseAiAnalysisJson(rawContent: string): EmailAnalysisResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new AiResponseValidationError();
  }

  return normalizeAiAnalysisResult(parsed);
}

export function normalizeAiAnalysisResult(value: unknown): EmailAnalysisResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AiResponseValidationError();
  }

  const record = value as Record<string, unknown>;
  const riskScore = normalizeRiskScore(record.risk_score);
  const riskLevel = getRiskLevel(riskScore);
  const suspiciousSignals = normalizeStringArray(record.suspicious_signals, "suspicious_signals", 12);
  const detectedLinks = normalizeLinks(record.detected_links);
  const recommendedAction = normalizeText(record.recommended_action, "recommended_action", 500);
  const shortExplanation = normalizeText(record.short_explanation, "short_explanation", 500);

  if (CERTAINTY_PATTERN.test(`${recommendedAction} ${shortExplanation}`)) {
    throw new AiResponseValidationError("AI provider response contained a certainty claim.");
  }

  return {
    risk_level: riskLevel,
    risk_score: riskScore,
    suspicious_signals: suspiciousSignals,
    detected_links: detectedLinks,
    recommended_action: recommendedAction,
    short_explanation: shortExplanation,
  };
}

function normalizeRiskScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) {
    throw new AiResponseValidationError();
  }

  return value;
}

function normalizeStringArray(value: unknown, fieldName: string, maxItems: number): string[] {
  if (!Array.isArray(value)) {
    throw new AiResponseValidationError(`AI provider response field ${fieldName} was invalid.`);
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, maxItems);
}

function normalizeLinks(value: unknown): string[] {
  return normalizeStringArray(value, "detected_links", 20).filter((link) =>
    /^https?:\/\//i.test(link),
  );
}

function normalizeText(value: unknown, fieldName: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new AiResponseValidationError(`AI provider response field ${fieldName} was invalid.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new AiResponseValidationError(`AI provider response field ${fieldName} was empty.`);
  }

  return trimmed.slice(0, maxLength);
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 70) {
    return "high";
  }

  if (score >= 35) {
    return "medium";
  }

  return "low";
}
