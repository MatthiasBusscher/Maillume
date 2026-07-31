// Capture data stays in panel memory only. The worker owns the one-time handoff.
/* eslint-disable @typescript-eslint/no-unused-vars -- classic extension scripts share one ordered global scope */
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
    if (typeof message.captureId === "string") latestCaptureId = message.captureId;
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
