/**
 * The public analysis and extension compatibility contract.
 *
 * This is deliberately dependency-free so generation can compile and load it
 * without starting the application. Runtime modules import these values too;
 * generated JSON is a checked projection, never an alternative source.
 */
export const PUBLIC_CONTRACT = {
  analysis: {
    pipelineVersion: "analysis-v12",
    envelopeVersion: "analysis-envelope-v2",
    apiVersion: "v1",
    sources: ["paste", "screenshot", "eml", "chrome"],
    locales: ["en", "nl"],
    riskLevels: ["low", "medium", "high"],
    classifications: ["likely_phishing", "likely_spam", "likely_legitimate", "uncertain"],
    evidenceFamilies: ["identity", "destination", "intent", "delivery", "style"],
    modes: ["heuristic", "ai"],
    aiProviders: ["openai", "anthropic", "openai-compatible"],
    extractionTypes: ["direct", "ocr", "parsed"],
    emailAuthenticationVerdicts: [
      "pass", "fail", "softfail", "neutral", "none", "temperror", "permerror",
    ],
    attachmentRiskTypes: ["executable", "macro_enabled", "double_extension"],
  },
  extension: {
    officialId: "bjiiailjalkfjimkjdikoockjlnjolle",
    currentVersion: "0.4.1",
    minimumAnalysisVersion: "0.3.8",
    minimumPairingVersion: "0.3.9",
    supportedAnalysisVersions: ["analysis-v6", "analysis-v7", "analysis-v8", "analysis-v9", "analysis-v10", "analysis-v11", "analysis-v12"],
    clientHeaders: {
      analysisVersions: "x-maillume-analysis-versions",
      extensionId: "x-maillume-extension-id",
      extensionVersion: "x-maillume-extension-version",
    },
  },
  limits: {
    scanBodyCharacters: 20_000,
    subjectCharacters: 300,
    senderEmailCharacters: 320,
    linkItems: 20,
    linkCharacters: 2_048,
    attachmentRiskItems: 3,
    defaultAnalysisRequestBytes: 32 * 1024,
    maxConfiguredAnalysisRequestBytes: 256 * 1024,
    screenshotBytes: 5 * 1024 * 1024,
    screenshotPixels: 20_000_000,
    screenshotDimension: 8_000,
    emlBytes: 2 * 1024 * 1024,
  },
  uploads: {
    screenshotMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    emlMimeTypes: ["message/rfc822"],
  },
  pairing: {
    lifetimeDays: [30, 90, 180, 365],
    ttlSeconds: 10 * 60,
    pollSeconds: 3,
    maxRequestBytes: 2 * 1024,
  },
} as const;

export type PublicContract = typeof PUBLIC_CONTRACT;

const analysis = PUBLIC_CONTRACT.analysis;
const extension = PUBLIC_CONTRACT.extension;
const limits = PUBLIC_CONTRACT.limits;

/** JSON Schema fragments used by the generated OpenAPI document. */
export const OPENAPI_SCHEMA_FRAGMENTS = {
  capabilities: {
    type: "object",
    additionalProperties: false,
    required: ["analysis_version", "api_version", "extension"],
    properties: {
      analysis_version: { const: analysis.pipelineVersion },
      api_version: { const: analysis.apiVersion },
      extension: {
        type: "object",
        additionalProperties: false,
        required: ["id", "latest_version", "minimum_analysis_version", "minimum_pairing_version", "pairing_available", "supported_analysis_versions"],
        properties: {
          id: { const: extension.officialId },
          latest_version: { const: extension.currentVersion },
          minimum_analysis_version: { type: "string" },
          minimum_pairing_version: { const: extension.minimumPairingVersion },
          pairing_available: { const: true },
          supported_analysis_versions: {
            type: "array",
            items: { type: "string", pattern: "^analysis-v[1-9][0-9]{0,2}$" },
          },
        },
      },
    },
  },
  analyzeRequest: {
    type: "object",
    additionalProperties: false,
    required: ["body"],
    properties: {
      source: { type: "string", enum: analysis.sources },
      subject: { type: "string", maxLength: limits.subjectCharacters },
      senderEmail: { type: "string", maxLength: limits.senderEmailCharacters },
      locale: { type: "string", enum: analysis.locales, default: "en" },
      evidenceTruncated: { type: "boolean", default: false },
      body: { type: "string", minLength: 1, maxLength: limits.scanBodyCharacters },
      links: {
        type: "array",
        maxItems: limits.linkItems,
        items: { type: "string", format: "uri", pattern: "^[Hh][Tt][Tt][Pp][Ss]?://", maxLength: limits.linkCharacters },
      },
      linkPairs: {
        type: "array",
        maxItems: limits.linkItems,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["displayedUrl", "destinationUrl"],
          properties: {
            displayedUrl: { type: "string", format: "uri", pattern: "^[Hh][Tt][Tt][Pp][Ss]?://", maxLength: limits.linkCharacters },
            destinationUrl: { type: "string", format: "uri", pattern: "^[Hh][Tt][Tt][Pp][Ss]?://", maxLength: limits.linkCharacters },
          },
        },
      },
      attachmentRiskTypes: {
        type: "array",
        maxItems: limits.attachmentRiskItems,
        description: "Coarse categories derived locally from attachment names and MIME metadata. Filenames and attachment contents are not sent.",
        items: { type: "string", enum: analysis.attachmentRiskTypes },
      },
      emailAuthentication: {
        type: "object",
        additionalProperties: false,
        description: "Authentication verdicts recorded by the receiving mail provider, reduced to enums by the client. Accepted only when source is \"eml\". Header text is never sent, and a passing verdict is not scored as reassurance.",
        properties: {
          spf: { type: "string", enum: analysis.emailAuthenticationVerdicts },
          dkim: { type: "string", enum: analysis.emailAuthenticationVerdicts },
          dmarc: { type: "string", enum: analysis.emailAuthenticationVerdicts },
          replyToMismatch: { type: "boolean", description: "The Reply-To registrable domain differs from the sender's." },
          returnPathMismatch: { type: "boolean", description: "The Return-Path registrable domain differs from the sender's." },
        },
      },
    },
  },
  analysisResult: {
    type: "object",
    additionalProperties: false,
    required: ["classification", "risk_level", "risk_score", "score_factors", "suspicious_signals", "detected_links", "recommended_action", "short_explanation", "evidence_coverage"],
    properties: {
      classification: { type: "string", enum: analysis.classifications },
      risk_level: { type: "string", enum: analysis.riskLevels },
      risk_score: { type: "integer", minimum: 0, maximum: 100, description: "Versioned risk index equal to the sum of score_factors contributions; not a probability." },
      score_factors: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "family", "contribution", "label"],
          properties: {
            id: { type: "string" },
            family: { type: "string", enum: analysis.evidenceFamilies },
            contribution: { type: "integer", minimum: 1, maximum: 30 },
            label: { type: "string" },
          },
        },
      },
      suspicious_signals: { type: "array", items: { type: "string" } },
      detected_links: { type: "array", items: { type: "string", format: "uri" } },
      recommended_action: { type: "string" },
      short_explanation: { type: "string" },
      evidence_coverage: { $ref: "#/components/schemas/EvidenceCoverage" },
    },
  },
  evidenceCoverage: {
    type: "object",
    additionalProperties: false,
    required: ["subject_available", "sender_available", "full_content_available", "link_destinations_available", "authentication_results_available", "attachment_evidence_available", "extraction_type"],
    properties: {
      subject_available: { type: "boolean" },
      sender_available: { type: "boolean" },
      full_content_available: { type: "boolean" },
      link_destinations_available: { type: "boolean" },
      authentication_results_available: { type: "boolean" },
      attachment_evidence_available: { type: "boolean" },
      extraction_type: { type: "string", enum: analysis.extractionTypes },
    },
  },
} as const;

export function createOpenApiDocument() {
  const fragments = OPENAPI_SCHEMA_FRAGMENTS;
  return {
    openapi: "3.1.0",
    info: {
      title: "Maillume Hosted API",
      version: "0.2.0-beta",
      description: "Authenticated email risk assessment. Scan content and results are processed for the request and are not stored. Results are automated assessments, not guarantees.",
    },
    servers: [{ url: "https://app.maillume.io" }],
    paths: {
      "/api/v1/capabilities": {
        get: { summary: "Read hosted API and official extension compatibility", security: [], responses: { 200: { description: "Current compatibility contract", content: { "application/json": { schema: { $ref: "#/components/schemas/CapabilitiesResponse" } } } } } },
      },
      "/api/v1/extension-pairing": {
        post: pairingOperation("Start a short-lived official extension connection", "ExtensionPairingStartRequest", "ExtensionPairingStartResponse", "Short-lived browser approval request created", [400, 426, 429, 503]),
        put: pairingOperation(
          "Poll and redeem an approved extension connection",
          "ExtensionPairingRedeemRequest",
          "ExtensionPairingRedeemResponse",
          "Dedicated browser API key returned once",
          [400, 403, 409, 410, 426, 429, 503],
          {
            202: {
              description: "Approval is still pending",
              headers: { "Retry-After": { schema: { type: "integer" } } },
            },
          },
        ),
      },
      "/api/v1/analyze": {
        post: {
          summary: "Analyze normalized email content",
          security: [{ apiKey: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AnalyzeRequest" } } } },
          responses: {
            200: { description: "Assessment completed", headers: { "X-RateLimit-Limit": { schema: { type: "integer" } }, "X-RateLimit-Remaining": { schema: { type: "integer" } } }, content: { "application/json": { schema: { $ref: "#/components/schemas/AnalyzeResponse" } } } },
            400: { $ref: "#/components/responses/Error" }, 401: { $ref: "#/components/responses/Error" }, 413: { $ref: "#/components/responses/Error" }, 429: { $ref: "#/components/responses/Error" }, 500: { $ref: "#/components/responses/Error" }, 502: { $ref: "#/components/responses/Error" }, 503: { $ref: "#/components/responses/Error" },
          },
        },
      },
    },
    components: {
      parameters: {
        ExtensionId: { name: "X-Maillume-Extension-Id", in: "header", required: true, schema: { type: "string", pattern: "^[a-p]{32}$" } },
        ExtensionVersion: { name: "X-Maillume-Extension-Version", in: "header", required: true, schema: { type: "string", pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+$" } },
        AnalysisVersions: {
          name: "X-Maillume-Analysis-Versions",
          in: "header",
          required: true,
          schema: {
            type: "string",
            example: extension.supportedAnalysisVersions.slice(-2).join(","),
          },
        },
      },
      securitySchemes: { apiKey: { type: "http", scheme: "bearer", bearerFormat: "mlm_..." } },
      schemas: {
        CapabilitiesResponse: fragments.capabilities,
        ExtensionPairingStartRequest: {
          type: "object", additionalProperties: false, required: ["name"], properties: {
            browserConnectionId: { type: "string", pattern: "^mlb_[a-f0-9]{32}$", description: "Random installation identifier generated and retained locally by extension 0.4.0 or later. The server stores only its SHA-256 hash so reconnecting the same browser rotates that browser credential." },
            name: { type: "string", minLength: 1, maxLength: 50 }, lifetimeDays: { type: "integer", enum: PUBLIC_CONTRACT.pairing.lifetimeDays, default: 365 }, locale: { type: "string", enum: analysis.locales, default: "en" },
          },
        },
        ExtensionPairingStartResponse: {
          type: "object", additionalProperties: false, required: ["device_code", "expires_at", "expires_in", "interval", "pairing_id", "user_code", "verification_uri_complete"], properties: {
            device_code: { type: "string", pattern: "^mlp_[A-Za-z0-9_-]{43}$" }, expires_at: { type: "string", format: "date-time" }, expires_in: { type: "integer", maximum: PUBLIC_CONTRACT.pairing.ttlSeconds }, interval: { type: "integer", minimum: 1, maximum: 30 }, pairing_id: { type: "string", format: "uuid" }, user_code: { type: "string", pattern: "^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$" }, verification_uri_complete: { type: "string", format: "uri" },
          },
        },
        ExtensionPairingRedeemRequest: { type: "object", additionalProperties: false, required: ["deviceCode", "pairingId"], properties: { deviceCode: { type: "string", pattern: "^mlp_[A-Za-z0-9_-]{43}$" }, pairingId: { type: "string", format: "uuid" } } },
        ExtensionPairingRedeemResponse: {
          type: "object", additionalProperties: false, required: ["key", "plaintext", "status"], properties: {
            status: { const: "connected" }, plaintext: { type: "string", pattern: "^mlm_[A-Za-z0-9_-]{43}$" }, key: { type: "object", additionalProperties: false, required: ["created_at", "credential_kind", "expires_at", "id", "inactive_after", "key_prefix", "monthly_quota", "name"], properties: { created_at: { type: "string", format: "date-time" }, credential_kind: { const: "browser" }, expires_at: { type: "string", format: "date-time" }, id: { type: "string", format: "uuid" }, inactive_after: { type: "string", format: "date-time" }, key_prefix: { type: "string", maxLength: 16 }, monthly_quota: { type: "integer", minimum: 1 }, name: { type: "string", maxLength: 50 }, rotated_from_id: { type: ["string", "null"], format: "uuid" } } },
          },
        },
        AnalyzeRequest: fragments.analyzeRequest,
        AnalysisResult: fragments.analysisResult,
        EvidenceCoverage: fragments.evidenceCoverage,
        AnalyzeResponse: {
          type: "object", required: ["result", "analysis_mode", "analysis_provider", "analysis_version", "disclaimer", "privacy"], properties: {
            result: { $ref: "#/components/schemas/AnalysisResult" }, analysis_mode: { type: "string", enum: analysis.modes }, analysis_provider: { type: "string", enum: ["heuristic", ...analysis.aiProviders] }, analysis_version: { const: analysis.pipelineVersion }, disclaimer: { type: "string" }, privacy: { type: "object", required: ["stored", "retention", "message"], properties: { stored: { const: false }, retention: { const: "not_stored" }, message: { type: "string" } } },
          },
        },
        Error: { type: "object", required: ["error"], properties: { error: { type: "string" }, fieldErrors: { type: "object", additionalProperties: { type: "string" } } } },
      },
      responses: { Error: { description: "Request failed", headers: { "Retry-After": { schema: { type: "integer" } } }, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
    },
  } as const;
}

export function createExtensionCompatibilityArtifact() {
  return {
    schema: "maillume-extension-compatibility-v1",
    extension_id: extension.officialId,
    extension_version: extension.currentVersion,
    current_analysis_version: analysis.pipelineVersion,
    supported_analysis_versions: extension.supportedAnalysisVersions,
    minimum_analysis_extension_version: extension.minimumAnalysisVersion,
    minimum_pairing_extension_version: extension.minimumPairingVersion,
  } as const;
}

function pairingOperation(
  summary: string,
  requestSchema: string,
  responseSchema: string,
  successDescription: string,
  errorStatuses: number[],
  extraResponses: Record<number, unknown> = {},
) {
  return {
    summary,
    security: [],
    parameters: [
      { $ref: "#/components/parameters/ExtensionId" },
      { $ref: "#/components/parameters/ExtensionVersion" },
      { $ref: "#/components/parameters/AnalysisVersions" },
    ],
    requestBody: { required: true, content: { "application/json": { schema: { $ref: `#/components/schemas/${requestSchema}` } } } },
    responses: {
      201: { description: successDescription, content: { "application/json": { schema: { $ref: `#/components/schemas/${responseSchema}` } } } },
      ...extraResponses,
      ...Object.fromEntries(errorStatuses.map((status) => [status, { $ref: "#/components/responses/Error" }])),
    },
  };
}
