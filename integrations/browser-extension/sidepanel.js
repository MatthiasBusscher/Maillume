const elements = Object.fromEntries(
  ["subject", "sender", "body", "endpoint", "apiKey", "save", "reset", "destination", "analyze", "status", "result", "score", "level", "classification", "explanation", "factors", "signals", "action"]
    .map((id) => [id, document.getElementById(id)]),
);
let activeTabId;
let committedEndpoint = "";
let committedApiKey = "";

const dynamicCopy = {
  en: {
    noTab: "No active browser tab is available. Select the email text and click the Maillume toolbar action again.",
    capturing: "Capturing the selection from this tab...",
    captured: "Selection captured. Review it before analysis.",
    captureErrors: {
      no_active_tab: "No active browser tab is available.",
      no_selection: "No selected text was found. Select visible email text and click the Maillume toolbar action again.",
      restricted_page: "Chrome does not allow extensions to read selections on this page. Open the message in a regular webmail tab.",
      capture_failed: "Chrome could not read the selection from this tab. Reload the message and try the toolbar action again.",
      handoff_missing: "The one-time selection is no longer available. Select the text and click the Maillume toolbar action again.",
      handoff_expired: "The one-time selection expired. Select the text and click the Maillume toolbar action again.",
      panel_unavailable: "Chrome could not open the side panel for this tab. Close other side panels and try again.",
    },
    invalidEndpoint: "Enter an HTTPS deployment URL, or an HTTP localhost URL for local testing.",
    invalidApiKey: "Enter a valid Maillume API key.",
    permissionDenied: "Chrome did not grant access to that deployment.",
    permissionError: "Chrome could not update the deployment permission.",
    permissionCleanupFailed: "The previous deployment permission could not be removed. The connection was not changed.",
    saveFailed: "The connection settings could not be saved.",
    saved: "Deployment saved on this device. API key kept for this browser session.",
    removed: "Connection, session key, and deployment permission removed.",
    removeStorageFailed: "Chrome could not clear all connection settings. Try removing the connection again.",
    removePermissionFailed: "The connection and session key were cleared, but Chrome could not remove the deployment permission.",
    bodyRequired: "Capture or enter selected email text first.",
    connectionRequired: "Save a deployment and API key for this browser session first.",
    sending: (origin) => `Sending the reviewed text to ${origin}...`,
    invalidResult: "The deployment returned an invalid analysis response.",
    authenticationFailed: "The deployment rejected the API key.",
    quotaExceeded: "The API key quota has been reached. Check the account before trying again.",
    requestFailed: (status) => `The deployment returned HTTP ${status}.`,
    unreachable: "The deployment could not be reached. Check the URL and connection permission.",
    complete: "Assessment complete. Message content and results were not saved by the extension.",
    destination: (endpoint) => `Destination: ${endpoint}`,
    destinationNeedsKey: (endpoint) => `Destination: ${endpoint}. Enter and save an API key for this browser session.`,
    unsavedDestination: (endpoint) => `Unsaved destination: ${endpoint}`,
    unsavedKey: (endpoint) => `Destination: ${endpoint}. The edited API key has not been saved for this session.`,
    configureDestination: "Destination: configure a Maillume deployment",
    initializationFailed: "The side panel could not initialize. Close it and use the toolbar action again.",
    levels: { low: "Low", medium: "Medium", high: "High" },
    classifications: { likely_phishing: "Likely phishing", likely_spam: "Likely spam", likely_legitimate: "Likely legitimate", uncertain: "Uncertain" },
    points: "points",
  },
  nl: {
    noTab: "Er is geen actief browsertabblad beschikbaar. Selecteer de e-mailtekst en klik opnieuw op de Maillume-knop in de werkbalk.",
    capturing: "De selectie uit dit tabblad wordt vastgelegd...",
    captured: "Selectie vastgelegd. Controleer de tekst voor de analyse.",
    captureErrors: {
      no_active_tab: "Er is geen actief browsertabblad beschikbaar.",
      no_selection: "Er is geen geselecteerde tekst gevonden. Selecteer zichtbare e-mailtekst en klik opnieuw op de Maillume-knop in de werkbalk.",
      restricted_page: "Chrome staat extensies niet toe selecties op deze pagina te lezen. Open het bericht in een normaal webmailtabblad.",
      capture_failed: "Chrome kon de selectie uit dit tabblad niet lezen. Laad het bericht opnieuw en probeer de werkbalkknop nogmaals.",
      handoff_missing: "De eenmalige selectie is niet meer beschikbaar. Selecteer de tekst en klik opnieuw op de Maillume-knop in de werkbalk.",
      handoff_expired: "De eenmalige selectie is verlopen. Selecteer de tekst en klik opnieuw op de Maillume-knop in de werkbalk.",
      panel_unavailable: "Chrome kon het zijpaneel voor dit tabblad niet openen. Sluit andere zijpanelen en probeer het opnieuw.",
    },
    invalidEndpoint: "Voer een HTTPS-implementatie-URL in, of een HTTP-localhost-URL voor lokale tests.",
    invalidApiKey: "Voer een geldige Maillume API-sleutel in.",
    permissionDenied: "Chrome heeft geen toegang tot die implementatie verleend.",
    permissionError: "Chrome kon de implementatiemachtiging niet bijwerken.",
    permissionCleanupFailed: "De vorige implementatiemachtiging kon niet worden verwijderd. De verbinding is niet gewijzigd.",
    saveFailed: "De verbindingsinstellingen konden niet worden opgeslagen.",
    saved: "Implementatie opgeslagen op dit apparaat. API-sleutel bewaard voor deze browsersessie.",
    removed: "Verbinding, sessiesleutel en implementatiemachtiging verwijderd.",
    removeStorageFailed: "Chrome kon niet alle verbindingsinstellingen wissen. Probeer de verbinding opnieuw te verwijderen.",
    removePermissionFailed: "De verbinding en sessiesleutel zijn gewist, maar Chrome kon de implementatiemachtiging niet verwijderen.",
    bodyRequired: "Leg eerst geselecteerde e-mailtekst vast of voer die in.",
    connectionRequired: "Sla eerst een implementatie en API-sleutel voor deze browsersessie op.",
    sending: (origin) => `De gecontroleerde tekst wordt naar ${origin} verzonden...`,
    invalidResult: "De implementatie gaf een ongeldig analyseresultaat terug.",
    authenticationFailed: "De implementatie heeft de API-sleutel geweigerd.",
    quotaExceeded: "Het quotum van de API-sleutel is bereikt. Controleer het account voordat u het opnieuw probeert.",
    requestFailed: (status) => `De implementatie gaf HTTP ${status} terug.`,
    unreachable: "De implementatie is niet bereikbaar. Controleer de URL en verbindingsmachtiging.",
    complete: "Beoordeling voltooid. De extensie heeft berichtinhoud en resultaten niet opgeslagen.",
    destination: (endpoint) => `Bestemming: ${endpoint}`,
    destinationNeedsKey: (endpoint) => `Bestemming: ${endpoint}. Voer een API-sleutel in en sla die op voor deze browsersessie.`,
    unsavedDestination: (endpoint) => `Niet-opgeslagen bestemming: ${endpoint}`,
    unsavedKey: (endpoint) => `Bestemming: ${endpoint}. De gewijzigde API-sleutel is nog niet opgeslagen voor deze sessie.`,
    configureDestination: "Bestemming: configureer een Maillume-implementatie",
    initializationFailed: "Het zijpaneel kon niet worden gestart. Sluit het en gebruik de werkbalkknop opnieuw.",
    levels: { low: "Laag", medium: "Gemiddeld", high: "Hoog" },
    classifications: { likely_phishing: "Waarschijnlijk phishing", likely_spam: "Waarschijnlijk spam", likely_legitimate: "Waarschijnlijk legitiem", uncertain: "Onzeker" },
    points: "punten",
  },
};

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "capture-started" || message?.type === "capture-ready") {
    void handleCaptureNotification(message);
  }
});

initialize().catch(() => setStatus(getDynamicCopy().initializationFailed, true));

async function initialize() {
  localizeUi();
  const [localSettings, sessionSettings] = await Promise.all([
    chrome.storage.local.get(["endpoint"]),
    chrome.storage.session.get(["apiKey"]),
  ]);
  if (localSettings.endpoint) elements.endpoint.value = localSettings.endpoint;
  if (sessionSettings.apiKey) elements.apiKey.value = sessionSettings.apiKey;
  committedEndpoint = localSettings.endpoint || "";
  committedApiKey = sessionSettings.apiKey || "";
  updateDestination();
  updateAnalyzeState();

  activeTabId = await getActiveTabId();
  if (!Number.isInteger(activeTabId)) return setStatus(getDynamicCopy().noTab, true);
  await consumeCapture(activeTabId);
}

function localizeUi() {
  const locale = getLocale();
  document.documentElement.lang = locale;
  if (locale === "nl") document.querySelectorAll("[data-nl]").forEach((node) => { node.textContent = node.dataset.nl; });
}

async function handleCaptureNotification(message) {
  if (!Number.isInteger(activeTabId)) activeTabId = await getActiveTabId();
  if (!Number.isInteger(activeTabId) || activeTabId !== message.tabId) return;

  if (message.type === "capture-started") {
    clearMessageData();
    setStatus(getDynamicCopy().capturing);
    return;
  }
  await consumeCapture(activeTabId);
}

async function consumeCapture(tabId) {
  let capture;
  try {
    capture = await chrome.runtime.sendMessage({ type: "consume-capture", tabId });
  } catch {
    capture = { status: "error", code: "handoff_missing" };
  }

  const copy = getDynamicCopy();
  if (capture?.status === "pending") return setStatus(copy.capturing);
  clearMessageData();
  if (capture?.status === "success" && typeof capture.text === "string" && capture.text.trim()) {
    elements.body.value = capture.text.slice(0, 20_000);
    updateAnalyzeState();
    setStatus(copy.captured);
    return;
  }
  const code = capture?.code || "handoff_missing";
  setStatus(copy.captureErrors[code] || copy.captureErrors.capture_failed, true);
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

elements.save.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  if (!endpoint) return setStatus(copy.invalidEndpoint, true);
  const apiKey = elements.apiKey.value.trim();
  if (!/^mlm_[A-Za-z0-9_-]{43}$/.test(apiKey)) return setStatus(copy.invalidApiKey, true);

  const originPattern = permissionPattern(endpoint);
  let granted;
  try {
    granted = await chrome.permissions.request({ origins: [originPattern] });
  } catch {
    return setStatus(copy.permissionError, true);
  }
  if (!granted) return setStatus(copy.permissionDenied, true);

  const previousPattern = committedEndpoint ? permissionPattern(committedEndpoint) : null;
  try {
    await Promise.all([
      chrome.storage.local.set({ endpoint }),
      chrome.storage.session.set({ apiKey }),
    ]);
  } catch {
    await restoreCommittedSettings();
    if (originPattern !== previousPattern) await removePermission(originPattern);
    return setStatus(copy.saveFailed, true);
  }

  if (previousPattern && previousPattern !== originPattern) {
    let removed = false;
    try {
      removed = await chrome.permissions.remove({ origins: [previousPattern] });
    } catch {
      removed = false;
    }
    if (!removed) {
      await restoreCommittedSettings();
      await removePermission(originPattern);
      return setStatus(copy.permissionCleanupFailed, true);
    }
  }

  committedEndpoint = endpoint;
  committedApiKey = apiKey;
  elements.endpoint.value = endpoint;
  updateDestination();
  updateAnalyzeState();
  setStatus(copy.saved);
});

elements.reset.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  const originPattern = committedEndpoint ? permissionPattern(committedEndpoint) : null;
  const storageResults = await Promise.allSettled([
    chrome.storage.local.remove(["endpoint"]),
    chrome.storage.session.remove(["apiKey"]),
  ]);
  if (storageResults.some(({ status }) => status === "rejected")) {
    const [localSettings, sessionSettings] = await Promise.all([
      chrome.storage.local.get(["endpoint"]).catch(() => ({})),
      chrome.storage.session.get(["apiKey"]).catch(() => ({})),
    ]);
    committedEndpoint = localSettings.endpoint || "";
    committedApiKey = sessionSettings.apiKey || "";
    elements.endpoint.value = committedEndpoint || "https://app.maillume.io";
    elements.apiKey.value = committedApiKey;
    clearMessageData();
    updateDestination();
    return setStatus(copy.removeStorageFailed, true);
  }

  let permissionRemoved = true;
  if (originPattern) {
    try {
      permissionRemoved = await chrome.permissions.remove({ origins: [originPattern] });
    } catch {
      permissionRemoved = false;
    }
  }
  committedEndpoint = "";
  committedApiKey = "";
  elements.endpoint.value = "https://app.maillume.io";
  elements.apiKey.value = "";
  clearMessageData();
  updateDestination();
  updateAnalyzeState();
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
      response = await fetch(`${endpoint}/api/v1/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ source: "paste", subject: elements.subject.value.trim(), senderEmail: elements.sender.value.trim(), body, locale: getLocale() }),
      });
    } catch {
      throw new Error(copy.unreachable);
    }

    if (response.status === 401 || response.status === 403) throw new Error(copy.authenticationFailed);
    if (response.status === 429) throw new Error(copy.quotaExceeded);
    if (!response.ok) throw new Error(copy.requestFailed(response.status));

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error(copy.invalidResult);
    }
    if (!isAnalysisResult(payload?.result)) throw new Error(copy.invalidResult);
    renderResult(payload.result);
    setStatus(copy.complete);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : copy.invalidResult, true);
  } finally {
    updateAnalyzeState();
  }
});

for (const id of ["body", "endpoint", "apiKey"]) {
  elements[id].addEventListener("input", () => { updateDestination(); updateAnalyzeState(); });
}

function normalizeEndpoint(value) {
  try {
    const url = new URL(value.trim());
    const localHttp = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (url.protocol !== "https:" && !localHttp) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function updateDestination() {
  const copy = getDynamicCopy();
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  if (!endpoint) {
    elements.destination.textContent = copy.configureDestination;
    return;
  }
  if (endpoint !== committedEndpoint) {
    elements.destination.textContent = copy.unsavedDestination(endpoint);
    return;
  }
  if (!committedApiKey) {
    elements.destination.textContent = copy.destinationNeedsKey(endpoint);
    return;
  }
  if (elements.apiKey.value.trim() !== committedApiKey) {
    elements.destination.textContent = copy.unsavedKey(endpoint);
    return;
  }
  elements.destination.textContent = copy.destination(endpoint);
}

function updateAnalyzeState() {
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  elements.analyze.disabled = !(
    elements.body.value.trim()
    && committedApiKey
    && endpoint
    && endpoint === committedEndpoint
    && elements.apiKey.value.trim() === committedApiKey
  );
}

function permissionPattern(endpoint) {
  const url = new URL(endpoint);
  return `${url.protocol}//${url.hostname}/*`;
}

async function restoreCommittedSettings() {
  const endpointOperation = committedEndpoint
    ? chrome.storage.local.set({ endpoint: committedEndpoint })
    : chrome.storage.local.remove(["endpoint"]);
  const keyOperation = committedApiKey
    ? chrome.storage.session.set({ apiKey: committedApiKey })
    : chrome.storage.session.remove(["apiKey"]);
  await Promise.allSettled([endpointOperation, keyOperation]);
}

async function removePermission(originPattern) {
  try {
    await chrome.permissions.remove({ origins: [originPattern] });
  } catch {
    // The connection remains uncommitted even if Chrome rejects permission cleanup.
  }
}

function getLocale() {
  return chrome.i18n.getUILanguage().toLowerCase().startsWith("nl") ? "nl" : "en";
}

function getDynamicCopy() {
  return dynamicCopy[getLocale()];
}

function isAnalysisResult(result) {
  const classifications = ["likely_phishing", "likely_spam", "likely_legitimate", "uncertain"];
  const families = ["identity", "destination", "intent", "delivery", "style"];
  const factorsAreValid = Array.isArray(result?.score_factors)
    && result.score_factors.every((factor) => factor
      && typeof factor.id === "string"
      && families.includes(factor.family)
      && Number.isFinite(factor.contribution)
      && factor.contribution > 0
      && typeof factor.label === "string");
  return Boolean(
    result
    && typeof result === "object"
    && Number.isFinite(result.risk_score)
    && result.risk_score >= 0
    && result.risk_score <= 100
    && ["low", "medium", "high"].includes(result.risk_level)
    && classifications.includes(result.classification)
    && factorsAreValid
    && result.score_factors.reduce((total, factor) => total + factor.contribution, 0) === result.risk_score
    && isStringArray(result.suspicious_signals)
    && Array.isArray(result.detected_links)
    && result.detected_links.every(isHttpUrl)
    && typeof result.short_explanation === "string"
    && typeof result.recommended_action === "string"
  );
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.style.color = isError ? "#8f251b" : "#4f5b50";
}

function clearMessageData() {
  elements.subject.value = "";
  elements.sender.value = "";
  elements.body.value = "";
  clearResult();
  updateAnalyzeState();
}

function clearResult() {
  elements.score.textContent = "";
  elements.level.textContent = "";
  elements.classification.textContent = "";
  elements.explanation.textContent = "";
  elements.factors.replaceChildren();
  elements.action.textContent = "";
  elements.signals.replaceChildren();
  elements.result.hidden = true;
}

function renderResult(result) {
  const copy = getDynamicCopy();
  elements.score.textContent = String(result.risk_score);
  elements.level.textContent = copy.levels[result.risk_level];
  elements.classification.textContent = copy.classifications[result.classification];
  elements.explanation.textContent = result.short_explanation;
  elements.action.textContent = result.recommended_action;
  elements.factors.replaceChildren(...result.score_factors.map((factor) => {
    const item = document.createElement("li");
    item.textContent = `${factor.label}: +${factor.contribution} ${copy.points}`;
    return item;
  }));
  elements.signals.replaceChildren(...result.suspicious_signals.map((signal) => {
    const item = document.createElement("li");
    item.textContent = signal;
    return item;
  }));
  elements.result.hidden = false;
}
