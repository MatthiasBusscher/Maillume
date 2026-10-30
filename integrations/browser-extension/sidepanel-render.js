// DOM-only state transitions. This module never reads storage or performs network I/O.
/* eslint-disable @typescript-eslint/no-unused-vars -- classic extension scripts share one ordered global scope */
function setStatus(message, isError = false) {
  for (const statusElement of [elements.status, elements.settingsStatus]) {
    statusElement.textContent = message;
    statusElement.style.color = isError ? "#8f251b" : "#4f5b50";
  }
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
  elements.explanation.textContent = renderText(result.short_explanation);
  elements.action.textContent = renderText(result.recommended_action);
  renderEvidenceCoverage(result.evidence_coverage);
  elements.factors.replaceChildren(...result.score_factors.slice(0, MAX_ANALYSIS_RESPONSE_FACTORS).map((factor) => {
    const item = document.createElement("li");
    item.textContent = `${renderText(factor.label)}: +${factor.contribution} ${copy.points}`;
    return item;
  }));
  elements.signals.replaceChildren(...result.suspicious_signals.slice(0, MAX_ANALYSIS_RESPONSE_SIGNALS).map((signal) => {
    const item = document.createElement("li");
    item.textContent = renderText(signal);
    return item;
  }));
  elements.reviewStep.hidden = true;
  elements.analyze.hidden = true;
  elements.result.hidden = false;
}

function renderText(value) {
  return typeof value === "string"
    ? value.slice(0, MAX_ANALYSIS_RESPONSE_TEXT_CHARACTERS)
    : "";
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

function updateDestination() {
  const copy = getDynamicCopy();
  const endpoint = normalizeEndpoint(elements.endpoint.value);
  if (!endpoint) return void (elements.destination.textContent = copy.configureDestination);
  elements.destination.textContent = endpoint === committedEndpoint ? copy.destination(endpoint) : copy.unsavedDestination(endpoint);
  elements.reset.hidden = committedEndpoint === DEFAULT_ENDPOINT && endpoint === DEFAULT_ENDPOINT;
}

function updateAnalyzeState() {
  elements.analyze.disabled = !elements.body.value.trim();
}

function setCapturePending(pending) {
  capturePending = pending;
  elements.capture.disabled = pending;
}
