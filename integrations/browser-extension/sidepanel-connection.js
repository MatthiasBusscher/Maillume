// Connection credentials and pairing state are intentionally isolated from the
// manual-key input. A managed browser credential is never copied into that field.
/* eslint-disable @typescript-eslint/no-unused-vars -- classic extension scripts share one ordered global scope */
const EXTENSION_VERSION = chrome.runtime.getManifest().version;
const BROWSER_CONNECTION_LIFETIME_DAYS = 365;
const BROWSER_CONNECTION_INACTIVITY_DAYS = 90;
const EXTENSION_HEADERS = {
  "X-Maillume-Analysis-Versions": SUPPORTED_ANALYSIS_VERSIONS.join(","),
  "X-Maillume-Extension-Id": chrome.runtime.id,
  "X-Maillume-Extension-Version": EXTENSION_VERSION,
};

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

async function commitConnection({ apiKey, connectionKind, endpoint, expiresAt, hardExpiresAt, permissionAlreadyGranted = false, rememberApiKey }) {
  const originPattern = permissionPattern(endpoint);
  if (!permissionAlreadyGranted) {
    let granted;
    try { granted = await chrome.permissions.request({ origins: [originPattern] }); } catch { return "permission_error"; }
    if (!granted) return "permission_denied";
  }
  const previousPattern = committedEndpoint ? permissionPattern(committedEndpoint) : null;
  try {
    await Promise.all([chrome.storage.local.set({ endpoint }), storeApiKey(apiKey, rememberApiKey, expiresAt, hardExpiresAt, connectionKind)]);
  } catch {
    await restoreCommittedSettings();
    if (originPattern !== previousPattern) await removePermission(originPattern);
    return "save_failed";
  }
  if (previousPattern && previousPattern !== originPattern) {
    let removed = false;
    try { removed = await chrome.permissions.remove({ origins: [previousPattern] }); } catch { /* handled below */ }
    if (!removed) {
      await restoreCommittedSettings();
      await removePermission(originPattern);
      return "cleanup_failed";
    }
  }
  committedEndpoint = endpoint;
  committedApiKey = apiKey;
  committedRememberApiKey = rememberApiKey;
  committedApiKeyExpiresAt = expiresAt;
  committedApiKeyHardExpiresAt = hardExpiresAt || expiresAt;
  committedConnectionKind = connectionKind;
  elements.endpoint.value = endpoint;
  elements.apiKey.value = connectionKind === "browser" ? "" : apiKey;
  elements.apiKey.type = "password";
  elements.apiKeyVisibility.setAttribute("aria-pressed", "false");
  elements.apiKeyVisibility.setAttribute("aria-label", getDynamicCopy().showApiKey);
  elements.apiKeyVisibility.setAttribute("title", getDynamicCopy().showApiKey);
  updateApiKeyVisibility();
  elements.rememberApiKey.checked = rememberApiKey;
  if (connectionKind === "browser") elements.manualSetup.open = false;
  updateConnectionState();
  updateDestination();
  updateAnalyzeState();
  return "saved";
}

async function restoreCommittedSettings() {
  const endpointOperation = committedEndpoint ? chrome.storage.local.set({ endpoint: committedEndpoint }) : chrome.storage.local.remove(["endpoint"]);
  const keyOperation = committedApiKey
    ? storeApiKey(committedApiKey, committedRememberApiKey, committedApiKeyExpiresAt, committedApiKeyHardExpiresAt, committedConnectionKind)
    : Promise.all([
        chrome.storage.local.remove(["apiKey", "apiKeyExpiresAt", "apiKeyHardExpiresAt", "connectionKind"]),
        chrome.storage.session.remove(["apiKey", "apiKeyExpiresAt", "apiKeyHardExpiresAt", "connectionKind"]),
      ]);
  await Promise.allSettled([endpointOperation, keyOperation]);
}

async function storeApiKey(apiKey, remember, expiresAt = "", hardExpiresAt = "", connectionKind = "manual") {
  const metadata = { connectionKind, ...(expiresAt ? { apiKeyExpiresAt: expiresAt } : {}), ...(hardExpiresAt ? { apiKeyHardExpiresAt: hardExpiresAt } : {}) };
  if (remember) {
    await Promise.all([
      chrome.storage.local.set({ apiKey, ...metadata }),
      expiresAt ? Promise.resolve() : chrome.storage.local.remove(["apiKeyExpiresAt"]),
      hardExpiresAt ? Promise.resolve() : chrome.storage.local.remove(["apiKeyHardExpiresAt"]),
      chrome.storage.session.remove(["apiKey", "apiKeyExpiresAt", "apiKeyHardExpiresAt", "connectionKind"]),
    ]);
    return;
  }
  await Promise.all([
    chrome.storage.local.remove(["apiKey", "apiKeyExpiresAt", "apiKeyHardExpiresAt", "connectionKind"]),
    chrome.storage.session.set({ apiKey, ...metadata }),
    expiresAt ? Promise.resolve() : chrome.storage.session.remove(["apiKeyExpiresAt"]),
    hardExpiresAt ? Promise.resolve() : chrome.storage.session.remove(["apiKeyHardExpiresAt"]),
  ]);
}

async function refreshBrowserConnectionExpiry() {
  if (committedConnectionKind !== "browser" || !committedApiKeyHardExpiresAt) return;
  const inactivityExpiration = new Date(Date.now() + BROWSER_CONNECTION_INACTIVITY_DAYS * 86_400_000).toISOString();
  committedApiKeyExpiresAt = earlierTimestamp(committedApiKeyHardExpiresAt, inactivityExpiration);
  await storeApiKey(committedApiKey, committedRememberApiKey, committedApiKeyExpiresAt, committedApiKeyHardExpiresAt, committedConnectionKind);
  updateDestination();
}

async function resumePairing(pairing) {
  const copy = getDynamicCopy();
  if (!isStoredPairing(pairing)) { await chrome.storage.session.remove(["extensionPairing"]); return; }
  if (Date.parse(pairing.expiresAt) <= Date.now()) {
    await chrome.storage.session.remove(["extensionPairing"]);
    pairingPending = false;
    elements.connect.disabled = false;
    setStatus(copy.pairingExpired, true);
    return;
  }
  pairingPending = true;
  elements.connect.disabled = true;
  setStatus(copy.connecting);
  try {
    while (Date.now() < Date.parse(pairing.expiresAt)) {
      const response = await fetch(`${pairing.endpoint}/api/v1/extension-pairing`, { method: "PUT", headers: { ...EXTENSION_HEADERS, "Content-Type": "application/json" }, body: JSON.stringify({ deviceCode: pairing.deviceCode, pairingId: pairing.pairingId }) });
      if (response.status === 202 || response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        await delay(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 30) * 1_000 : pairing.interval * 1_000);
        continue;
      }
      if (response.status === 403) throw new PairingError("denied");
      if (response.status === 410) throw new PairingError("expired");
      if (response.status === 426) throw new PairingError("update");
      if (!response.ok) throw new PairingError("failed");
      const key = normalizeConnectedKey(await response.json(), pairing.browserLifecycle === true);
      if (!key) throw new PairingError("failed");
      const outcome = await commitConnection({ apiKey: key.plaintext, connectionKind: "browser", endpoint: pairing.endpoint, expiresAt: key.expiresAt, hardExpiresAt: key.hardExpiresAt, permissionAlreadyGranted: true, rememberApiKey: true });
      if (outcome !== "saved") throw new PairingError("failed");
      await chrome.storage.session.remove(["extensionPairing"]);
      setStatus(copy.connected);
      return;
    }
    throw new PairingError("expired");
  } catch (error) {
    const reason = error instanceof PairingError ? error.reason : "failed";
    if (["denied", "expired", "update"].includes(reason)) await chrome.storage.session.remove(["extensionPairing"]);
    setStatus(reason === "denied" ? copy.pairingDenied : reason === "expired" ? copy.pairingExpired : reason === "update" ? copy.updateRequired : copy.pairingFailed, true);
  } finally {
    pairingPending = false;
    elements.connect.disabled = false;
  }
}

function normalizePairingResponse(payload, endpoint, browserLifecycle) {
  if (!payload || typeof payload !== "object" || !isPairingId(payload.pairing_id) || !/^mlp_[A-Za-z0-9_-]{43}$/.test(payload.device_code) || typeof payload.verification_uri_complete !== "string" || !Number.isInteger(payload.interval) || payload.interval < 1 || payload.interval > 30 || !isFutureTimestamp(payload.expires_at)) return null;
  try {
    const verificationUrl = new URL(payload.verification_uri_complete);
    if (verificationUrl.origin !== endpoint || verificationUrl.protocol !== new URL(endpoint).protocol) return null;
    return { browserLifecycle, deviceCode: payload.device_code, endpoint, expiresAt: payload.expires_at, interval: payload.interval, pairingId: payload.pairing_id, verificationUrl: verificationUrl.toString() };
  } catch { return null; }
}

function normalizeConnectedKey(payload, browserLifecycle) {
  const hardExpiresAt = payload?.key?.expires_at;
  const inactiveAfter = payload?.key?.inactive_after;
  if (payload?.status !== "connected" || !/^mlm_[A-Za-z0-9_-]{43}$/.test(payload.plaintext) || !isFutureTimestamp(hardExpiresAt)) return null;
  if (!browserLifecycle) return { expiresAt: hardExpiresAt, hardExpiresAt, plaintext: payload.plaintext };
  return payload?.key?.credential_kind === "browser" && isFutureTimestamp(inactiveAfter)
    ? { expiresAt: earlierTimestamp(hardExpiresAt, inactiveAfter), hardExpiresAt, plaintext: payload.plaintext } : null;
}

function isStoredPairing(value) {
  if (!value || typeof value !== "object" || normalizeEndpoint(value.endpoint) !== value.endpoint || !/^mlp_[A-Za-z0-9_-]{43}$/.test(value.deviceCode) || !isPairingId(value.pairingId) || !Number.isInteger(value.interval) || value.interval < 1 || value.interval > 30 || typeof value.expiresAt !== "string" || !Number.isFinite(Date.parse(value.expiresAt)) || typeof value.remember !== "boolean" || typeof value.verificationUrl !== "string") return false;
  try { return new URL(value.verificationUrl).origin === value.endpoint; } catch { return false; }
}

function isCompatibleCapabilityResponse(payload) {
  return Boolean(payload?.extension?.pairing_available === true && payload.extension.id === chrome.runtime.id && Array.isArray(payload.extension.supported_analysis_versions) && payload.extension.supported_analysis_versions.some((version) => SUPPORTED_ANALYSIS_VERSIONS.includes(version)) && compareVersions(EXTENSION_VERSION, payload.extension.minimum_pairing_version) >= 0);
}
function supportsBrowserConnectionLifecycle(payload) { return isCompatibleCapabilityResponse(payload) && compareVersions(payload.extension.latest_version, "0.4.0") >= 0; }
function compareVersions(left, right) {
  if (!/^\d+\.\d+\.\d+$/.test(left) || !/^\d+\.\d+\.\d+$/.test(right)) return Number.NaN;
  const leftParts = left.split(".").map(Number); const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) if (leftParts[index] !== rightParts[index]) return leftParts[index] > rightParts[index] ? 1 : -1;
  return 0;
}
function getBrowserKeyName() { return `Chrome extension · ${String(navigator.userAgentData?.platform || navigator.platform || "Chrome").replace(/\s+/g, " ").trim().slice(0, 28)}`.slice(0, 50); }
function createBrowserConnectionId() { return `mlb_${crypto.randomUUID().replaceAll("-", "")}`; }
function isBrowserConnectionId(value) { return typeof value === "string" && /^mlb_[a-f0-9]{32}$/.test(value); }
function earlierTimestamp(left, right) { return Date.parse(left) <= Date.parse(right) ? left : right; }
function getDaysUntilExpiry(value) { if (!value || !Number.isFinite(Date.parse(value))) return null; return Math.max(0, Math.ceil((Date.parse(value) - Date.now()) / 86_400_000)); }
function isExpired(value) { return Boolean(value && Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now()); }
function isFutureTimestamp(value) { return typeof value === "string" && Number.isFinite(Date.parse(value)) && Date.parse(value) > Date.now(); }
function isPairingId(value) { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function delay(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
class PairingError extends Error { constructor(reason) { super(reason); this.reason = reason; } }
async function removePermission(originPattern) { try { await chrome.permissions.remove({ origins: [originPattern] }); } catch { /* cleanup is best effort */ } }
