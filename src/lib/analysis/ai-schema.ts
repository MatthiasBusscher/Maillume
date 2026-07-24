import { MODEL_EVIDENCE_IDS, isModelEvidenceId, type ModelEvidenceId } from "./evidence";

export const AI_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    evidence_ids: {
      type: "array",
      description: "Stable Maillume evidence IDs supported directly by the supplied email.",
      uniqueItems: true,
      maxItems: 20,
      items: {
        type: "string",
        enum: MODEL_EVIDENCE_IDS,
      },
    },
  },
  required: ["evidence_ids"],
} as const;

export class AiResponseValidationError extends Error {
  constructor(message = "AI provider response could not be validated.") {
    super(message);
    this.name = "AiResponseValidationError";
  }
}

export function parseAiAnalysisJson(rawContent: string): ModelEvidenceId[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new AiResponseValidationError();
  }

  return normalizeAiAnalysisResult(parsed);
}

export function normalizeAiAnalysisResult(value: unknown): ModelEvidenceId[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AiResponseValidationError();
  }

  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "evidence_ids")) {
    throw new AiResponseValidationError("AI provider response contained unsupported fields.");
  }
  if (!Array.isArray(record.evidence_ids) || record.evidence_ids.length > 20) {
    throw new AiResponseValidationError("AI provider evidence list was invalid.");
  }

  const evidenceIds = Array.from(new Set(record.evidence_ids));
  // Derived IDs are rejected here, not filtered out: a provider claiming one is
  // reporting evidence it was never given and cannot be trusted for the rest.
  if (!evidenceIds.every(isModelEvidenceId)) {
    throw new AiResponseValidationError("AI provider returned an unknown evidence ID.");
  }

  return evidenceIds;
}
