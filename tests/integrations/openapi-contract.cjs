/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const specification = JSON.parse(fs.readFileSync(path.resolve("public/openapi.json"), "utf8"));
const request = specification.components.schemas.AnalyzeRequest;
const response = specification.components.schemas.AnalyzeResponse;
const result = specification.components.schemas.AnalysisResult;
const coverage = specification.components.schemas.EvidenceCoverage;
const capabilities = specification.components.schemas.CapabilitiesResponse;
const pairingStart = specification.components.schemas.ExtensionPairingStartRequest;
const pairingRedeem = specification.components.schemas.ExtensionPairingRedeemResponse;

assert.equal(request.properties.body.maxLength, 20_000);
assert.equal(request.properties.evidenceTruncated.type, "boolean");
assert.equal(request.properties.links.type, "array");
assert.equal(request.properties.links.maxItems, 20);
assert.equal(request.properties.links.items.maxLength, 2_048);
assert.equal(request.properties.links.items.pattern, "^[Hh][Tt][Tt][Pp][Ss]?://");
assert.equal(request.properties.linkPairs.maxItems, 20);
assert.equal(request.properties.linkPairs.items.properties.displayedUrl.maxLength, 2_048);
assert.equal(request.properties.linkPairs.items.properties.destinationUrl.maxLength, 2_048);
assert.equal(request.properties.attachmentRiskTypes.maxItems, 3);
assert.deepEqual(request.properties.attachmentRiskTypes.items.enum, ["executable", "macro_enabled", "double_extension"]);
assert.deepEqual(response.required, [
  "result",
  "analysis_mode",
  "analysis_provider",
  "analysis_version",
  "disclaimer",
  "privacy",
]);
assert.ok(result.required.includes("evidence_coverage"));
assert.equal(result.properties.evidence_coverage.$ref, "#/components/schemas/EvidenceCoverage");
assert.deepEqual(coverage.required, [
  "subject_available",
  "sender_available",
  "full_content_available",
  "link_destinations_available",
  "authentication_results_available",
  "attachment_evidence_available",
  "extraction_type",
]);
assert.equal(coverage.additionalProperties, false);
assert.deepEqual(coverage.properties.extraction_type.enum, ["direct", "ocr", "parsed"]);
assert.equal(response.properties.analysis_version.const, "analysis-v10");
assert.equal(response.properties.privacy.properties.stored.const, false);
assert.equal(capabilities.properties.extension.properties.latest_version.const, "0.3.9");
assert.equal(capabilities.properties.extension.properties.minimum_pairing_version.const, "0.3.9");
assert.deepEqual(pairingStart.properties.lifetimeDays.enum, [30, 90, 180]);
assert.equal(pairingRedeem.properties.plaintext.pattern, "^mlm_[A-Za-z0-9_-]{43}$");
assert.ok(specification.paths["/api/v1/capabilities"].get);
assert.ok(specification.paths["/api/v1/extension-pairing"].post);
assert.ok(specification.paths["/api/v1/extension-pairing"].put);

console.log("OpenAPI analysis, compatibility, and extension-pairing contracts passed.");
