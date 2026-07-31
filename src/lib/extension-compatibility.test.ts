import assert from "node:assert/strict";

import {
  compareBrowserExtensionVersions,
  evaluateExtensionCompatibility,
  EXTENSION_CLIENT_HEADERS,
  getExtensionCapabilities,
  getExtensionClient,
  isBrowserExtensionVersion,
  LATEST_BROWSER_EXTENSION_VERSION,
  MINIMUM_ANALYSIS_EXTENSION_VERSION,
  MINIMUM_PAIRING_EXTENSION_VERSION,
  OFFICIAL_BROWSER_EXTENSION_ID,
} from "./extension-compatibility";

function clientHeaders({
  analysisVersions = "analysis-v11, analysis-v12",
  extensionId = OFFICIAL_BROWSER_EXTENSION_ID,
  extensionVersion = LATEST_BROWSER_EXTENSION_VERSION,
} = {}) {
  return new Headers({
    [EXTENSION_CLIENT_HEADERS.analysisVersions]: analysisVersions,
    [EXTENSION_CLIENT_HEADERS.extensionId]: extensionId,
    [EXTENSION_CLIENT_HEADERS.extensionVersion]: extensionVersion,
  });
}

assert.equal(compareBrowserExtensionVersions("0.3.9", "0.3.8"), 1);
assert.equal(compareBrowserExtensionVersions("0.3.8", "0.3.8"), 0);
assert.equal(compareBrowserExtensionVersions("0.3.7", "0.3.8"), -1);
assert.equal(Number.isNaN(compareBrowserExtensionVersions("invalid", "0.3.8")), true);
assert.equal(isBrowserExtensionVersion("0.3.9"), true);
assert.equal(isBrowserExtensionVersion("0.03.9"), false);
assert.equal(isBrowserExtensionVersion("0.3.9.1"), false);
assert.equal(isBrowserExtensionVersion("65536.0.0"), false);

assert.deepEqual(getExtensionClient(new Headers()), null);
assert.deepEqual(getExtensionClient(clientHeaders()), {
  analysisVersions: ["analysis-v11", "analysis-v12"],
  extensionId: OFFICIAL_BROWSER_EXTENSION_ID,
  extensionVersion: LATEST_BROWSER_EXTENSION_VERSION,
});
assert.equal(evaluateExtensionCompatibility(clientHeaders()).compatible, true);
assert.deepEqual(
  evaluateExtensionCompatibility(clientHeaders({ extensionVersion: "0.3.7" })),
  {
    compatible: false,
    client: {
      analysisVersions: ["analysis-v11", "analysis-v12"],
      extensionId: OFFICIAL_BROWSER_EXTENSION_ID,
      extensionVersion: "0.3.7",
    },
    reason: "upgrade_required",
  },
);
const unsupportedAnalysis = evaluateExtensionCompatibility(
  clientHeaders({ analysisVersions: "analysis-v8,analysis-v9" }),
);
assert.equal(unsupportedAnalysis.compatible, false);
if (unsupportedAnalysis.compatible) throw new Error("Expected incompatible analysis versions.");
assert.equal(unsupportedAnalysis.reason, "unsupported_analysis");
const invalidClient = evaluateExtensionCompatibility(
  clientHeaders({ extensionId: "a".repeat(32) }),
);
assert.equal(invalidClient.compatible, false);
if (invalidClient.compatible) throw new Error("Expected an invalid extension client.");
assert.equal(invalidClient.reason, "invalid_client");
assert.equal(
  evaluateExtensionCompatibility(clientHeaders(), {
    minimumVersion: MINIMUM_PAIRING_EXTENSION_VERSION,
  }).compatible,
  true,
);

const capabilities = getExtensionCapabilities();
assert.equal(capabilities.analysis_version, "analysis-v12");
assert.equal(capabilities.extension.id, OFFICIAL_BROWSER_EXTENSION_ID);
assert.equal(capabilities.extension.latest_version, LATEST_BROWSER_EXTENSION_VERSION);
assert.equal(capabilities.extension.minimum_analysis_version, MINIMUM_ANALYSIS_EXTENSION_VERSION);
assert.equal(capabilities.extension.minimum_pairing_version, MINIMUM_PAIRING_EXTENSION_VERSION);
assert.equal(capabilities.extension.pairing_available, true);

console.log("Checked browser extension compatibility contracts.");
