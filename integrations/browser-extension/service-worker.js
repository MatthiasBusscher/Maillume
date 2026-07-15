const CAPTURE_TTL_MS = 60_000;
const captureHandoffs = new Map();

disableGlobalPanel();

chrome.runtime.onInstalled.addListener(disableGlobalPanel);
chrome.runtime.onStartup.addListener(disableGlobalPanel);
chrome.action.onClicked.addListener(handleToolbarAction);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "consume-capture") return undefined;
  sendResponse(consumeCapture(message.tabId, message.includeMetadata === true));
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
  const captureId = crypto.randomUUID();

  setCapture(tabId, { status: "pending", captureId });
  notifyPanel("capture-started", tabId, captureId);

  // Start every operation while the toolbar click still owns the activeTab grant
  // and user gesture required by sidePanel.open().
  const panelSetup = chrome.sidePanel.setOptions({
    tabId,
    path: "sidepanel.html",
    enabled: true,
  });
  const panelOpen = chrome.sidePanel.open({ tabId });
  const capture = captureMessage(tab, captureId);
  const [setupResult, openResult] = await Promise.allSettled([panelSetup, panelOpen, capture]);
  if (setupResult.status === "rejected" || openResult.status === "rejected") {
    if (captureHandoffs.get(tabId)?.status === "pending") {
      finishCapture(tabId, captureId, { status: "error", code: "panel_unavailable" });
    }
  }
}

async function captureMessage(tab, captureId) {
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
    const captures = frameResults
      .filter(({ result }) => typeof result?.text === "string" && result.text.trim())
      .sort((left, right) => {
        const leftIsSelection = left.result.source === "input" || left.result.source === "window";
        const rightIsSelection = right.result.source === "input" || right.result.source === "window";
        if (leftIsSelection !== rightIsSelection) return leftIsSelection ? -1 : 1;
        if (left.result.focused !== right.result.focused) return left.result.focused ? -1 : 1;
        if (left.result.source !== right.result.source) return left.result.source === "input" ? -1 : 1;
        if ((left.result.viewportScore || 0) !== (right.result.viewportScore || 0)) {
          return (right.result.viewportScore || 0) - (left.result.viewportScore || 0);
        }
        return left.frameId - right.frameId;
      });
    const result = captures[0]?.result;
    const text = result?.text.trim().slice(0, 20_000) || "";
    const captureError = frameResults.find(({ result: frameResult }) => frameResult?.errorCode)?.result.errorCode;

    finishCapture(tabId, captureId, text
      ? {
          status: "success",
          text,
          source: result.source,
          subject: cleanField(result.subject, 300),
          sender: cleanField(result.sender, 320),
        }
      : { status: "error", code: captureError || "no_selection" });
  } catch {
    finishCapture(tabId, captureId, { status: "error", code: "capture_failed" });
  }
}

function readSelectionFromFrame() {
  const normalizeText = (value) => String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

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
      const text = normalizeText(activeElement.value.slice(start, end));
      if (text) return { text, source: "input", focused };
    }
  }

  const selection = normalizeText(window.getSelection()?.toString());
  if (selection) return { text: selection, source: "window", focused };

  const hostname = location.hostname.toLowerCase();
  const isGmail = hostname === "mail.google.com";
  const isOutlook = [
    "outlook.live.com",
    "outlook.office.com",
    "outlook.office365.com",
    "outlook.cloud.microsoft",
  ].includes(hostname);
  if (!isGmail && !isOutlook) return { text: "", source: "window", focused };

  const isVisible = (element) => {
    if (!(element instanceof Element)) return false;
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    return element.getClientRects().length > 0;
  };
  const elementText = (element) => normalizeText(element?.innerText || element?.textContent);
  const viewportScore = (element) => {
    const rect = element.getBoundingClientRect();
    const visibleWidth = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
    const visibleHeight = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
    const activeBonus = activeElement && element.contains(activeElement) ? 1_000_000_000 : 0;
    const centerDistance = Math.abs((rect.top + rect.bottom) / 2 - innerHeight / 2);
    return activeBonus + (visibleWidth * visibleHeight) - centerDistance;
  };
  const collectCandidates = (selectors) => {
    const seen = new Set();
    const candidates = [];
    selectors.forEach((selector, priority) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (seen.has(element) || !isVisible(element)) return;
        const text = elementText(element);
        if (!text) return;
        seen.add(element);
        candidates.push({ element, text, priority: selectors.length - priority, viewportScore: viewportScore(element) });
      });
    });
    return candidates.sort((left, right) => {
      if (left.priority !== right.priority) return right.priority - left.priority;
      return right.viewportScore - left.viewportScore;
    });
  };
  const firstText = (root, selectors) => {
    for (const selector of selectors) {
      const element = root?.querySelector?.(selector);
      const text = elementText(element);
      if (text) return text;
    }
    return "";
  };
  const firstEmail = (root, selectors) => {
    for (const selector of selectors) {
      const element = root?.querySelector?.(selector);
      if (!element) continue;
      const values = [
        element.getAttribute("email"),
        element.getAttribute("data-email-address"),
        element.getAttribute("title"),
        element.getAttribute("href"),
        elementText(element),
      ];
      for (const value of values) {
        const email = String(value || "").replace(/^mailto:/i, "").match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
        if (email) return email;
      }
    }
    return "";
  };

  if (isGmail) {
    const candidates = collectCandidates([".a3s.aiL", ".a3s", "[data-message-id] [role='document']"]);
    if (candidates.length > 1) return { text: "", source: "window", focused, errorCode: "multiple_messages" };
    const candidate = candidates[0];
    if (!candidate) return { text: "", source: "window", focused };
    const container = candidate.element.closest(".adn, [data-message-id]") || document;
    return {
      text: candidate.text,
      source: "open_message",
      focused,
      subject: firstText(document, ["h2.hP", "[role='main'] h2"]),
      sender: firstEmail(container, [".gD[email]", "[email]", "a[href^='mailto:']"])
        || firstEmail(document, [".gD[email]", "[email]", "a[href^='mailto:']"]),
      viewportScore: candidate.viewportScore,
    };
  }

  const candidates = collectCandidates([
    "[data-testid='message-body']",
    "[data-testid='read-message-body']",
    "[data-testid='MessageBody']",
    "[aria-label='Message body']",
    "[role='document']",
    ".allowTextSelection",
  ]);
  if (candidates.length > 1) return { text: "", source: "window", focused, errorCode: "multiple_messages" };
  const candidate = candidates[0];
  if (!candidate) return { text: "", source: "window", focused };
  const container = candidate.element.closest("[data-testid*='message'], [role='listitem']") || document;
  return {
    text: candidate.text,
    source: "open_message",
    focused,
    subject: firstText(container, ["[data-testid='message-subject']", "[data-testid='MessageSubject']", "[role='heading']", "h1", "h2"])
      || firstText(document, ["[data-testid='message-subject']", "[data-testid='MessageSubject']", "[role='main'] h1", "[role='main'] h2"]),
    sender: firstEmail(container, ["[data-testid='message-sender'] [title*='@']", "[data-testid='PersonaPrimaryText']", "a[href^='mailto:']", "[title*='@']"]),
    viewportScore: candidate.viewportScore,
  };
}

function isCapturablePage(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

function finishCapture(tabId, captureId, capture) {
  if (captureHandoffs.get(tabId)?.captureId !== captureId) return;
  setCapture(tabId, { ...capture, captureId });
  notifyPanel("capture-ready", tabId, captureId);
}

function setCapture(tabId, capture) {
  const expiresAt = Date.now() + CAPTURE_TTL_MS;
  captureHandoffs.set(tabId, { ...capture, expiresAt });
  setTimeout(() => {
    const current = captureHandoffs.get(tabId);
    if (current?.captureId === capture.captureId && current.expiresAt === expiresAt) clearCapture(tabId);
  }, CAPTURE_TTL_MS);
}

function consumeCapture(tabId, includeMetadata = false) {
  if (!Number.isInteger(tabId)) return { status: "error", code: "no_active_tab" };
  const capture = captureHandoffs.get(tabId);
  if (!capture) return { status: "error", code: "handoff_missing" };
  if (capture.expiresAt <= Date.now()) {
    clearCapture(tabId);
    return { status: "error", code: "handoff_expired" };
  }
  if (capture.status === "pending") {
    return includeMetadata ? { status: "pending", captureId: capture.captureId } : { status: "pending" };
  }

  clearCapture(tabId);
  if (capture.status === "success") {
    if (capture.source !== "open_message") {
      return includeMetadata
        ? { status: "success", text: capture.text, source: "selection", captureId: capture.captureId }
        : { status: "success", text: capture.text };
    }
    const response = {
      status: "success",
      text: capture.text,
      source: "open_message",
      subject: capture.subject,
      sender: capture.sender,
    };
    if (includeMetadata) response.captureId = capture.captureId;
    return response;
  }
  return includeMetadata
    ? { status: "error", code: capture.code, captureId: capture.captureId }
    : { status: "error", code: capture.code };
}

function clearCapture(tabId) {
  captureHandoffs.delete(tabId);
}

function cleanField(value, maxLength) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function notifyPanel(type, tabId, captureId) {
  chrome.runtime.sendMessage({ type, tabId, captureId }).catch(() => {});
}
