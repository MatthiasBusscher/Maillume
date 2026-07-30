// DOM-only state transitions. This module never reads storage or performs network I/O.
/* eslint-disable @typescript-eslint/no-unused-vars -- classic extension scripts share one ordered global scope */
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
  const materiallyLimited = !coverage.sender_available || !coverage.full_content_available || !coverage.link_destinations_available;
  elements.coverageSection.dataset.limited = String(materiallyLimited || coverage.extraction_type === "ocr");
  elements.coverageSummary.textContent = coverage.extraction_type === "ocr"
    ? copy.coverageOcr
    : !coverage.full_content_available ? copy.coveragePartial : materiallyLimited ? copy.coverageLimited : copy.coverageComplete;
  const rows = [
    [copy.coverageLabels.subject, coverage.subject_available],
    [copy.coverageLabels.sender, coverage.sender_available],
    [copy.coverageLabels.fullContent, coverage.full_content_available],
    [copy.coverageLabels.linkDestinations, coverage.link_destinations_available],
    [copy.coverageLabels.authentication, coverage.authentication_results_available],
    [copy.coverageLabels.attachments, coverage.attachment_evidence_available],
  ].map(([label, available]) => {
    const item = document.createElement("li");
    item.textContent = `${label}: ${available ? copy.coverageStates.available : copy.coverageStates.unavailable}`;
    return item;
  });
  const extraction = document.createElement("li");
  extraction.textContent = `${copy.coverageLabels.extraction}: ${copy.extractionTypes[coverage.extraction_type]}`;
  elements.coverage.replaceChildren(...rows, extraction);
  elements.coverageSection.hidden = false;
}

function updateApiKeyVisibility() {
  const concealed = committedConnectionKind === "browser" && !elements.apiKey.value.trim();
  elements.apiKeyVisibility.disabled = concealed;
  if (!concealed) return;
  elements.apiKey.type = "password";
  elements.apiKeyVisibility.setAttribute("aria-pressed", "false");
  elements.apiKeyVisibility.setAttribute("aria-label", getDynamicCopy().showApiKey);
  elements.apiKeyVisibility.setAttribute("title", getDynamicCopy().showApiKey);
}

function updateDestination() {
  const copy = getDynamicCopy();
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  if (!endpoint) return void (elements.destination.textContent = copy.configureDestination);
  if (endpoint !== committedEndpoint) return void (elements.destination.textContent = copy.unsavedDestination(endpoint));
  if (!committedApiKey) return void (elements.destination.textContent = copy.destinationNeedsKey(endpoint));
  if (!isCredentialInputCurrent()) return void (elements.destination.textContent = copy.unsavedKey(endpoint));
  const daysUntilExpiry = getDaysUntilExpiry(committedApiKeyExpiresAt);
  if (daysUntilExpiry !== null && daysUntilExpiry <= 0) {
    elements.destination.textContent = committedConnectionKind === "browser" ? copy.browserDestinationExpired(endpoint) : copy.destinationExpired(endpoint);
    return;
  }
  const warningDays = committedConnectionKind === "browser" ? 30 : 14;
  if (daysUntilExpiry !== null && daysUntilExpiry <= warningDays) {
    elements.destination.textContent = committedConnectionKind === "browser" ? copy.browserDestinationExpiring(endpoint, daysUntilExpiry) : copy.destinationExpiring(endpoint, daysUntilExpiry);
    return;
  }
  elements.destination.textContent = copy.destination(endpoint);
}

function updateConnectionState() {
  const connected = Boolean(committedApiKey && committedEndpoint && !isExpired(committedApiKeyExpiresAt));
  const browserConnected = connected && committedConnectionKind === "browser";
  const copy = getDynamicCopy();
  elements.connectionState.textContent = browserConnected ? copy.connectionStateConnected : connected ? copy.connectionStateManual : copy.connectionStateDisconnected;
  elements.connectionState.dataset.connected = String(connected);
  elements.connect.hidden = browserConnected;
  elements.connect.textContent = committedConnectionKind === "browser" ? copy.reconnectButton : copy.connectButton;
  elements.reset.hidden = !committedApiKey && !committedEndpoint;
}

function updateAnalyzeState() {
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  elements.analyze.disabled = !(elements.body.value.trim() && committedApiKey && endpoint && endpoint === committedEndpoint && isCredentialInputCurrent() && !isExpired(committedApiKeyExpiresAt));
}

function isCredentialInputCurrent() {
  return committedConnectionKind === "browser" || elements.apiKey.value.trim() === committedApiKey;
}

function setCapturePending(pending) {
  capturePending = pending;
  elements.capture.disabled = pending;
}
