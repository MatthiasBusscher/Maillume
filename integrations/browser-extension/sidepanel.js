const elements = Object.fromEntries(
  ["capture", "subject", "sender", "body", "endpoint", "apiKey", "save", "reset", "destination", "analyze", "status", "result", "score", "level", "explanation", "signals", "action"]
    .map((id) => [id, document.getElementById(id)]),
);
let committedEndpoint = "";
let committedApiKey = "";
const dynamicCopy = {
  en: {
    noTab: "No active browser tab is available.",
    noSelection: "Select the visible email text first, then try again.",
    captured: "Selection captured. Review it before analysis.",
    captureBlocked: "This page does not allow selection access. Open the message in Gmail or Outlook and try again.",
    invalidEndpoint: "Enter a valid HTTPS deployment URL.",
    permissionDenied: "Connection permission was not granted.",
    saved: "Connection settings saved on this device.",
    removed: "Saved connection and deployment permission removed.",
    required: "Selection, deployment, and API key are required.",
    sending: (origin) => `Sending the reviewed text to ${origin}...`,
    invalidResult: "The deployment returned an invalid analysis response.",
    failed: "Analysis failed.",
    complete: "Assessment complete. Message content was not saved by the extension.",
    destination: (endpoint) => `Destination: ${endpoint}`,
    unsavedDestination: (endpoint) => `Unsaved destination: ${endpoint}`,
    configureDestination: "Destination: configure a Maillume deployment",
    levels: { low: "Low", medium: "Medium", high: "High" },
  },
  nl: {
    noTab: "Er is geen actief browsertabblad beschikbaar.",
    noSelection: "Selecteer eerst de zichtbare e-mailtekst en probeer het opnieuw.",
    captured: "Selectie vastgelegd. Controleer de tekst vóór de analyse.",
    captureBlocked: "Deze pagina staat geen toegang tot de selectie toe. Open het bericht in Gmail of Outlook en probeer het opnieuw.",
    invalidEndpoint: "Voer een geldige HTTPS-implementatie-URL in.",
    permissionDenied: "Toestemming voor de verbinding is niet verleend.",
    saved: "Verbindingsinstellingen opgeslagen op dit apparaat.",
    removed: "Opgeslagen verbinding en implementatiemachtiging verwijderd.",
    required: "Selectie, implementatie en API-sleutel zijn vereist.",
    sending: (origin) => `De gecontroleerde tekst wordt naar ${origin} verzonden...`,
    invalidResult: "De implementatie gaf een ongeldig analyseresultaat terug.",
    failed: "De analyse is mislukt.",
    complete: "Beoordeling voltooid. De extensie heeft de berichtinhoud niet opgeslagen.",
    destination: (endpoint) => `Bestemming: ${endpoint}`,
    unsavedDestination: (endpoint) => `Niet-opgeslagen bestemming: ${endpoint}`,
    configureDestination: "Bestemming: configureer een Maillume-implementatie",
    levels: { low: "Laag", medium: "Gemiddeld", high: "Hoog" },
  },
};

initialize();

async function initialize() {
  localizeUi();
  const saved = await chrome.storage.local.get(["endpoint", "apiKey"]);
  if (saved.endpoint) elements.endpoint.value = saved.endpoint;
  if (saved.apiKey) elements.apiKey.value = saved.apiKey;
  committedEndpoint = saved.endpoint || "";
  committedApiKey = saved.apiKey || "";
  updateDestination();
  updateAnalyzeState();
}

function localizeUi() {
  const locale = getLocale();
  document.documentElement.lang = locale;
  if (locale === "nl") document.querySelectorAll("[data-nl]").forEach((node) => { node.textContent = node.dataset.nl; });
}

elements.capture.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  setStatus("");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return setStatus(copy.noTab, true);

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString().trim() || "",
    });
    if (!result) return setStatus(copy.noSelection, true);
    elements.body.value = result.slice(0, 20000);
    updateAnalyzeState();
    setStatus(copy.captured);
  } catch {
    setStatus(copy.captureBlocked, true);
  }
});

elements.save.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  if (!endpoint) return setStatus(copy.invalidEndpoint, true);
  const endpointUrl = new URL(endpoint);
  const originPattern = `${endpointUrl.protocol}//${endpointUrl.hostname}/*`;
  const granted = await chrome.permissions.request({ origins: [originPattern] });
  if (!granted) return setStatus(copy.permissionDenied, true);
  const apiKey = elements.apiKey.value.trim();
  const previousPattern = committedEndpoint ? permissionPattern(committedEndpoint) : null;
  await chrome.storage.local.set({ endpoint, apiKey });
  committedEndpoint = endpoint;
  committedApiKey = apiKey;
  if (previousPattern && previousPattern !== originPattern) {
    await chrome.permissions.remove({ origins: [previousPattern] });
  }
  elements.endpoint.value = endpoint;
  updateDestination();
  updateAnalyzeState();
  setStatus(copy.saved);
});

elements.reset.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  if (committedEndpoint) await chrome.permissions.remove({ origins: [permissionPattern(committedEndpoint)] });
  await chrome.storage.local.remove(["endpoint", "apiKey"]);
  committedEndpoint = "";
  committedApiKey = "";
  elements.endpoint.value = "https://app.maillume.io";
  elements.apiKey.value = "";
  elements.result.hidden = true;
  updateDestination();
  updateAnalyzeState();
  setStatus(copy.removed);
});

elements.analyze.addEventListener("click", async () => {
  const copy = getDynamicCopy();
  const endpoint = committedEndpoint;
  const apiKey = committedApiKey;
  const body = elements.body.value.trim();
  if (!endpoint || !apiKey || !body) return setStatus(copy.required, true);

  elements.analyze.disabled = true;
  elements.result.hidden = true;
  setStatus(copy.sending(new URL(endpoint).origin));
  try {
    const response = await fetch(`${endpoint}/api/v1/analyze`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ source: "paste", subject: elements.subject.value.trim(), senderEmail: elements.sender.value.trim(), body, locale: getLocale() }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Analysis failed (${response.status}).`);
    if (!isAnalysisResult(payload.result)) throw new Error(copy.invalidResult);
    renderResult(payload.result);
    setStatus(copy.complete);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : copy.failed, true);
  } finally {
    updateAnalyzeState();
  }
});

for (const id of ["body", "endpoint", "apiKey"]) elements[id].addEventListener("input", () => { updateDestination(); updateAnalyzeState(); });

function normalizeEndpoint(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return null;
    return url.origin;
  } catch { return null; }
}

function updateDestination() {
  const copy = getDynamicCopy();
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  const saved = endpoint && endpoint === committedEndpoint && elements.apiKey.value.trim() === committedApiKey;
  elements.destination.textContent = saved ? copy.destination(endpoint) : endpoint ? copy.unsavedDestination(endpoint) : copy.configureDestination;
}

function updateAnalyzeState() {
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  elements.analyze.disabled = !(elements.body.value.trim() && committedApiKey && endpoint && endpoint === committedEndpoint && elements.apiKey.value.trim() === committedApiKey);
}

function permissionPattern(endpoint) {
  const url = new URL(endpoint);
  return `${url.protocol}//${url.hostname}/*`;
}

function getLocale() {
  return chrome.i18n.getUILanguage().toLowerCase().startsWith("nl") ? "nl" : "en";
}

function getDynamicCopy() {
  return dynamicCopy[getLocale()];
}

function isAnalysisResult(result) {
  return result && typeof result.risk_score === "number" && ["low", "medium", "high"].includes(result.risk_level) && Array.isArray(result.suspicious_signals) && typeof result.short_explanation === "string" && typeof result.recommended_action === "string";
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.style.color = isError ? "#8f251b" : "#4f5b50";
}

function renderResult(result) {
  elements.score.textContent = String(result.risk_score);
  elements.level.textContent = getDynamicCopy().levels[result.risk_level];
  elements.explanation.textContent = result.short_explanation;
  elements.action.textContent = result.recommended_action;
  elements.signals.replaceChildren(...result.suspicious_signals.map((signal) => {
    const item = document.createElement("li");
    item.textContent = signal;
    return item;
  }));
  elements.result.hidden = false;
}
