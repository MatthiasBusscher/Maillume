// Deployment selection and origin permission. Hosted analysis is anonymous, so the
// extension stores only the chosen deployment URL and never keeps a credential.
/* eslint-disable @typescript-eslint/no-unused-vars -- classic extension scripts share one ordered global scope */
const EXTENSION_VERSION = chrome.runtime.getManifest().version;
const DEFAULT_ENDPOINT = "https://app.maillume.io";
const EXTENSION_HEADERS = {
  "X-Maillume-Analysis-Versions": SUPPORTED_ANALYSIS_VERSIONS.join(","),
  "X-Maillume-Extension-Id": chrome.runtime.id,
  "X-Maillume-Extension-Version": EXTENSION_VERSION,
};
// Written by the account-based releases before 0.5.0 and removed on start-up.
const LEGACY_CREDENTIAL_KEYS = ["apiKey", "apiKeyExpiresAt", "apiKeyHardExpiresAt", "connectionKind", "browserConnectionId", "extensionPairing"];

function normalizeEndpoint(value) {
  try {
    const url = new URL(value.trim());
    const localHttp = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    return url.protocol === "https:" || localHttp ? url.origin : null;
  } catch {
    return null;
  }
}

function permissionPattern(endpoint) {
  const url = new URL(endpoint);
  return `${url.protocol}//${url.hostname}/*`;
}

async function clearLegacyCredentials() {
  await Promise.allSettled([
    chrome.storage.local.remove(LEGACY_CREDENTIAL_KEYS),
    chrome.storage.session.remove(LEGACY_CREDENTIAL_KEYS),
  ]);
}

// Call this before any other await in a click handler: Chrome only shows the
// permission prompt while the user gesture is still active.
async function ensureEndpointPermission(endpoint) {
  const origins = [permissionPattern(endpoint)];
  try {
    return await chrome.permissions.request({ origins }) ? "granted" : "permission_denied";
  } catch {
    return "permission_error";
  }
}

async function commitEndpoint(endpoint) {
  const previousPattern = permissionPattern(committedEndpoint);
  try {
    if (endpoint === DEFAULT_ENDPOINT) await chrome.storage.local.remove(["endpoint"]);
    else await chrome.storage.local.set({ endpoint });
  } catch {
    return "save_failed";
  }
  if (previousPattern !== permissionPattern(endpoint)) await removePermission(previousPattern);
  committedEndpoint = endpoint;
  elements.endpoint.value = endpoint;
  updateDestination();
  return "saved";
}

async function removePermission(originPattern) { try { await chrome.permissions.remove({ origins: [originPattern] }); } catch { /* cleanup is best effort */ } }
