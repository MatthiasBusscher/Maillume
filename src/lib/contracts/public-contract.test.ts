import assert from "node:assert/strict";

import {
  ANALYSIS_ENVELOPE_VERSION,
  ANALYSIS_PIPELINE_VERSION,
  EMAIL_AUTHENTICATION_VERDICTS,
  MAX_SCAN_BODY_LENGTH,
} from "../types";
import {
  LATEST_BROWSER_EXTENSION_VERSION,
  MINIMUM_ANALYSIS_EXTENSION_VERSION,
  MINIMUM_PAIRING_EXTENSION_VERSION,
  OFFICIAL_BROWSER_EXTENSION_ID,
  SUPPORTED_EXTENSION_ANALYSIS_VERSIONS,
} from "../extension-compatibility";
import {
  MAX_EML_SIZE_BYTES,
  MAX_SCREENSHOT_DIMENSION,
  MAX_SCREENSHOT_PIXELS,
  MAX_SCREENSHOT_SIZE_BYTES,
  SUPPORTED_EML_MIME_TYPES,
  SUPPORTED_SCREENSHOT_MIME_TYPES,
} from "../scan-limits";
import { createExtensionCompatibilityArtifact, createOpenApiDocument, PUBLIC_CONTRACT } from "./public-contract";

const openApi = createOpenApiDocument();
const compatibility = createExtensionCompatibilityArtifact();

assert.equal(ANALYSIS_PIPELINE_VERSION, PUBLIC_CONTRACT.analysis.pipelineVersion);
assert.equal(ANALYSIS_ENVELOPE_VERSION, PUBLIC_CONTRACT.analysis.envelopeVersion);
assert.equal(MAX_SCAN_BODY_LENGTH, PUBLIC_CONTRACT.limits.scanBodyCharacters);
assert.deepEqual(EMAIL_AUTHENTICATION_VERDICTS, PUBLIC_CONTRACT.analysis.emailAuthenticationVerdicts);
assert.equal(OFFICIAL_BROWSER_EXTENSION_ID, PUBLIC_CONTRACT.extension.officialId);
assert.equal(LATEST_BROWSER_EXTENSION_VERSION, PUBLIC_CONTRACT.extension.currentVersion);
assert.equal(MINIMUM_ANALYSIS_EXTENSION_VERSION, PUBLIC_CONTRACT.extension.minimumAnalysisVersion);
assert.equal(MINIMUM_PAIRING_EXTENSION_VERSION, PUBLIC_CONTRACT.extension.minimumPairingVersion);
assert.deepEqual(SUPPORTED_EXTENSION_ANALYSIS_VERSIONS, PUBLIC_CONTRACT.extension.supportedAnalysisVersions);
assert.equal(MAX_SCREENSHOT_SIZE_BYTES, PUBLIC_CONTRACT.limits.screenshotBytes);
assert.equal(MAX_SCREENSHOT_PIXELS, PUBLIC_CONTRACT.limits.screenshotPixels);
assert.equal(MAX_SCREENSHOT_DIMENSION, PUBLIC_CONTRACT.limits.screenshotDimension);
assert.equal(MAX_EML_SIZE_BYTES, PUBLIC_CONTRACT.limits.emlBytes);
assert.deepEqual(SUPPORTED_SCREENSHOT_MIME_TYPES, PUBLIC_CONTRACT.uploads.screenshotMimeTypes);
assert.deepEqual(SUPPORTED_EML_MIME_TYPES, PUBLIC_CONTRACT.uploads.emlMimeTypes);
assert.equal(openApi.components.schemas.AnalyzeResponse.properties.analysis_version.const, compatibility.current_analysis_version);
assert.equal(openApi.components.schemas.CapabilitiesResponse.properties.extension.properties.id.const, compatibility.extension_id);
assert.equal(openApi.components.schemas.CapabilitiesResponse.properties.extension.properties.latest_version.const, compatibility.extension_version);

console.log("Checked runtime and generated public-contract parity.");
