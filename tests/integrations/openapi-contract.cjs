/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const specification = JSON.parse(fs.readFileSync(path.resolve("public/openapi.json"), "utf8"));
const compatibility = JSON.parse(
  fs.readFileSync(path.resolve("integrations/browser-extension/compatibility.json"), "utf8"),
);
const manifest = JSON.parse(
  fs.readFileSync(path.resolve("integrations/browser-extension/manifest.json"), "utf8"),
);
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
assert.equal(response.properties.analysis_version.const, compatibility.current_analysis_version);
assert.equal(response.properties.privacy.properties.stored.const, false);
assert.equal(compatibility.schema, "maillume-extension-compatibility-v1");
assert.equal(compatibility.extension_version, manifest.version);
assert.equal(capabilities.properties.analysis_version.const, compatibility.current_analysis_version);
assert.equal(capabilities.properties.extension.properties.id.const, compatibility.extension_id);
assert.equal(capabilities.properties.extension.properties.latest_version.const, compatibility.extension_version);
assert.equal(capabilities.properties.extension.properties.minimum_analysis_version.type, "string");
assert.equal(capabilities.properties.extension.properties.minimum_pairing_version.const, compatibility.minimum_pairing_extension_version);
assert.deepEqual(
  capabilities.properties.extension.properties.supported_analysis_versions.items.pattern,
  "^analysis-v[1-9][0-9]{0,2}$",
);
assert.equal(
  compatibility.supported_analysis_versions.includes(compatibility.current_analysis_version),
  true,
);
assert.deepEqual(pairingStart.properties.lifetimeDays.enum, [30, 90, 180, 365]);
assert.equal(pairingStart.properties.browserConnectionId.pattern, "^mlb_[a-f0-9]{32}$");
assert.equal(pairingRedeem.properties.plaintext.pattern, "^mlm_[A-Za-z0-9_-]{43}$");
assert.equal(pairingRedeem.properties.key.properties.credential_kind.const, "browser");
assert.equal(pairingRedeem.properties.key.properties.inactive_after.format, "date-time");
assert.ok(specification.paths["/api/v1/capabilities"].get);
assert.ok(specification.paths["/api/v1/extension-pairing"].post);
assert.ok(specification.paths["/api/v1/extension-pairing"].put);

console.log("OpenAPI analysis, compatibility, and extension-pairing contracts passed.");
