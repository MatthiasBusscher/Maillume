// Analysis response validation is kept separate from UI rendering so an untrusted
// deployment response cannot influence the panel before its shape is checked.
/* eslint-disable @typescript-eslint/no-unused-vars -- classic extension scripts share one ordered global scope */
const SUPPORTED_ANALYSIS_VERSIONS = [
  ...MAILLUME_EXTENSION_COMPATIBILITY.supported_analysis_versions,
];

// These limits cover the documented analysis response without allowing a
// configured deployment to make the side panel allocate or render unbounded
// data. A response is rejected rather than silently truncated.
const MAX_ANALYSIS_RESPONSE_BYTES = 256 * 1024;
const MAX_ANALYSIS_RESPONSE_FACTORS = 100;
const MAX_ANALYSIS_RESPONSE_SIGNALS = 100;
const MAX_ANALYSIS_RESPONSE_LINKS = 20;
const MAX_ANALYSIS_RESPONSE_TEXT_CHARACTERS = 2_048;
const MAX_ANALYSIS_FACTOR_ID_CHARACTERS = 128;

class AnalysisResponseTooLargeError extends Error {}

async function readBoundedAnalysisResponse(response) {
  const advertisedLength = response.headers?.get?.("Content-Length");
  if (typeof advertisedLength === "string" && /^\d+$/.test(advertisedLength)
    && Number(advertisedLength) > MAX_ANALYSIS_RESPONSE_BYTES) {
    throw new AnalysisResponseTooLargeError();
  }

  const reader = response.body?.getReader?.();
  if (!reader) throw new Error("The deployment response did not provide a readable body.");

  const chunks = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new Error("The deployment response contained an invalid body chunk.");
      byteLength += value.byteLength;
      if (byteLength > MAX_ANALYSIS_RESPONSE_BYTES) {
        try { await reader.cancel(); } finally { throw new AnalysisResponseTooLargeError(); }
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

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
    && result.score_factors.length <= MAX_ANALYSIS_RESPONSE_FACTORS
    && result.score_factors.every((factor) => factor
      && typeof factor.id === "string"
      && factor.id.length <= MAX_ANALYSIS_FACTOR_ID_CHARACTERS
      && families.includes(factor.family)
      && Number.isInteger(factor.contribution)
      && factor.contribution >= 1
      && factor.contribution <= 30
      && isBoundedAnalysisText(factor.label));
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
    && isBoundedStringArray(result.suspicious_signals, MAX_ANALYSIS_RESPONSE_SIGNALS)
    && Array.isArray(result.detected_links)
    && result.detected_links.length <= MAX_ANALYSIS_RESPONSE_LINKS
    && result.detected_links.every(isHttpUrl)
    && isBoundedAnalysisText(result.short_explanation)
    && isBoundedAnalysisText(result.recommended_action)
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
    && isBoundedAnalysisText(payload.disclaimer)
    && privacy
    && typeof privacy === "object"
    && privacy.stored === false
    && privacy.retention === "not_stored"
    && isBoundedAnalysisText(privacy.message)
  );
}

function isBoundedStringArray(value, maxItems) {
  return Array.isArray(value)
    && value.length <= maxItems
    && value.every(isBoundedAnalysisText);
}

function isBoundedAnalysisText(value) {
  return typeof value === "string" && value.length <= MAX_ANALYSIS_RESPONSE_TEXT_CHARACTERS;
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
