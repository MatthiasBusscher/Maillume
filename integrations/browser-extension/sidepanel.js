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
// The result contract is additive: newer pipelines add evidence IDs inside the same
// score_factors shape. Accepting a range keeps installed panels working while a server
// deploy and a Chrome Web Store review land at different times.
const SUPPORTED_ANALYSIS_VERSIONS = ["analysis-v6", "analysis-v7", "analysis-v8", "analysis-v9", "analysis-v10"];
const EXTENSION_VERSION = chrome.runtime.getManifest().version;
const BROWSER_CONNECTION_LIFETIME_DAYS = 365;
const BROWSER_CONNECTION_INACTIVITY_DAYS = 90;
const EXTENSION_HEADERS = {
  "X-Maillume-Analysis-Versions": SUPPORTED_ANALYSIS_VERSIONS.join(","),
  "X-Maillume-Extension-Id": chrome.runtime.id,
  "X-Maillume-Extension-Version": EXTENSION_VERSION,
};

const dynamicCopy = {
  en: {
    noTab: "No active browser tab is available. Open an email and click the Maillume toolbar action again.",
    capturing: "Capturing selected text or the open message...",
    captured: "Selected text captured. Review it before analysis.",
    openMessageCaptured: "Open message captured. Review the subject, sender, and text before analysis.",
    messageChanged: "The webmail page changed. Use the current message before analyzing.",
    captureErrors: {
      no_active_tab: "No active browser tab is available.",
      no_selection: "No selection or open Gmail/Outlook message was found. Open a message, optionally select text, and click the Maillume toolbar action again.",
      multiple_messages: "More than one message is expanded. Select the text you want to check, then click the Maillume toolbar action again.",
      restricted_page: "Chrome does not allow extensions to read selections on this page. Open the message in a regular webmail tab.",
      capture_failed: "Chrome could not read the selection from this tab. Reload the message and try the toolbar action again.",
      handoff_missing: "The one-time capture is no longer available. Open the message and click the Maillume toolbar action again.",
      handoff_expired: "The one-time capture expired. Open the message and click the Maillume toolbar action again.",
      panel_unavailable: "Chrome could not open the side panel for this tab. Close other side panels and try again.",
    },
    invalidEndpoint: "Enter an HTTPS deployment URL, or an HTTP localhost URL for local testing.",
    invalidApiKey: "Enter a valid Maillume API key.",
    permissionDenied: "Chrome did not grant access to that deployment.",
    permissionError: "Chrome could not update the deployment permission.",
    permissionCleanupFailed: "The previous deployment permission could not be removed. The connection was not changed.",
    saveFailed: "The connection settings could not be saved.",
    connecting: "Waiting for approval in the Maillume account page...",
    connected: "This browser is connected and ready to analyze messages.",
    connectionStateConnected: "Connected through your Maillume account.",
    connectionStateDisconnected: "This browser is not connected.",
    connectButton: "Connect this browser",
    reconnectButton: "Reconnect this browser",
    pairingDenied: "The browser connection was denied. No browser credential was created.",
    pairingExpired: "The browser connection request expired. Start again to create a new request.",
    pairingFailed: "The browser connection could not be completed. Advanced manual setup is still available.",
    pairingUnsupported: "This deployment does not support secure browser connection. Open Advanced manual setup to use a key.",
    updateRequired: "This Maillume extension must be updated before it can connect to this deployment.",
    savedPersistent: "Deployment and API key saved in this Chrome profile for restarts and updates.",
    savedSession: "Deployment saved. API key kept only for this browser session.",
    removed: "Browser connection, local credential, and deployment permission removed.",
    removeStorageFailed: "Chrome could not clear all connection settings. Try removing the connection again.",
    removePermissionFailed: "The connection and API key were cleared, but Chrome could not remove the deployment permission.",
    bodyRequired: "Capture or enter the email text first.",
    connectionRequired: "Connect this browser first, or use Advanced manual setup.",
    sending: (origin) => `Sending the reviewed text to ${origin}...`,
    invalidResult: "The deployment returned an invalid analysis response.",
    incompatibleResult: "The extension and deployment use different analysis versions. Update the extension from the official source, then reload it in chrome://extensions.",
    authenticationFailed: "The deployment rejected the API key.",
    browserAuthenticationFailed: "The deployment rejected this browser connection. Reconnect this browser.",
    quotaExceeded: "This request was limited. Check account usage or wait before trying again.",
    requestFailed: (status) => `The deployment returned HTTP ${status}.`,
    unreachable: "The deployment could not be reached. Check the URL and connection permission.",
    complete: "Assessment complete. Message content and results were not saved by the extension.",
    destination: (endpoint) => `Destination: ${endpoint}`,
    destinationExpiring: (endpoint, days) => `Destination: ${endpoint}. The API key expires in ${days} day${days === 1 ? "" : "s"}.`,
    destinationExpired: (endpoint) => `Destination: ${endpoint}. The API key has expired; reconnect this browser.`,
    browserDestinationExpiring: (endpoint, days) => `Destination: ${endpoint}. This browser connection expires in ${days} day${days === 1 ? "" : "s"} unless it is used.`,
    browserDestinationExpired: (endpoint) => `Destination: ${endpoint}. This browser connection has expired; reconnect this browser.`,
    destinationNeedsKey: (endpoint) => `Destination: ${endpoint}. Enter and save an API key.`,
    unsavedDestination: (endpoint) => `Unsaved destination: ${endpoint}`,
    unsavedKey: (endpoint) => `Destination: ${endpoint}. The edited API key has not been saved for this session.`,
    configureDestination: "Destination: configure a Maillume deployment",
    initializationFailed: "The side panel could not initialize. Close it and use the toolbar action again.",
    levels: { low: "Low", medium: "Medium", high: "High" },
    classifications: { likely_phishing: "Likely phishing or fraud", likely_spam: "Likely spam", likely_legitimate: "Likely legitimate", uncertain: "Uncertain" },
    coverageComplete: "Maillume received the main message evidence needed for this assessment.",
    coverageLimited: "Some message evidence was unavailable. Missing details can change the assessment.",
    coveragePartial: "This assessment uses selected or incomplete text. Content outside the captured text can change the result.",
    coverageOcr: "This assessment uses OCR-extracted text. Missed text and hidden link destinations can change the result.",
    coverageLabels: {
      subject: "Subject",
      sender: "Sender",
      fullContent: "Full content",
      linkDestinations: "Link destinations",
      authentication: "Authentication results",
      attachments: "Attachment evidence",
      extraction: "Text extraction",
    },
    coverageStates: { available: "Available", unavailable: "Unavailable" },
    extractionTypes: { direct: "Direct text", ocr: "OCR", parsed: "Parsed .eml" },
    points: "points",
    hideInstructions: "Hide instructions",
    showInstructions: "Show instructions",
    showApiKey: "Show API key",
    hideApiKey: "Hide API key",
  },
  nl: {
    noTab: "Er is geen actief browsertabblad beschikbaar. Open een e-mail en klik opnieuw op de Maillume-knop in de werkbalk.",
    capturing: "Geselecteerde tekst of het geopende bericht wordt vastgelegd...",
    captured: "Geselecteerde tekst vastgelegd. Controleer deze voor de analyse.",
    openMessageCaptured: "Geopend bericht vastgelegd. Controleer onderwerp, afzender en tekst voor de analyse.",
    messageChanged: "De webmailpagina is gewijzigd. Gebruik het huidige bericht voordat je analyseert.",
    captureErrors: {
      no_active_tab: "Er is geen actief browsertabblad beschikbaar.",
      no_selection: "Er is geen geselecteerde tekst gevonden en er kon geen geopend Gmail-/Outlook-bericht worden vastgelegd. Open een bericht, selecteer eventueel tekst en klik opnieuw op de Maillume-knop in de werkbalk.",
      multiple_messages: "Er zijn meerdere berichten uitgeklapt. Selecteer de tekst die je wilt controleren en klik opnieuw op de Maillume-knop in de werkbalk.",
      restricted_page: "Chrome staat extensies niet toe selecties op deze pagina te lezen. Open het bericht in een normaal webmailtabblad.",
      capture_failed: "Chrome kon de selectie uit dit tabblad niet lezen. Laad het bericht opnieuw en probeer de werkbalkknop nogmaals.",
      handoff_missing: "De eenmalige vastlegging is niet meer beschikbaar. Open het bericht en klik opnieuw op de Maillume-knop in de werkbalk.",
      handoff_expired: "De eenmalige vastlegging is verlopen. Open het bericht en klik opnieuw op de Maillume-knop in de werkbalk.",
      panel_unavailable: "Chrome kon het zijpaneel voor dit tabblad niet openen. Sluit andere zijpanelen en probeer het opnieuw.",
    },
    invalidEndpoint: "Voer de HTTPS-URL van een Maillume-omgeving in, of een HTTP-localhost-URL voor lokale tests.",
    invalidApiKey: "Voer een geldige Maillume API-sleutel in.",
    permissionDenied: "Chrome heeft geen toegang tot die omgeving verleend.",
    permissionError: "Chrome kon de toestemming voor deze omgeving niet bijwerken.",
    permissionCleanupFailed: "De vorige toestemming voor deze omgeving kon niet worden verwijderd. De verbinding is niet gewijzigd.",
    saveFailed: "De verbindingsinstellingen konden niet worden opgeslagen.",
    connecting: "Wachten op goedkeuring op de Maillume-accountpagina...",
    connected: "Deze browser is verbonden en klaar om berichten te analyseren.",
    connectionStateConnected: "Verbonden via je Maillume-account.",
    connectionStateDisconnected: "Deze browser is niet verbonden.",
    connectButton: "Deze browser verbinden",
    reconnectButton: "Deze browser opnieuw verbinden",
    pairingDenied: "De browserverbinding is geweigerd. Er is geen browserreferentie gemaakt.",
    pairingExpired: "Het verbindingsverzoek is verlopen. Start opnieuw om een nieuw verzoek te maken.",
    pairingFailed: "De browserverbinding kon niet worden voltooid. Geavanceerde handmatige configuratie blijft beschikbaar.",
    pairingUnsupported: "Deze omgeving ondersteunt veilig verbinden met de browser niet. Open Geavanceerde handmatige configuratie om een sleutel te gebruiken.",
    updateRequired: "Deze Maillume-extensie moet worden bijgewerkt voordat ze met deze omgeving kan verbinden.",
    savedPersistent: "Omgeving en API-sleutel opgeslagen in dit Chrome-profiel voor herstarts en updates.",
    savedSession: "Omgeving opgeslagen. API-sleutel alleen voor deze browsersessie bewaard.",
    removed: "Browserverbinding, lokale sleutel en toestemming voor deze omgeving verwijderd.",
    removeStorageFailed: "Chrome kon niet alle verbindingsinstellingen wissen. Probeer de verbinding opnieuw te verwijderen.",
    removePermissionFailed: "De verbinding en API-sleutel zijn gewist, maar Chrome kon de toestemming voor deze omgeving niet verwijderen.",
    bodyRequired: "Leg eerst de e-mailtekst vast of voer die in.",
    connectionRequired: "Verbind eerst deze browser of gebruik Geavanceerde handmatige configuratie.",
    sending: (origin) => `De gecontroleerde tekst wordt naar ${origin} verzonden...`,
    invalidResult: "De Maillume-omgeving gaf een ongeldig analyseresultaat terug.",
    incompatibleResult: "De extensie en Maillume-omgeving gebruiken verschillende analyseversies. Werk de extensie bij vanuit de officiële broncode en laad haar daarna opnieuw via chrome://extensions.",
    authenticationFailed: "De Maillume-omgeving heeft de API-sleutel geweigerd.",
    browserAuthenticationFailed: "De Maillume-omgeving heeft deze browserverbinding geweigerd. Verbind deze browser opnieuw.",
    quotaExceeded: "Deze aanvraag is beperkt. Controleer het accountgebruik of wacht voordat je het opnieuw probeert.",
    requestFailed: (status) => `De Maillume-omgeving gaf HTTP ${status} terug.`,
    unreachable: "De Maillume-omgeving is niet bereikbaar. Controleer de URL en toestemming.",
    complete: "Beoordeling voltooid. De extensie heeft berichtinhoud en resultaten niet opgeslagen.",
    destination: (endpoint) => `Bestemming: ${endpoint}`,
    destinationExpiring: (endpoint, days) => `Bestemming: ${endpoint}. De API-sleutel verloopt over ${days} ${days === 1 ? "dag" : "dagen"}.`,
    destinationExpired: (endpoint) => `Bestemming: ${endpoint}. De API-sleutel is verlopen; verbind deze browser opnieuw.`,
    browserDestinationExpiring: (endpoint, days) => `Bestemming: ${endpoint}. Deze browserverbinding verloopt over ${days} ${days === 1 ? "dag" : "dagen"} als ze niet wordt gebruikt.`,
    browserDestinationExpired: (endpoint) => `Bestemming: ${endpoint}. Deze browserverbinding is verlopen; verbind deze browser opnieuw.`,
    destinationNeedsKey: (endpoint) => `Bestemming: ${endpoint}. Voer een API-sleutel in en sla die op.`,
    unsavedDestination: (endpoint) => `Niet-opgeslagen bestemming: ${endpoint}`,
    unsavedKey: (endpoint) => `Bestemming: ${endpoint}. De gewijzigde API-sleutel is nog niet opgeslagen voor deze sessie.`,
    configureDestination: "Bestemming: configureer een Maillume-omgeving",
    initializationFailed: "Het zijpaneel kon niet worden gestart. Sluit het en gebruik de werkbalkknop opnieuw.",
    levels: { low: "Laag", medium: "Middel", high: "Hoog" },
    classifications: { likely_phishing: "Waarschijnlijk phishing of fraude", likely_spam: "Waarschijnlijk spam", likely_legitimate: "Waarschijnlijk legitiem", uncertain: "Onzeker" },
    coverageComplete: "Maillume ontving de belangrijkste berichtgegevens voor deze beoordeling.",
    coverageLimited: "Sommige berichtgegevens waren niet beschikbaar. Ontbrekende details kunnen de beoordeling veranderen.",
    coveragePartial: "Deze beoordeling gebruikt geselecteerde of onvolledige tekst. Inhoud buiten de vastgelegde tekst kan het resultaat veranderen.",
    coverageOcr: "Deze beoordeling gebruikt tekst uit OCR. Gemiste tekst en verborgen linkbestemmingen kunnen het resultaat veranderen.",
    coverageLabels: {
      subject: "Onderwerp",
      sender: "Afzender",
      fullContent: "Volledige inhoud",
      linkDestinations: "Linkbestemmingen",
      authentication: "Authenticatieresultaten",
      attachments: "Bijlagegegevens",
      extraction: "Tekstextractie",
    },
    coverageStates: { available: "Beschikbaar", unavailable: "Niet beschikbaar" },
    extractionTypes: { direct: "Directe tekst", ocr: "OCR", parsed: "Verwerkt .eml-bestand" },
    points: "punten",
    hideInstructions: "Uitleg verbergen",
    showInstructions: "Uitleg tonen",
    showApiKey: "API-sleutel tonen",
    hideApiKey: "API-sleutel verbergen",
  },
};

chrome.runtime.onMessage.addListener((message) => {
  if (["capture-started", "capture-ready", "capture-cleared"].includes(message?.type)) {
    queueCaptureOperation(() => handleCaptureNotification(message));
  }
});

initialize().catch(() => setStatus(getDynamicCopy().initializationFailed, true));

async function initialize() {
  localizeUi();
  const [localSettings, sessionSettings] = await Promise.all([
    chrome.storage.local.get([
      "endpoint",
      "apiKey",
      "apiKeyExpiresAt",
      "apiKeyHardExpiresAt",
      "connectionKind",
      "browserConnectionId",
    ]),
    chrome.storage.session.get([
      "apiKey",
      "apiKeyExpiresAt",
      "apiKeyHardExpiresAt",
      "connectionKind",
      "extensionPairing",
    ]),
  ]);
  if (!isBrowserConnectionId(localSettings.browserConnectionId)) {
    await chrome.storage.local.set({ browserConnectionId: createBrowserConnectionId() });
  }
  if (localSettings.endpoint) elements.endpoint.value = localSettings.endpoint;
  const storedApiKey = localSettings.apiKey || sessionSettings.apiKey || "";
  if (storedApiKey) elements.apiKey.value = storedApiKey;
  committedEndpoint = localSettings.endpoint || "";
  committedApiKey = storedApiKey;
  committedRememberApiKey = Boolean(localSettings.apiKey);
  committedApiKeyExpiresAt = localSettings.apiKeyExpiresAt || sessionSettings.apiKeyExpiresAt || "";
  committedApiKeyHardExpiresAt = localSettings.apiKeyHardExpiresAt
    || sessionSettings.apiKeyHardExpiresAt
    || committedApiKeyExpiresAt;
  committedConnectionKind = localSettings.connectionKind
    || sessionSettings.connectionKind
    || (storedApiKey ? "manual" : "");
  elements.rememberApiKey.checked = committedRememberApiKey || !sessionSettings.apiKey;
  updateConnectionState();
  updateDestination();
  updateAnalyzeState();
  if (isStoredPairing(sessionSettings.extensionPairing)) {
    void resumePairing(sessionSettings.extensionPairing);
  }

  activeTabId = await getActiveTabId();
  if (!Number.isInteger(activeTabId)) return setStatus(getDynamicCopy().noTab, true);
  await queueCaptureOperation(() => consumeCapture(activeTabId));
}

function localizeUi() {
  const locale = getLocale();
  document.documentElement.lang = locale;
  if (locale === "nl") {
    document.querySelectorAll("[data-nl]").forEach((node) => { node.textContent = node.dataset.nl; });
    document.querySelectorAll("[data-nl-aria-label]").forEach((node) => { node.setAttribute("aria-label", node.dataset.nlAriaLabel); });
  }
}

async function handleCaptureNotification(message) {
  if (!Number.isInteger(activeTabId)) activeTabId = await getActiveTabId();
  if (!Number.isInteger(activeTabId) || activeTabId !== message.tabId) return;

  if (message.type === "capture-cleared") {
    latestCaptureId = "";
    lastAppliedCaptureId = "";
    cancelCaptureRetry();
    clearMessageData();
    setCapturePending(false);
    setStatus(getDynamicCopy().messageChanged);
    return;
  }

  if (message.type === "capture-started") {
    if (typeof message.captureId === "string") {
      latestCaptureId = message.captureId;
    }
    cancelCaptureRetry();
    captureRetryCount = 0;
    clearMessageData();
    setCapturePending(true);
    setStatus(getDynamicCopy().capturing);
    return;
  }
  if (typeof message.captureId === "string") {
    if (latestCaptureId && message.captureId !== latestCaptureId) return;
    latestCaptureId = message.captureId;
  }
  const completed = await consumeCapture(activeTabId);
  if (completed) setCapturePending(false);
}

async function consumeCapture(tabId) {
  let capture;
  try {
    capture = await chrome.runtime.sendMessage({ type: "consume-capture", tabId, includeMetadata: true });
  } catch {
    capture = { status: "error", code: "handoff_missing" };
  }

  const copy = getDynamicCopy();
  if (typeof capture?.captureId === "string") latestCaptureId = capture.captureId;
  if (capture?.status === "pending") {
    setStatus(copy.capturing);
    scheduleCaptureRetry(tabId);
    return false;
  }
  cancelCaptureRetry();
  if (capture?.status === "success" && typeof capture.text === "string" && capture.text.trim()) {
    clearMessageData();
    elements.body.value = capture.text.slice(0, 20_000);
    if (typeof capture.subject === "string") elements.subject.value = capture.subject.slice(0, 300);
    if (typeof capture.sender === "string") elements.sender.value = capture.sender.slice(0, 320);
    capturedLinks = Array.isArray(capture.links) ? capture.links : [];
    capturedLinkPairs = Array.isArray(capture.linkPairs) ? capture.linkPairs : [];
    capturedContentComplete = capture.source === "open_message";
    lastAppliedCaptureId = capture.captureId || latestCaptureId;
    updateAnalyzeState();
    setStatus(capture.source === "open_message" ? copy.openMessageCaptured : copy.captured);
    return true;
  }
  const code = capture?.code || "handoff_missing";
  if (code === "handoff_missing" && elements.body.value.trim() && lastAppliedCaptureId && lastAppliedCaptureId === latestCaptureId) return true;
  clearMessageData();
  setStatus(copy.captureErrors[code] || copy.captureErrors.capture_failed, true);
  return true;
}

function queueCaptureOperation(operation) {
  captureQueue = captureQueue.then(operation, operation);
  return captureQueue;
}

function scheduleCaptureRetry(tabId) {
  cancelCaptureRetry();
  if (captureRetryCount >= 20) return;
  captureRetryCount += 1;
  captureRetryTimer = setTimeout(() => {
    captureRetryTimer = undefined;
    queueCaptureOperation(() => consumeCapture(tabId));
  }, 50);
}

function cancelCaptureRetry() {
  if (captureRetryTimer !== undefined) clearTimeout(captureRetryTimer);
  captureRetryTimer = undefined;
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

elements.connect.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  if (!endpoint) return setStatus(copy.invalidEndpoint, true);
  if (pairingPending) return;

  let granted;
  try {
    granted = await chrome.permissions.request({ origins: [permissionPattern(endpoint)] });
  } catch {
    return setStatus(copy.permissionError, true);
  }
  if (!granted) return setStatus(copy.permissionDenied, true);

  pairingPending = true;
  elements.connect.disabled = true;
  setStatus(copy.connecting);
  try {
    const capabilities = await fetch(`${endpoint}/api/v1/capabilities`, {
      headers: EXTENSION_HEADERS,
    });
    if (capabilities.status === 404) throw new PairingError("unsupported");
    if (!capabilities.ok) throw new PairingError("failed");
    const capabilityPayload = await capabilities.json();
    if (
      capabilityPayload?.extension?.pairing_available !== true
      || capabilityPayload.extension.id !== chrome.runtime.id
    ) {
      throw new PairingError("unsupported");
    }
    if (!isCompatibleCapabilityResponse(capabilityPayload)) {
      throw new PairingError("update");
    }
    const browserLifecycle = supportsBrowserConnectionLifecycle(capabilityPayload);
    const { browserConnectionId } = await chrome.storage.local.get(["browserConnectionId"]);
    if (!isBrowserConnectionId(browserConnectionId)) throw new PairingError("failed");

    const response = await fetch(`${endpoint}/api/v1/extension-pairing`, {
      method: "POST",
      headers: { ...EXTENSION_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify(browserLifecycle
        ? {
            browserConnectionId,
            lifetimeDays: BROWSER_CONNECTION_LIFETIME_DAYS,
            locale: getLocale(),
            name: getBrowserKeyName(),
          }
        : {
            lifetimeDays: 90,
            locale: getLocale(),
            name: getBrowserKeyName(),
          }),
    });
    if (response.status === 404) throw new PairingError("unsupported");
    if (response.status === 426) throw new PairingError("update");
    if (!response.ok) throw new PairingError("failed");
    const payload = await response.json();
    const pairing = normalizePairingResponse(payload, endpoint, browserLifecycle);
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
    setStatus(
      reason === "unsupported"
        ? copy.pairingUnsupported
        : reason === "update"
          ? copy.updateRequired
          : copy.pairingFailed,
      true,
    );
  }
});

elements.save.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  if (!endpoint) return setStatus(copy.invalidEndpoint, true);
  const apiKey = elements.apiKey.value.trim();
  const rememberApiKey = elements.rememberApiKey.checked === true;
  if (!/^mlm_[A-Za-z0-9_-]{43}$/.test(apiKey)) return setStatus(copy.invalidApiKey, true);

  const outcome = await commitConnection({
    apiKey,
    connectionKind: "manual",
    endpoint,
    expiresAt: "",
    hardExpiresAt: "",
    rememberApiKey,
  });
  if (outcome === "permission_error") return setStatus(copy.permissionError, true);
  if (outcome === "permission_denied") return setStatus(copy.permissionDenied, true);
  if (outcome === "cleanup_failed") return setStatus(copy.permissionCleanupFailed, true);
  if (outcome !== "saved") return setStatus(copy.saveFailed, true);
  setStatus(rememberApiKey ? copy.savedPersistent : copy.savedSession);
});

elements.apiKeyVisibility.addEventListener("click", () => {
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
    if (!response?.accepted) {
      setStatus(copy.captureErrors[response?.code] || copy.captureErrors.capture_failed, true);
    }
  } catch {
    setStatus(copy.captureErrors.capture_failed, true);
  } finally {
    setCapturePending(false);
  }
});

elements.captureHelpToggle.addEventListener("click", () => {
  const hidden = !elements.captureHelp.hidden;
  elements.captureHelp.hidden = hidden;
  elements.captureHelpToggle.setAttribute("aria-expanded", String(!hidden));
  elements.captureHelpToggle.textContent = hidden
    ? getDynamicCopy().showInstructions
    : getDynamicCopy().hideInstructions;
});

elements.reset.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  const originPattern = committedEndpoint ? permissionPattern(committedEndpoint) : null;
  const storageResults = await Promise.allSettled([
    chrome.storage.local.remove([
      "endpoint",
      "apiKey",
      "apiKeyExpiresAt",
      "apiKeyHardExpiresAt",
      "connectionKind",
    ]),
    chrome.storage.session.remove([
      "apiKey",
      "apiKeyExpiresAt",
      "apiKeyHardExpiresAt",
      "connectionKind",
      "extensionPairing",
    ]),
  ]);
  if (storageResults.some(({ status }) => status === "rejected")) {
    const [localSettings, sessionSettings] = await Promise.all([
      chrome.storage.local.get([
        "endpoint",
        "apiKey",
        "apiKeyExpiresAt",
        "apiKeyHardExpiresAt",
        "connectionKind",
      ]).catch(() => ({})),
      chrome.storage.session.get([
        "apiKey",
        "apiKeyExpiresAt",
        "apiKeyHardExpiresAt",
        "connectionKind",
      ]).catch(() => ({})),
    ]);
    committedEndpoint = localSettings.endpoint || "";
    committedApiKey = localSettings.apiKey || sessionSettings.apiKey || "";
    committedRememberApiKey = Boolean(localSettings.apiKey);
    committedApiKeyExpiresAt = localSettings.apiKeyExpiresAt || sessionSettings.apiKeyExpiresAt || "";
    committedApiKeyHardExpiresAt = localSettings.apiKeyHardExpiresAt
      || sessionSettings.apiKeyHardExpiresAt
      || committedApiKeyExpiresAt;
    committedConnectionKind = localSettings.connectionKind || sessionSettings.connectionKind || "";
    elements.endpoint.value = committedEndpoint || "https://app.maillume.io";
    elements.apiKey.value = committedApiKey;
    elements.rememberApiKey.checked = committedRememberApiKey;
    clearMessageData();
    updateConnectionState();
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
  committedRememberApiKey = false;
  committedApiKeyExpiresAt = "";
  committedApiKeyHardExpiresAt = "";
  committedConnectionKind = "";
  elements.endpoint.value = "https://app.maillume.io";
  elements.apiKey.value = "";
  elements.apiKey.type = "password";
  elements.rememberApiKey.checked = true;
  clearMessageData();
  updateConnectionState();
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
        headers: {
          ...EXTENSION_HEADERS,
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "chrome",
          subject: elements.subject.value.trim(),
          senderEmail: elements.sender.value.trim(),
          body,
          locale: getLocale(),
          links: capturedLinks,
          linkPairs: capturedLinkPairs,
          ...(!capturedContentComplete ? { evidenceTruncated: true } : {}),
        }),
      });
    } catch {
      throw new Error(copy.unreachable);
    }

    if (response.status === 426) throw new Error(copy.updateRequired);
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        committedConnectionKind === "browser"
          ? copy.browserAuthenticationFailed
          : copy.authenticationFailed,
      );
    }
    if (response.status === 429) throw new Error(copy.quotaExceeded);
    if (!response.ok) throw new Error(copy.requestFailed(response.status));

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error(copy.invalidResult);
    }
    if (!SUPPORTED_ANALYSIS_VERSIONS.includes(payload?.analysis_version)) throw new Error(copy.incompatibleResult);
    if (!isAnalysisResponse(payload)) throw new Error(copy.invalidResult);
    await refreshBrowserConnectionExpiry();
    renderResult(payload.result);
    setStatus(copy.complete);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : copy.invalidResult, true);
  } finally {
    updateAnalyzeState();
  }
});

for (const id of ["body", "endpoint", "apiKey"]) {
  elements[id].addEventListener("input", () => {
    if (id === "body") {
      capturedLinks = [];
      capturedLinkPairs = [];
      capturedContentComplete = false;
    }
    updateDestination();
    updateAnalyzeState();
  });
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
  const daysUntilExpiry = getDaysUntilExpiry(committedApiKeyExpiresAt);
  if (daysUntilExpiry !== null && daysUntilExpiry <= 0) {
    elements.destination.textContent = committedConnectionKind === "browser"
      ? copy.browserDestinationExpired(endpoint)
      : copy.destinationExpired(endpoint);
    return;
  }
  const warningDays = committedConnectionKind === "browser" ? 30 : 14;
  if (daysUntilExpiry !== null && daysUntilExpiry <= warningDays) {
    elements.destination.textContent = committedConnectionKind === "browser"
      ? copy.browserDestinationExpiring(endpoint, daysUntilExpiry)
      : copy.destinationExpiring(endpoint, daysUntilExpiry);
    return;
  }
  elements.destination.textContent = copy.destination(endpoint);
}

function updateConnectionState() {
  const connected = Boolean(committedApiKey && committedEndpoint && !isExpired(committedApiKeyExpiresAt));
  const copy = getDynamicCopy();
  elements.connectionState.textContent = connected
    ? copy.connectionStateConnected
    : copy.connectionStateDisconnected;
  elements.connectionState.dataset.connected = String(connected);
  elements.connect.textContent = connected ? copy.reconnectButton : copy.connectButton;
  elements.reset.hidden = !committedApiKey && !committedEndpoint;
}

function updateAnalyzeState() {
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  elements.analyze.disabled = !(
    elements.body.value.trim()
    && committedApiKey
    && endpoint
    && endpoint === committedEndpoint
    && elements.apiKey.value.trim() === committedApiKey
    && !isExpired(committedApiKeyExpiresAt)
  );
}

function setCapturePending(pending) {
  capturePending = pending;
  elements.capture.disabled = pending;
}

function permissionPattern(endpoint) {
  const url = new URL(endpoint);
  return `${url.protocol}//${url.hostname}/*`;
}

async function commitConnection({
  apiKey,
  connectionKind,
  endpoint,
  expiresAt,
  hardExpiresAt,
  permissionAlreadyGranted = false,
  rememberApiKey,
}) {
  const originPattern = permissionPattern(endpoint);
  if (!permissionAlreadyGranted) {
    let granted;
    try {
      granted = await chrome.permissions.request({ origins: [originPattern] });
    } catch {
      return "permission_error";
    }
    if (!granted) return "permission_denied";
  }

  const previousPattern = committedEndpoint ? permissionPattern(committedEndpoint) : null;
  try {
    await Promise.all([
      chrome.storage.local.set({ endpoint }),
      storeApiKey(
        apiKey,
        rememberApiKey,
        expiresAt,
        hardExpiresAt,
        connectionKind,
      ),
    ]);
  } catch {
    await restoreCommittedSettings();
    if (originPattern !== previousPattern) await removePermission(originPattern);
    return "save_failed";
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
  elements.apiKey.value = apiKey;
  elements.apiKey.type = "password";
  elements.rememberApiKey.checked = rememberApiKey;
  updateConnectionState();
  updateDestination();
  updateAnalyzeState();
  return "saved";
}

async function restoreCommittedSettings() {
  const endpointOperation = committedEndpoint
    ? chrome.storage.local.set({ endpoint: committedEndpoint })
    : chrome.storage.local.remove(["endpoint"]);
  const keyOperation = committedApiKey
    ? storeApiKey(
        committedApiKey,
        committedRememberApiKey,
        committedApiKeyExpiresAt,
        committedApiKeyHardExpiresAt,
        committedConnectionKind,
      )
    : Promise.all([
        chrome.storage.local.remove([
          "apiKey",
          "apiKeyExpiresAt",
          "apiKeyHardExpiresAt",
          "connectionKind",
        ]),
        chrome.storage.session.remove([
          "apiKey",
          "apiKeyExpiresAt",
          "apiKeyHardExpiresAt",
          "connectionKind",
        ]),
      ]);
  await Promise.allSettled([endpointOperation, keyOperation]);
}

async function storeApiKey(
  apiKey,
  remember,
  expiresAt = "",
  hardExpiresAt = "",
  connectionKind = "manual",
) {
  const metadata = {
    connectionKind,
    ...(expiresAt ? { apiKeyExpiresAt: expiresAt } : {}),
    ...(hardExpiresAt ? { apiKeyHardExpiresAt: hardExpiresAt } : {}),
  };
  if (remember) {
    await Promise.all([
      chrome.storage.local.set({ apiKey, ...metadata }),
      expiresAt
        ? Promise.resolve()
        : chrome.storage.local.remove(["apiKeyExpiresAt"]),
      hardExpiresAt
        ? Promise.resolve()
        : chrome.storage.local.remove(["apiKeyHardExpiresAt"]),
      chrome.storage.session.remove([
        "apiKey",
        "apiKeyExpiresAt",
        "apiKeyHardExpiresAt",
        "connectionKind",
      ]),
    ]);
    return;
  }
  await Promise.all([
    chrome.storage.local.remove([
      "apiKey",
      "apiKeyExpiresAt",
      "apiKeyHardExpiresAt",
      "connectionKind",
    ]),
    chrome.storage.session.set({ apiKey, ...metadata }),
    expiresAt
      ? Promise.resolve()
      : chrome.storage.session.remove(["apiKeyExpiresAt"]),
    hardExpiresAt
      ? Promise.resolve()
      : chrome.storage.session.remove(["apiKeyHardExpiresAt"]),
  ]);
}

async function refreshBrowserConnectionExpiry() {
  if (committedConnectionKind !== "browser" || !committedApiKeyHardExpiresAt) return;
  const inactivityExpiration = new Date(
    Date.now() + BROWSER_CONNECTION_INACTIVITY_DAYS * 86_400_000,
  ).toISOString();
  committedApiKeyExpiresAt = earlierTimestamp(
    committedApiKeyHardExpiresAt,
    inactivityExpiration,
  );
  await storeApiKey(
    committedApiKey,
    committedRememberApiKey,
    committedApiKeyExpiresAt,
    committedApiKeyHardExpiresAt,
    committedConnectionKind,
  );
  updateDestination();
}

async function resumePairing(pairing) {
  const copy = getDynamicCopy();
  if (!isStoredPairing(pairing)) {
    await chrome.storage.session.remove(["extensionPairing"]);
    return;
  }
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
      const response = await fetch(`${pairing.endpoint}/api/v1/extension-pairing`, {
        method: "PUT",
        headers: { ...EXTENSION_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceCode: pairing.deviceCode,
          pairingId: pairing.pairingId,
        }),
      });
      if (response.status === 202 || response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        await delay(Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter, 30) * 1_000
          : pairing.interval * 1_000);
        continue;
      }
      if (response.status === 403) throw new PairingError("denied");
      if (response.status === 410) throw new PairingError("expired");
      if (response.status === 426) throw new PairingError("update");
      if (!response.ok) throw new PairingError("failed");

      const payload = await response.json();
      const key = normalizeConnectedKey(payload, pairing.browserLifecycle === true);
      if (!key) throw new PairingError("failed");
      const outcome = await commitConnection({
        apiKey: key.plaintext,
        connectionKind: "browser",
        endpoint: pairing.endpoint,
        expiresAt: key.expiresAt,
        hardExpiresAt: key.hardExpiresAt,
        permissionAlreadyGranted: true,
        rememberApiKey: true,
      });
      if (outcome !== "saved") throw new PairingError("failed");
      await chrome.storage.session.remove(["extensionPairing"]);
      setStatus(copy.connected);
      return;
    }
    throw new PairingError("expired");
  } catch (error) {
    const reason = error instanceof PairingError ? error.reason : "failed";
    if (reason === "denied" || reason === "expired" || reason === "update") {
      await chrome.storage.session.remove(["extensionPairing"]);
    }
    setStatus(
      reason === "denied"
        ? copy.pairingDenied
        : reason === "expired"
          ? copy.pairingExpired
          : reason === "update"
            ? copy.updateRequired
            : copy.pairingFailed,
      true,
    );
  } finally {
    pairingPending = false;
    elements.connect.disabled = false;
  }
}

function normalizePairingResponse(payload, endpoint, browserLifecycle) {
  if (
    !payload
    || typeof payload !== "object"
    || !isPairingId(payload.pairing_id)
    || !/^mlp_[A-Za-z0-9_-]{43}$/.test(payload.device_code)
    || typeof payload.verification_uri_complete !== "string"
    || !Number.isInteger(payload.interval)
    || payload.interval < 1
    || payload.interval > 30
    || !isFutureTimestamp(payload.expires_at)
  ) {
    return null;
  }
  try {
    const verificationUrl = new URL(payload.verification_uri_complete);
    if (verificationUrl.origin !== endpoint || verificationUrl.protocol !== new URL(endpoint).protocol) {
      return null;
    }
    return {
      browserLifecycle,
      deviceCode: payload.device_code,
      endpoint,
      expiresAt: payload.expires_at,
      interval: payload.interval,
      pairingId: payload.pairing_id,
      verificationUrl: verificationUrl.toString(),
    };
  } catch {
    return null;
  }
}

function normalizeConnectedKey(payload, browserLifecycle) {
  const hardExpiresAt = payload?.key?.expires_at;
  const inactiveAfter = payload?.key?.inactive_after;
  if (
    payload?.status !== "connected"
    || !/^mlm_[A-Za-z0-9_-]{43}$/.test(payload.plaintext)
    || !isFutureTimestamp(hardExpiresAt)
  ) {
    return null;
  }
  if (!browserLifecycle) {
    return {
      expiresAt: hardExpiresAt,
      hardExpiresAt,
      plaintext: payload.plaintext,
    };
  }
  return payload?.key?.credential_kind === "browser" && isFutureTimestamp(inactiveAfter)
    ? {
        expiresAt: earlierTimestamp(hardExpiresAt, inactiveAfter),
        hardExpiresAt,
        plaintext: payload.plaintext,
      }
    : null;
}

function isStoredPairing(value) {
  if (
    !value
    || typeof value !== "object"
    || normalizeEndpoint(value.endpoint) !== value.endpoint
    || !/^mlp_[A-Za-z0-9_-]{43}$/.test(value.deviceCode)
    || !isPairingId(value.pairingId)
    || !Number.isInteger(value.interval)
    || value.interval < 1
    || value.interval > 30
    || typeof value.expiresAt !== "string"
    || !Number.isFinite(Date.parse(value.expiresAt))
    || typeof value.remember !== "boolean"
    || typeof value.verificationUrl !== "string"
  ) {
    return false;
  }
  try {
    return new URL(value.verificationUrl).origin === value.endpoint;
  } catch {
    return false;
  }
}

function isCompatibleCapabilityResponse(payload) {
  return Boolean(
    payload?.extension?.pairing_available === true
    && payload.extension.id === chrome.runtime.id
    && Array.isArray(payload.extension.supported_analysis_versions)
    && payload.extension.supported_analysis_versions.some((version) => SUPPORTED_ANALYSIS_VERSIONS.includes(version))
    && compareVersions(EXTENSION_VERSION, payload.extension.minimum_pairing_version) >= 0,
  );
}

function supportsBrowserConnectionLifecycle(payload) {
  return isCompatibleCapabilityResponse(payload)
    && compareVersions(payload.extension.latest_version, "0.4.0") >= 0;
}

function compareVersions(left, right) {
  if (!/^\d+\.\d+\.\d+$/.test(left) || !/^\d+\.\d+\.\d+$/.test(right)) return Number.NaN;
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] > rightParts[index] ? 1 : -1;
  }
  return 0;
}

function getBrowserKeyName() {
  const platform = String(navigator.userAgentData?.platform || navigator.platform || "Chrome")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 28);
  return `Chrome extension · ${platform}`.slice(0, 50);
}

function createBrowserConnectionId() {
  return `mlb_${crypto.randomUUID().replaceAll("-", "")}`;
}

function isBrowserConnectionId(value) {
  return typeof value === "string" && /^mlb_[a-f0-9]{32}$/.test(value);
}

function earlierTimestamp(left, right) {
  return Date.parse(left) <= Date.parse(right) ? left : right;
}

function getDaysUntilExpiry(value) {
  if (!value) return null;
  const expiresAt = Date.parse(value);
  if (!Number.isFinite(expiresAt)) return null;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000));
}

function isExpired(value) {
  return Boolean(value && Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now());
}

function isFutureTimestamp(value) {
  return typeof value === "string"
    && Number.isFinite(Date.parse(value))
    && Date.parse(value) > Date.now();
}

function isPairingId(value) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

class PairingError extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
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

function isEvidenceCoverage(coverage) {
  return Boolean(
    coverage
    && typeof coverage === "object"
    && typeof coverage.subject_available === "boolean"
    && typeof coverage.sender_available === "boolean"
    && typeof coverage.full_content_available === "boolean"
    && typeof coverage.link_destinations_available === "boolean"
    && typeof coverage.authentication_results_available === "boolean"
    && typeof coverage.attachment_evidence_available === "boolean"
    && ["direct", "ocr", "parsed"].includes(coverage.extraction_type)
  );
}

function isAnalysisResult(result, analysisVersion) {
  const classifications = ["likely_phishing", "likely_spam", "likely_legitimate", "uncertain"];
  const families = ["identity", "destination", "intent", "delivery", "style"];
  const coverageIsPresent = result?.evidence_coverage !== undefined;
  const coverageIsRequired = analysisVersion === "analysis-v9"
    || analysisVersion === "analysis-v10";
  const factorsAreValid = Array.isArray(result?.score_factors)
    && result.score_factors.every((factor) => factor
      && typeof factor.id === "string"
      && families.includes(factor.family)
      && Number.isInteger(factor.contribution)
      && factor.contribution >= 1
      && factor.contribution <= 30
      && typeof factor.label === "string");
  return Boolean(
    result
    && typeof result === "object"
    && Number.isInteger(result.risk_score)
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
    && (
      coverageIsPresent
        ? isEvidenceCoverage(result.evidence_coverage)
        : !coverageIsRequired
    )
  );
}

function isAnalysisResponse(payload) {
  const providers = ["heuristic", "openai", "anthropic", "openai-compatible"];
  const privacy = payload?.privacy;
  return Boolean(
    payload
    && typeof payload === "object"
    && isAnalysisResult(payload.result, payload.analysis_version)
    && ["heuristic", "ai"].includes(payload.analysis_mode)
    && providers.includes(payload.analysis_provider)
    && SUPPORTED_ANALYSIS_VERSIONS.includes(payload.analysis_version)
    && typeof payload.disclaimer === "string"
    && privacy
    && typeof privacy === "object"
    && privacy.stored === false
    && privacy.retention === "not_stored"
    && typeof privacy.message === "string"
  );
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isHttpUrl(value) {
  if (typeof value !== "string") return false;
  if (value.length > 2_048) return false;
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
  capturedLinks = [];
  capturedLinkPairs = [];
  capturedContentComplete = false;
  clearResult();
  elements.reviewStep.hidden = false;
  elements.analyze.hidden = false;
  updateAnalyzeState();
}

function clearResult() {
  elements.score.textContent = "";
  elements.level.textContent = "";
  elements.classification.textContent = "";
  elements.explanation.textContent = "";
  elements.coverageSummary.textContent = "";
  elements.coverage.replaceChildren();
  elements.coverageSection.hidden = true;
  elements.coverageSection.dataset.limited = "";
  elements.factors.replaceChildren();
  elements.action.textContent = "";
  elements.signals.replaceChildren();
  elements.level.dataset.level = "";
  elements.result.hidden = true;
}

function renderResult(result) {
  const copy = getDynamicCopy();
  elements.score.textContent = String(result.risk_score);
  elements.level.textContent = copy.levels[result.risk_level];
  elements.level.dataset.level = result.risk_level;
  elements.classification.textContent = copy.classifications[result.classification];
  elements.explanation.textContent = result.short_explanation;
  elements.action.textContent = result.recommended_action;
  renderEvidenceCoverage(result.evidence_coverage);
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
  elements.reviewStep.hidden = true;
  elements.analyze.hidden = true;
  elements.result.hidden = false;
}

function renderEvidenceCoverage(coverage) {
  if (!coverage) {
    elements.coverageSection.hidden = true;
    return;
  }

  const copy = getDynamicCopy();
  const materiallyLimited = !coverage.sender_available
    || !coverage.full_content_available
    || !coverage.link_destinations_available;
  elements.coverageSection.dataset.limited = String(
    materiallyLimited || coverage.extraction_type === "ocr",
  );
  elements.coverageSummary.textContent = coverage.extraction_type === "ocr"
    ? copy.coverageOcr
    : !coverage.full_content_available
      ? copy.coveragePartial
      : materiallyLimited
        ? copy.coverageLimited
        : copy.coverageComplete;

  const rows = [
    [copy.coverageLabels.subject, coverage.subject_available],
    [copy.coverageLabels.sender, coverage.sender_available],
    [copy.coverageLabels.fullContent, coverage.full_content_available],
    [copy.coverageLabels.linkDestinations, coverage.link_destinations_available],
    [copy.coverageLabels.authentication, coverage.authentication_results_available],
    [copy.coverageLabels.attachments, coverage.attachment_evidence_available],
  ].map(([label, available]) => {
    const item = document.createElement("li");
    item.textContent = `${label}: ${
      available ? copy.coverageStates.available : copy.coverageStates.unavailable
    }`;
    return item;
  });
  const extraction = document.createElement("li");
  extraction.textContent = `${copy.coverageLabels.extraction}: ${
    copy.extractionTypes[coverage.extraction_type]
  }`;
  elements.coverage.replaceChildren(...rows, extraction);
  elements.coverageSection.hidden = false;
}
