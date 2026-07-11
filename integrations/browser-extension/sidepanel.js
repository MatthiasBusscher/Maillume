const elements = Object.fromEntries(
  ["capture", "subject", "sender", "body", "endpoint", "apiKey", "save", "reset", "destination", "analyze", "status", "result", "score", "level", "explanation", "signals", "action"]
    .map((id) => [id, document.getElementById(id)]),
);
let committedEndpoint = "";
let committedApiKey = "";

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
  setStatus("");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return setStatus("No active browser tab is available.", true);

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString().trim() || "",
    });
    if (!result) return setStatus("Select the visible email text first, then try again.", true);
    elements.body.value = result.slice(0, 20000);
    updateAnalyzeState();
    setStatus("Selection captured. Review it before analysis.");
  } catch {
    setStatus("This page does not allow selection access. Open the message in Gmail or Outlook and try again.", true);
  }
});

elements.save.addEventListener("click", async () => {
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  if (!endpoint) return setStatus("Enter a valid HTTPS deployment URL.", true);
  const endpointUrl = new URL(endpoint);
  const originPattern = `${endpointUrl.protocol}//${endpointUrl.hostname}/*`;
  const granted = await chrome.permissions.request({ origins: [originPattern] });
  if (!granted) return setStatus("Connection permission was not granted.", true);
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
  setStatus("Connection settings saved on this device.");
});

elements.reset.addEventListener("click", async () => {
  if (committedEndpoint) await chrome.permissions.remove({ origins: [permissionPattern(committedEndpoint)] });
  await chrome.storage.local.remove(["endpoint", "apiKey"]);
  committedEndpoint = "";
  committedApiKey = "";
  elements.endpoint.value = "https://app.maillume.io";
  elements.apiKey.value = "";
  elements.result.hidden = true;
  updateDestination();
  updateAnalyzeState();
  setStatus("Saved connection and deployment permission removed.");
});

elements.analyze.addEventListener("click", async () => {
  const endpoint = committedEndpoint;
  const apiKey = committedApiKey;
  const body = elements.body.value.trim();
  if (!endpoint || !apiKey || !body) return setStatus("Selection, deployment, and API key are required.", true);

  elements.analyze.disabled = true;
  elements.result.hidden = true;
  setStatus(`Sending the reviewed text to ${new URL(endpoint).origin}...`);
  try {
    const response = await fetch(`${endpoint}/api/v1/analyze`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ source: "paste", subject: elements.subject.value.trim(), senderEmail: elements.sender.value.trim(), body, locale: getLocale() }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Analysis failed (${response.status}).`);
    if (!isAnalysisResult(payload.result)) throw new Error("The deployment returned an invalid analysis response.");
    renderResult(payload.result);
    setStatus("Assessment complete. Message content was not saved by the extension.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Analysis failed.", true);
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
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  const saved = endpoint && endpoint === committedEndpoint && elements.apiKey.value.trim() === committedApiKey;
  elements.destination.textContent = saved ? `Destination: ${endpoint}` : endpoint ? `Unsaved destination: ${endpoint}` : "Destination: configure a Maillume deployment";
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

function isAnalysisResult(result) {
  return result && typeof result.risk_score === "number" && ["low", "medium", "high"].includes(result.risk_level) && Array.isArray(result.suspicious_signals) && typeof result.short_explanation === "string" && typeof result.recommended_action === "string";
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.style.color = isError ? "#8f251b" : "#4f5b50";
}

function renderResult(result) {
  elements.score.textContent = String(result.risk_score);
  elements.level.textContent = result.risk_level;
  elements.explanation.textContent = result.short_explanation;
  elements.action.textContent = result.recommended_action;
  elements.signals.replaceChildren(...result.suspicious_signals.map((signal) => {
    const item = document.createElement("li");
    item.textContent = signal;
    return item;
  }));
  elements.result.hidden = false;
}
