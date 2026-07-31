// Side-panel coordinator. Focused local scripts loaded before this file provide
// copy, capture handoff, credential handling, response validation, and rendering.
/* eslint-disable @typescript-eslint/no-unused-vars -- classic extension scripts share one ordered global scope */
const elements = Object.fromEntries(
  ["capture", "captureHelp", "captureHelpToggle", "reviewStep", "subject", "sender", "body", "endpoint", "apiKey", "apiKeyVisibility", "rememberApiKey", "manualSetup", "connectionState", "connect", "save", "reset", "destination", "analyze", "status", "result", "score", "level", "classification", "explanation", "coverageSection", "coverageSummary", "coverage", "factors", "signals", "action"]
    .map((id) => [id, document.getElementById(id)]),
);
let activeTabId;
let committedEndpoint = "";
let committedApiKey = "";
let committedRememberApiKey = false;
let committedApiKeyExpiresAt = "";
let committedApiKeyHardExpiresAt = "";
let committedConnectionKind = "";
let pairingPending = false;
let captureQueue = Promise.resolve();
let latestCaptureId = "";
let lastAppliedCaptureId = "";
let captureRetryTimer;
let captureRetryCount = 0;
let capturePending = false;
let capturedLinks = [];
let capturedLinkPairs = [];
let capturedContentComplete = false;

chrome.runtime.onMessage.addListener((message) => {
  if (["capture-started", "capture-ready", "capture-cleared"].includes(message?.type)) {
    queueCaptureOperation(() => handleCaptureNotification(message));
  }
});

initialize().catch(() => setStatus(getDynamicCopy().initializationFailed, true));

async function initialize() {
  localizeUi();
  const [localSettings, sessionSettings] = await Promise.all([
    chrome.storage.local.get(["endpoint", "apiKey", "apiKeyExpiresAt", "apiKeyHardExpiresAt", "connectionKind", "browserConnectionId"]),
    chrome.storage.session.get(["apiKey", "apiKeyExpiresAt", "apiKeyHardExpiresAt", "connectionKind", "extensionPairing"]),
  ]);
  if (!isBrowserConnectionId(localSettings.browserConnectionId)) await chrome.storage.local.set({ browserConnectionId: createBrowserConnectionId() });
  if (localSettings.endpoint) elements.endpoint.value = localSettings.endpoint;
  const storedApiKey = localSettings.apiKey || sessionSettings.apiKey || "";
  committedEndpoint = localSettings.endpoint || "";
  committedApiKey = storedApiKey;
  committedRememberApiKey = Boolean(localSettings.apiKey);
  committedApiKeyExpiresAt = localSettings.apiKeyExpiresAt || sessionSettings.apiKeyExpiresAt || "";
  committedApiKeyHardExpiresAt = localSettings.apiKeyHardExpiresAt || sessionSettings.apiKeyHardExpiresAt || committedApiKeyExpiresAt;
  committedConnectionKind = localSettings.connectionKind || sessionSettings.connectionKind || (storedApiKey ? "manual" : "");
  elements.apiKey.value = committedConnectionKind === "browser" ? "" : storedApiKey;
  elements.rememberApiKey.checked = committedRememberApiKey || !sessionSettings.apiKey;
  updateApiKeyVisibility();
  updateConnectionState();
  updateDestination();
  updateAnalyzeState();
  if (isStoredPairing(sessionSettings.extensionPairing)) void resumePairing(sessionSettings.extensionPairing);
  activeTabId = await getActiveTabId();
  if (!Number.isInteger(activeTabId)) return setStatus(getDynamicCopy().noTab, true);
  await queueCaptureOperation(() => consumeCapture(activeTabId));
}

elements.connect.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  if (!endpoint) return setStatus(copy.invalidEndpoint, true);
  if (pairingPending) return;
  let granted;
  try { granted = await chrome.permissions.request({ origins: [permissionPattern(endpoint)] }); } catch { return setStatus(copy.permissionError, true); }
  if (!granted) return setStatus(copy.permissionDenied, true);
  pairingPending = true;
  elements.connect.disabled = true;
  setStatus(copy.connecting);
  try {
    const capabilities = await fetch(`${endpoint}/api/v1/capabilities`, { headers: EXTENSION_HEADERS });
    if (capabilities.status === 404) throw new PairingError("unsupported");
    if (!capabilities.ok) throw new PairingError("failed");
    const capabilityPayload = await capabilities.json();
    if (capabilityPayload?.extension?.pairing_available !== true || capabilityPayload.extension.id !== chrome.runtime.id) throw new PairingError("unsupported");
    if (!isCompatibleCapabilityResponse(capabilityPayload)) throw new PairingError("update");
    const browserLifecycle = supportsBrowserConnectionLifecycle(capabilityPayload);
    const { browserConnectionId } = await chrome.storage.local.get(["browserConnectionId"]);
    if (!isBrowserConnectionId(browserConnectionId)) throw new PairingError("failed");
    const response = await fetch(`${endpoint}/api/v1/extension-pairing`, {
      method: "POST", headers: { ...EXTENSION_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify(browserLifecycle ? { browserConnectionId, lifetimeDays: BROWSER_CONNECTION_LIFETIME_DAYS, locale: getLocale(), name: getBrowserKeyName() } : { lifetimeDays: 90, locale: getLocale(), name: getBrowserKeyName() }),
    });
    if (response.status === 404) throw new PairingError("unsupported");
    if (response.status === 426) throw new PairingError("update");
    if (!response.ok) throw new PairingError("failed");
    const pairing = normalizePairingResponse(await response.json(), endpoint, browserLifecycle);
    if (!pairing) throw new PairingError("failed");
    pairing.remember = true;
    await chrome.storage.session.set({ extensionPairing: pairing });
    await chrome.tabs.create({ url: pairing.verificationUrl });
    await resumePairing(pairing);
  } catch (error) {
    pairingPending = false;
    elements.connect.disabled = false;
    const reason = error instanceof PairingError ? error.reason : "failed";
    if (reason === "unsupported" || reason === "failed") elements.manualSetup.open = true;
    setStatus(reason === "unsupported" ? copy.pairingUnsupported : reason === "update" ? copy.updateRequired : copy.pairingFailed, true);
  }
});

elements.save.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  if (!endpoint) return setStatus(copy.invalidEndpoint, true);
  const apiKey = elements.apiKey.value.trim();
  const rememberApiKey = elements.rememberApiKey.checked === true;
  if (!/^mlm_[A-Za-z0-9_-]{43}$/.test(apiKey)) return setStatus(copy.invalidApiKey, true);
  const outcome = await commitConnection({ apiKey, connectionKind: "manual", endpoint, expiresAt: "", hardExpiresAt: "", rememberApiKey });
  if (outcome === "permission_error") return setStatus(copy.permissionError, true);
  if (outcome === "permission_denied") return setStatus(copy.permissionDenied, true);
  if (outcome === "cleanup_failed") return setStatus(copy.permissionCleanupFailed, true);
  if (outcome !== "saved") return setStatus(copy.saveFailed, true);
  setStatus(rememberApiKey ? copy.savedPersistent : copy.savedSession);
});

elements.apiKeyVisibility.addEventListener("click", () => {
  if (elements.apiKeyVisibility.disabled) return;
  const visible = elements.apiKey.type !== "text";
  const label = visible ? getDynamicCopy().hideApiKey : getDynamicCopy().showApiKey;
  elements.apiKey.type = visible ? "text" : "password";
  elements.apiKeyVisibility.setAttribute("aria-pressed", String(visible));
  elements.apiKeyVisibility.setAttribute("aria-label", label);
  elements.apiKeyVisibility.setAttribute("title", label);
});

elements.capture.addEventListener("click", async () => {
  if (capturePending) return;
  activeTabId = await getActiveTabId();
  const copy = getDynamicCopy();
  if (!Number.isInteger(activeTabId)) return setStatus(copy.noTab, true);
  clearMessageData();
  setCapturePending(true);
  setStatus(copy.capturing);
  try {
    const response = await chrome.runtime.sendMessage({ type: "capture-active-tab", tabId: activeTabId });
    if (response?.captureId && latestCaptureId && response.captureId !== latestCaptureId) return;
    if (!response?.accepted) setStatus(copy.captureErrors[response?.code] || copy.captureErrors.capture_failed, true);
  } catch { setStatus(copy.captureErrors.capture_failed, true); } finally { setCapturePending(false); }
});

elements.captureHelpToggle.addEventListener("click", () => {
  const hidden = !elements.captureHelp.hidden;
  elements.captureHelp.hidden = hidden;
  elements.captureHelpToggle.setAttribute("aria-expanded", String(!hidden));
  elements.captureHelpToggle.textContent = hidden ? getDynamicCopy().showInstructions : getDynamicCopy().hideInstructions;
});

elements.reset.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  const originPattern = committedEndpoint ? permissionPattern(committedEndpoint) : null;
  const storageResults = await Promise.allSettled([
    chrome.storage.local.remove(["endpoint", "apiKey", "apiKeyExpiresAt", "apiKeyHardExpiresAt", "connectionKind"]),
    chrome.storage.session.remove(["apiKey", "apiKeyExpiresAt", "apiKeyHardExpiresAt", "connectionKind", "extensionPairing"]),
  ]);
  if (storageResults.some(({ status }) => status === "rejected")) {
    const [localSettings, sessionSettings] = await Promise.all([
      chrome.storage.local.get(["endpoint", "apiKey", "apiKeyExpiresAt", "apiKeyHardExpiresAt", "connectionKind"]).catch(() => ({})),
      chrome.storage.session.get(["apiKey", "apiKeyExpiresAt", "apiKeyHardExpiresAt", "connectionKind"]).catch(() => ({})),
    ]);
    committedEndpoint = localSettings.endpoint || "";
    committedApiKey = localSettings.apiKey || sessionSettings.apiKey || "";
    committedRememberApiKey = Boolean(localSettings.apiKey);
    committedApiKeyExpiresAt = localSettings.apiKeyExpiresAt || sessionSettings.apiKeyExpiresAt || "";
    committedApiKeyHardExpiresAt = localSettings.apiKeyHardExpiresAt || sessionSettings.apiKeyHardExpiresAt || committedApiKeyExpiresAt;
    committedConnectionKind = localSettings.connectionKind || sessionSettings.connectionKind || "";
    elements.endpoint.value = committedEndpoint || "https://app.maillume.io";
    elements.apiKey.value = committedConnectionKind === "browser" ? "" : committedApiKey;
    elements.rememberApiKey.checked = committedRememberApiKey;
    clearMessageData(); updateConnectionState(); updateDestination();
    return setStatus(copy.removeStorageFailed, true);
  }
  let permissionRemoved = true;
  if (originPattern) { try { permissionRemoved = await chrome.permissions.remove({ origins: [originPattern] }); } catch { permissionRemoved = false; } }
  committedEndpoint = ""; committedApiKey = ""; committedRememberApiKey = false; committedApiKeyExpiresAt = ""; committedApiKeyHardExpiresAt = ""; committedConnectionKind = "";
  elements.endpoint.value = "https://app.maillume.io";
  elements.apiKey.value = "";
  elements.apiKey.type = "password";
  updateApiKeyVisibility();
  elements.rememberApiKey.checked = true;
  clearMessageData(); updateConnectionState(); updateDestination(); updateAnalyzeState();
  setStatus(permissionRemoved ? copy.removed : copy.removePermissionFailed, !permissionRemoved);
});

elements.analyze.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  const endpoint = committedEndpoint;
  const apiKey = committedApiKey;
  const body = elements.body.value.trim();
  if (!body) return setStatus(copy.bodyRequired, true);
  if (!endpoint || !apiKey) return setStatus(copy.connectionRequired, true);
  elements.analyze.disabled = true;
  clearResult();
  setStatus(copy.sending(new URL(endpoint).origin));
  try {
    let response;
    try {
      response = await fetch(`${endpoint}/api/v1/analyze`, { method: "POST", headers: { ...EXTENSION_HEADERS, Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ source: "chrome", subject: elements.subject.value.trim(), senderEmail: elements.sender.value.trim(), body, locale: getLocale(), links: capturedLinks, linkPairs: capturedLinkPairs, ...(!capturedContentComplete ? { evidenceTruncated: true } : {}) }) });
    } catch { throw new Error(copy.unreachable); }
    if (response.status === 426) throw new Error(copy.updateRequired);
    if (response.status === 401 || response.status === 403) throw new Error(committedConnectionKind === "browser" ? copy.browserAuthenticationFailed : copy.authenticationFailed);
    if (response.status === 429) throw new Error(copy.quotaExceeded);
    if (!response.ok) throw new Error(copy.requestFailed(response.status));
    let payload;
    try { payload = await readBoundedAnalysisResponse(response); } catch (error) {
      throw new Error(error instanceof AnalysisResponseTooLargeError ? copy.resultTooLarge : copy.invalidResult);
    }
    if (!SUPPORTED_ANALYSIS_VERSIONS.includes(payload?.analysis_version)) throw new Error(copy.incompatibleResult);
    if (!isAnalysisResponse(payload)) throw new Error(copy.invalidResult);
    await refreshBrowserConnectionExpiry();
    renderResult(payload.result);
    setStatus(copy.complete);
  } catch (error) { setStatus(error instanceof Error ? error.message : copy.invalidResult, true); } finally { updateAnalyzeState(); }
});

for (const id of ["body", "endpoint", "apiKey"]) {
  elements[id].addEventListener("input", () => {
    if (id === "body") { capturedLinks = []; capturedLinkPairs = []; capturedContentComplete = false; }
    if (id === "apiKey") updateApiKeyVisibility();
    updateDestination();
    updateAnalyzeState();
  });
}
