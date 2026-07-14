const CAPTURE_TTL_MS = 60_000;
const captureHandoffs = new Map();
let nextCaptureId = 0;

disableGlobalPanel();

chrome.runtime.onInstalled.addListener(disableGlobalPanel);
chrome.runtime.onStartup.addListener(disableGlobalPanel);
chrome.action.onClicked.addListener(handleToolbarAction);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "consume-capture") return undefined;
  sendResponse(consumeCapture(message.tabId));
  return false;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "loading") return;
  clearCapture(tabId);
  chrome.sidePanel.setOptions({ tabId, enabled: false }).catch(() => {});
});

chrome.tabs.onRemoved.addListener((tabId) => {
  clearCapture(tabId);
});

function disableGlobalPanel() {
  chrome.sidePanel.setOptions({ enabled: false }).catch(() => {});
}

async function handleToolbarAction(tab) {
  if (!Number.isInteger(tab?.id)) return;
  const tabId = tab.id;
  const captureId = ++nextCaptureId;

  setCapture(tabId, { status: "pending", captureId });
  notifyPanel("capture-started", tabId);

  const panelSetup = chrome.sidePanel.setOptions({
    tabId,
    path: "sidepanel.html",
    enabled: true,
  });
  const panelOpen = chrome.sidePanel.open({ tabId });
  const capture = captureSelection(tab, captureId);

  const [setupResult, openResult] = await Promise.allSettled([panelSetup, panelOpen, capture]);
  if (setupResult.status === "rejected" || openResult.status === "rejected") {
    finishCapture(tabId, captureId, { status: "error", code: "panel_unavailable" });
  }
}

async function captureSelection(tab, captureId) {
  const tabId = tab.id;
  if (!isCapturablePage(tab.url)) {
    finishCapture(tabId, captureId, { status: "error", code: "restricted_page" });
    return;
  }

  try {
    const frameResults = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: readSelectionFromFrame,
    });
    const selections = frameResults
      .filter(({ result }) => typeof result?.text === "string" && result.text.trim())
      .sort((left, right) => {
        if (left.result.focused !== right.result.focused) return left.result.focused ? -1 : 1;
        if (left.result.source !== right.result.source) return left.result.source === "input" ? -1 : 1;
        return left.frameId - right.frameId;
      });
    const text = selections[0]?.result.text.trim().slice(0, 20_000) || "";

    finishCapture(tabId, captureId, text
      ? { status: "success", text }
      : { status: "error", code: "no_selection" });
  } catch {
    finishCapture(tabId, captureId, { status: "error", code: "capture_failed" });
  }
}

function readSelectionFromFrame() {
  let activeElement = document.activeElement;
  while (activeElement?.shadowRoot?.activeElement) {
    activeElement = activeElement.shadowRoot.activeElement;
  }

  const tagName = activeElement?.tagName?.toLowerCase();
  const focused = document.hasFocus() && tagName !== "iframe" && tagName !== "frame";
  if ((tagName === "input" || tagName === "textarea") && typeof activeElement.value === "string") {
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    if (Number.isInteger(start) && Number.isInteger(end) && end > start) {
      const text = activeElement.value.slice(start, end).trim();
      if (text) return { text, source: "input", focused };
    }
  }

  const text = window.getSelection()?.toString().trim() || "";
  return { text, source: "window", focused };
}

function isCapturablePage(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

function finishCapture(tabId, captureId, capture) {
  if (captureHandoffs.get(tabId)?.captureId !== captureId) return;
  setCapture(tabId, { ...capture, captureId });
  notifyPanel("capture-ready", tabId);
}

function setCapture(tabId, capture) {
  const expiresAt = Date.now() + CAPTURE_TTL_MS;
  captureHandoffs.set(tabId, { ...capture, expiresAt });
  setTimeout(() => {
    const current = captureHandoffs.get(tabId);
    if (current?.captureId === capture.captureId && current.expiresAt === expiresAt) clearCapture(tabId);
  }, CAPTURE_TTL_MS);
}

function consumeCapture(tabId) {
  if (!Number.isInteger(tabId)) return { status: "error", code: "no_active_tab" };
  const capture = captureHandoffs.get(tabId);
  if (!capture) return { status: "error", code: "handoff_missing" };
  if (capture.expiresAt <= Date.now()) {
    clearCapture(tabId);
    return { status: "error", code: "handoff_expired" };
  }
  if (capture.status === "pending") return { status: "pending" };

  clearCapture(tabId);
  if (capture.status === "success") return { status: "success", text: capture.text };
  return { status: "error", code: capture.code };
}

function clearCapture(tabId) {
  captureHandoffs.delete(tabId);
}

function notifyPanel(type, tabId) {
  chrome.runtime.sendMessage({ type, tabId }).catch(() => {});
}
