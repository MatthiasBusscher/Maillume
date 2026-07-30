// Analysis response validation is kept separate from UI rendering so an untrusted
// deployment response cannot influence the panel before its shape is checked.
/* eslint-disable @typescript-eslint/no-unused-vars -- classic extension scripts share one ordered global scope */
const SUPPORTED_ANALYSIS_VERSIONS = [
  ...MAILLUME_EXTENSION_COMPATIBILITY.supported_analysis_versions,
];

function isEvidenceCoverage(coverage) {
  return Boolean(
    coverage
    && typeof coverage === "object"
    && typeof coverage.subject_available === "boolean"
    && typeof coverage.sender_available === "boolean"
    && typeof coverage.full_content_available === "boolean"
    && typeof coverage.link_destinations_available === "boolean"
    && typeof coverage.authentication_results_available === "boolean"
    && typeof coverage.attachment_evidence_available === "boolean"
    && ["direct", "ocr", "parsed"].includes(coverage.extraction_type)
  );
}

function isAnalysisResult(result, analysisVersion) {
  const classifications = ["likely_phishing", "likely_spam", "likely_legitimate", "uncertain"];
  const families = ["identity", "destination", "intent", "delivery", "style"];
  const coverageIsPresent = result?.evidence_coverage !== undefined;
  const versionNumber = Number.parseInt(analysisVersion?.replace("analysis-v", ""), 10);
  const coverageIsRequired = Number.isInteger(versionNumber) && versionNumber >= 9;
  const factorsAreValid = Array.isArray(result?.score_factors)
    && result.score_factors.every((factor) => factor
      && typeof factor.id === "string"
      && families.includes(factor.family)
      && Number.isInteger(factor.contribution)
      && factor.contribution >= 1
      && factor.contribution <= 30
      && typeof factor.label === "string");
  return Boolean(
    result
    && typeof result === "object"
    && Number.isInteger(result.risk_score)
    && result.risk_score >= 0
    && result.risk_score <= 100
    && ["low", "medium", "high"].includes(result.risk_level)
    && classifications.includes(result.classification)
    && factorsAreValid
    && result.score_factors.reduce((total, factor) => total + factor.contribution, 0) === result.risk_score
    && isStringArray(result.suspicious_signals)
    && Array.isArray(result.detected_links)
    && result.detected_links.every(isHttpUrl)
    && typeof result.short_explanation === "string"
    && typeof result.recommended_action === "string"
    && (coverageIsPresent ? isEvidenceCoverage(result.evidence_coverage) : !coverageIsRequired)
  );
}

function isAnalysisResponse(payload) {
  const providers = ["heuristic", "openai", "anthropic", "openai-compatible"];
  const privacy = payload?.privacy;
  return Boolean(
    payload
    && typeof payload === "object"
    && isAnalysisResult(payload.result, payload.analysis_version)
    && ["heuristic", "ai"].includes(payload.analysis_mode)
    && providers.includes(payload.analysis_provider)
    && SUPPORTED_ANALYSIS_VERSIONS.includes(payload.analysis_version)
    && typeof payload.disclaimer === "string"
    && privacy
    && typeof privacy === "object"
    && privacy.stored === false
    && privacy.retention === "not_stored"
    && typeof privacy.message === "string"
  );
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isHttpUrl(value) {
  if (typeof value !== "string" || value.length > 2_048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
