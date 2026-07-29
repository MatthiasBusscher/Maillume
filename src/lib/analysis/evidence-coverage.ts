import type {
  AnalysisEnvelope,
  EvidenceCoverage,
} from "../types";

export function createEvidenceCoverage(
  envelope: AnalysisEnvelope,
): EvidenceCoverage {
  return {
    subject_available: envelope.availability.subject,
    sender_available: envelope.availability.sender,
    full_content_available: envelope.availability.contentComplete,
    link_destinations_available: envelope.availability.linkDestinations,
    authentication_results_available:
      envelope.availability.authenticationHeaders,
    attachment_evidence_available: envelope.availability.attachmentEvidence,
    extraction_type: envelope.availability.textExtraction,
  };
}

export function hasMaterialEvidenceCoverage(
  coverage: EvidenceCoverage,
): boolean {
  return coverage.sender_available
    && coverage.full_content_available
    && coverage.link_destinations_available;
}

export function isEvidenceCoverage(value: unknown): value is EvidenceCoverage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EvidenceCoverage>;
  return typeof candidate.subject_available === "boolean"
    && typeof candidate.sender_available === "boolean"
    && typeof candidate.full_content_available === "boolean"
    && typeof candidate.link_destinations_available === "boolean"
    && typeof candidate.authentication_results_available === "boolean"
    && typeof candidate.attachment_evidence_available === "boolean"
    && (
      candidate.extraction_type === "direct"
      || candidate.extraction_type === "ocr"
      || candidate.extraction_type === "parsed"
    );
}
