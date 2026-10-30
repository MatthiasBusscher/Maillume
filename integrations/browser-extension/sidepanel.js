// Side-panel coordinator. Focused local scripts loaded before this file provide
// copy, capture handoff, deployment selection, response validation, and rendering.
/* eslint-disable @typescript-eslint/no-unused-vars -- classic extension scripts share one ordered global scope */
const elements = Object.fromEntries(
  ["scannerView", "settingsView", "settingsToggle", "settingsBack", "settingsHeading", "capture", "captureHelp", "captureHelpToggle", "reviewStep", "subject", "sender", "body", "endpoint", "save", "reset", "destination", "analyze", "status", "settingsStatus", "result", "score", "level", "classification", "explanation", "coverageSection", "coverageSummary", "coverage", "factors", "signals", "action"]
    .map((id) => [id, document.getElementById(id)]),
);
let activeTabId;
let committedEndpoint = DEFAULT_ENDPOINT;
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
  const [{ endpoint }] = await Promise.all([chrome.storage.local.get(["endpoint"]), clearLegacyCredentials()]);
  committedEndpoint = normalizeEndpoint(endpoint || "") || DEFAULT_ENDPOINT;
  elements.endpoint.value = committedEndpoint;
  updateDestination();
  updateAnalyzeState();
  activeTabId = await getActiveTabId();
  if (!Number.isInteger(activeTabId)) return setStatus(getDynamicCopy().noTab, true);
  await queueCaptureOperation(() => consumeCapture(activeTabId));
}

function showSettings() {
  elements.scannerView.hidden = true;
  elements.settingsView.hidden = false;
  elements.settingsToggle.setAttribute("aria-expanded", "true");
  elements.settingsHeading.focus?.();
}

function showScanner() {
  elements.settingsView.hidden = true;
  elements.scannerView.hidden = false;
  elements.settingsToggle.setAttribute("aria-expanded", "false");
  elements.capture.focus?.();
}

elements.settingsToggle.addEventListener("click", () => {
  if (elements.settingsView.hidden) showSettings();
  else showScanner();
});

elements.settingsBack.addEventListener("click", showScanner);

elements.save.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  if (!endpoint) return setStatus(copy.invalidEndpoint, true);
  if (await commitEndpoint(endpoint) !== "saved") return setStatus(copy.saveFailed, true);
  setStatus(copy.savedEndpoint(endpoint));
});

elements.reset.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  if (await commitEndpoint(DEFAULT_ENDPOINT) !== "saved") return setStatus(copy.saveFailed, true);
  setStatus(copy.resetEndpoint);
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

elements.analyze.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  const endpoint = committedEndpoint;
  const body = elements.body.value.trim();
  if (!body) return setStatus(copy.bodyRequired, true);
  elements.analyze.disabled = true;
  const permission = await ensureEndpointPermission(endpoint);
  if (permission !== "granted") {
    updateAnalyzeState();
    return setStatus(permission === "permission_denied" ? copy.permissionDenied : copy.permissionError, true);
  }
  clearResult();
  setStatus(copy.sending(new URL(endpoint).origin));
  try {
    let response;
    try {
      response = await fetch(`${endpoint}/api/v1/analyze`, { method: "POST", headers: { ...EXTENSION_HEADERS, "Content-Type": "application/json" }, body: JSON.stringify({ source: "chrome", subject: elements.subject.value.trim(), senderEmail: elements.sender.value.trim(), body, locale: getLocale(), links: capturedLinks, linkPairs: capturedLinkPairs, ...(!capturedContentComplete ? { evidenceTruncated: true } : {}) }) });
    } catch { throw new Error(copy.unreachable); }
    if (response.status === 426) throw new Error(copy.updateRequired);
    if (response.status === 429) throw new Error(copy.rateLimited);
    if (!response.ok) throw new Error(copy.requestFailed(response.status));
    let payload;
    try { payload = await readBoundedAnalysisResponse(response); } catch (error) {
      throw new Error(error instanceof AnalysisResponseTooLargeError ? copy.resultTooLarge : copy.invalidResult);
    }
    if (!SUPPORTED_ANALYSIS_VERSIONS.includes(payload?.analysis_version)) throw new Error(copy.incompatibleResult);
    if (!isAnalysisResponse(payload)) throw new Error(copy.invalidResult);
    renderResult(payload.result);
    setStatus(copy.complete);
  } catch (error) { setStatus(error instanceof Error ? error.message : copy.invalidResult, true); } finally { updateAnalyzeState(); }
});

for (const id of ["body", "endpoint"]) {
  elements[id].addEventListener("input", () => {
    if (id === "body") { capturedLinks = []; capturedLinkPairs = []; capturedContentComplete = false; }
    updateDestination();
    updateAnalyzeState();
  });
}
