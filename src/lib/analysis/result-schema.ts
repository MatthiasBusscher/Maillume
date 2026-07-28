import {
  ANALYSIS_PIPELINE_VERSION,
  type AnalyzeErrorResponse,
  type AnalyzeResponse,
  type EmailAnalysisResult,
} from "../types";
import { isEvidenceCoverage } from "./evidence-coverage";

const CLASSIFICATIONS = new Set([
  "likely_phishing",
  "likely_spam",
  "likely_legitimate",
  "uncertain",
]);
const RISK_LEVELS = new Set(["low", "medium", "high"]);
const EVIDENCE_FAMILIES = new Set([
  "identity",
  "destination",
  "intent",
  "delivery",
  "style",
]);
const ANALYSIS_MODES = new Set(["heuristic", "ai"]);
const ANALYSIS_PROVIDERS = new Set([
  "heuristic",
  "openai",
  "anthropic",
  "openai-compatible",
]);

export function isEmailAnalysisResult(
  value: unknown,
): value is EmailAnalysisResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<EmailAnalysisResult>;
  const factors = result.score_factors;
  if (!Array.isArray(factors)) return false;

  const factorsAreValid = factors.every((factor) =>
    factor
    && typeof factor === "object"
    && typeof factor.id === "string"
    && EVIDENCE_FAMILIES.has(factor.family)
    && Number.isInteger(factor.contribution)
    && factor.contribution >= 1
    && factor.contribution <= 30
    && typeof factor.label === "string"
  );

  return Number.isInteger(result.risk_score)
    && (result.risk_score ?? -1) >= 0
    && (result.risk_score ?? 101) <= 100
    && typeof result.risk_level === "string"
    && RISK_LEVELS.has(result.risk_level)
    && typeof result.classification === "string"
    && CLASSIFICATIONS.has(result.classification)
    && factorsAreValid
    && factors.reduce(
      (total, factor) => total + factor.contribution,
      0,
    ) === result.risk_score
    && isStringArray(result.suspicious_signals)
    && Array.isArray(result.detected_links)
    && result.detected_links.every(isHttpUrl)
    && typeof result.short_explanation === "string"
    && typeof result.recommended_action === "string"
    && isEvidenceCoverage(result.evidence_coverage);
}

export function isAnalyzeResponse(value: unknown): value is AnalyzeResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<AnalyzeResponse>;
  const privacy = response.privacy;
  return isEmailAnalysisResult(response.result)
    && typeof response.analysis_mode === "string"
    && ANALYSIS_MODES.has(response.analysis_mode)
    && typeof response.analysis_provider === "string"
    && ANALYSIS_PROVIDERS.has(response.analysis_provider)
    && response.analysis_version === ANALYSIS_PIPELINE_VERSION
    && typeof response.disclaimer === "string"
    && Boolean(privacy)
    && typeof privacy === "object"
    && privacy.stored === false
    && privacy.retention === "not_stored"
    && typeof privacy.message === "string";
}

export function isAnalyzeErrorResponse(
  value: unknown,
): value is AnalyzeErrorResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<AnalyzeErrorResponse>;
  if (typeof response.error !== "string") return false;
  if (response.fieldErrors === undefined) return true;
  return Boolean(response.fieldErrors)
    && typeof response.fieldErrors === "object"
    && Object.values(response.fieldErrors).every(
      (message) => typeof message === "string",
    );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every((item) => typeof item === "string");
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string" || value.length > 2_048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
