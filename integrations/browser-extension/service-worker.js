const CAPTURE_TTL_MS = 60_000;
const CAPTURE_STORAGE_PREFIX = "capture-handoff:";
const captureHandoffs = new Map();
let captureStorageQueue = Promise.resolve();

disableGlobalPanel();
restrictLocalStorageAccess();

chrome.runtime.onInstalled.addListener(() => { disableGlobalPanel(); restrictLocalStorageAccess(); });
chrome.runtime.onStartup.addListener(() => { disableGlobalPanel(); restrictLocalStorageAccess(); });
chrome.action.onClicked.addListener(handleToolbarAction);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "consume-capture") {
    consumeCapture(message.tabId, message.includeMetadata === true)
      .then(sendResponse)
      .catch(() => sendResponse({ status: "error", code: "handoff_missing" }));
    return true;
  }
  if (message?.type === "capture-active-tab") {
    recaptureTab(message.tabId).then(sendResponse);
    return true;
  }
  return undefined;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "loading" && typeof changeInfo.url !== "string") return;
  await clearCapture(tabId);
  notifyPanel("capture-cleared", tabId);
  if (changeInfo.status === "loading") {
    const nextUrl = changeInfo.url || tab?.url;
    const keepPanelOpen = isSupportedWebmailPage(nextUrl);
    chrome.sidePanel.setOptions(keepPanelOpen
      ? { tabId, path: "sidepanel.html", enabled: true }
      : { tabId, enabled: false }).catch(() => {});
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  clearCapture(tabId);
});

function disableGlobalPanel() {
  chrome.sidePanel.setOptions({ enabled: false }).catch(() => {});
}

function restrictLocalStorageAccess() {
  chrome.storage?.local?.setAccessLevel?.({ accessLevel: "TRUSTED_CONTEXTS" }).catch(() => {});
}

function isSupportedWebmailPage(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (hostname === "mail.google.com") return true;
    return [
      "outlook.live.com",
      "outlook.office.com",
      "outlook.office365.com",
      "outlook.cloud.microsoft",
    ].includes(hostname) && /^\/mail(?:\/|$)/i.test(url.pathname);
  } catch {
    return false;
  }
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
    const links = cleanLinks(result?.links);
    const linkPairs = cleanLinkPairs(result?.linkPairs);

    finishCapture(tabId, captureId, text
      ? {
          status: "success",
          text,
          source: result.source,
          subject: cleanField(result.subject, 300),
          sender: cleanField(result.sender, 320),
          ...(links.length > 0 ? { links } : {}),
          ...(linkPairs.length > 0 ? { linkPairs } : {}),
        }
      : { status: "error", code: captureError || "no_selection" });
  } catch {
    finishCapture(tabId, captureId, { status: "error", code: "capture_failed" });
  }
}

async function recaptureTab(tabId) {
  if (!Number.isInteger(tabId)) return { accepted: false, code: "no_active_tab" };

  const captureId = crypto.randomUUID();
  setCapture(tabId, { status: "pending", captureId });
  notifyPanel("capture-started", tabId, captureId);

  try {
    const tab = await chrome.tabs.get(tabId);
    await captureMessage(tab, captureId);
    return { accepted: true, captureId };
  } catch {
    finishCapture(tabId, captureId, { status: "error", code: "capture_failed" });
    return { accepted: false, code: "capture_failed", captureId };
  }
}

function readSelectionFromFrame() {
  const LINK_PATTERN = /\bhttps?:\/\/[^\s<>"')]+/gi;
  const MAX_LINKS = 20;
  const MAX_LINK_LENGTH = 2_048;
  const normalizeText = (value) => String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const cleanHttpUrl = (value) => {
    const link = String(value || "").trim().replace(/[.,!?;:]+$/, "");
    return link.length <= MAX_LINK_LENGTH && /^https?:\/\/[^\s]+$/i.test(link) ? link : "";
  };

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

  // Opening a browser action can move focus away from a selected field before
  // the injected script runs. Recover only an unambiguous selection in this frame.
  const selectedFields = Array.from(document.querySelectorAll?.("input, textarea") || [])
    .map((element) => {
      if (typeof element.value !== "string") return "";
      const start = element.selectionStart;
      const end = element.selectionEnd;
      if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) return "";
      return normalizeText(element.value.slice(start, end));
    })
    .filter(Boolean);
  if (selectedFields.length === 1) {
    return { text: selectedFields[0], source: "input", focused: false };
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
    for (const selector of selectors) {
      const candidates = [];
      document.querySelectorAll(selector).forEach((element) => {
        if (!isVisible(element)) return;
        const text = elementText(element);
        if (!text) return;
        candidates.push({ element, text, viewportScore: viewportScore(element) });
      });
      if (candidates.length > 0) {
        return candidates.sort((left, right) => right.viewportScore - left.viewportScore);
      }
    }
    return [];
  };
  const selectUnambiguousCandidate = (candidates) => {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    const [best, runnerUp] = candidates;
    if (best.viewportScore >= 1_000_000_000) return best;
    if (best.viewportScore > 0 && runnerUp.viewportScore <= 0) return best;
    if (
      best.viewportScore > 0
      && runnerUp.viewportScore > 0
      && best.viewportScore >= runnerUp.viewportScore * 1.75
      && best.viewportScore - runnerUp.viewportScore >= 40_000
    ) return best;
    return null;
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
  const getLinkMetadata = (root) => {
    const links = [];
    const linkPairs = [];
    const seenLinks = new Set();
    const seenPairs = new Set();

    for (const anchor of root?.querySelectorAll?.("a[href]") || []) {
      const destinationUrl = cleanHttpUrl(anchor.getAttribute("href"));
      if (!destinationUrl) continue;
      if (!seenLinks.has(destinationUrl) && links.length < MAX_LINKS) {
        seenLinks.add(destinationUrl);
        links.push(destinationUrl);
      }

      const displayedUrl = cleanHttpUrl(elementText(anchor).match(LINK_PATTERN)?.[0]);
      if (!displayedUrl) continue;
      const pairKey = `${displayedUrl}\n${destinationUrl}`;
      if (!seenPairs.has(pairKey) && linkPairs.length < MAX_LINKS) {
        seenPairs.add(pairKey);
        linkPairs.push({ displayedUrl, destinationUrl });
      }
    }

    return {
      ...(links.length > 0 ? { links } : {}),
      ...(linkPairs.length > 0 ? { linkPairs } : {}),
    };
  };

  if (isGmail) {
    const candidates = collectCandidates([".a3s.aiL", ".a3s", "[data-message-id] [role='document']"]);
    const candidate = selectUnambiguousCandidate(candidates);
    if (!candidate && candidates.length > 1) return { text: "", source: "window", focused, errorCode: "multiple_messages" };
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
      ...getLinkMetadata(candidate.element),
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
  const candidate = selectUnambiguousCandidate(candidates);
  if (!candidate && candidates.length > 1) return { text: "", source: "window", focused, errorCode: "multiple_messages" };
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
    ...getLinkMetadata(candidate.element),
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
  setCaptureWithExpiry(tabId, capture, expiresAt);
}

function setCaptureWithExpiry(tabId, capture, expiresAt) {
  const handoff = { ...capture, expiresAt };
  captureHandoffs.set(tabId, handoff);
  persistCaptureDescriptor(tabId, handoff);
  scheduleCaptureExpiry(tabId, handoff);
}

function scheduleCaptureExpiry(tabId, capture) {
  const delay = Math.max(0, capture.expiresAt - Date.now());
  setTimeout(() => {
    const current = captureHandoffs.get(tabId);
    if (current?.captureId === capture.captureId && current.expiresAt === capture.expiresAt) clearCapture(tabId);
  }, delay);
}

async function consumeCapture(tabId, includeMetadata = false) {
  if (!Number.isInteger(tabId)) return { status: "error", code: "no_active_tab" };
  let capture = captureHandoffs.get(tabId);
  let restoredFromSession = false;
  if (!capture) {
    capture = await restoreCaptureDescriptor(tabId);
    restoredFromSession = Boolean(capture);
  }
  if (!capture) return { status: "error", code: "handoff_missing" };
  if (capture.expiresAt <= Date.now()) {
    await clearCapture(tabId);
    return { status: "error", code: "handoff_expired" };
  }

  // A worker restart preserves only this descriptor. Re-read the visible tab
  // to rebuild the in-memory handoff without putting message content in storage.
  if (restoredFromSession && ["pending", "success"].includes(capture.status)) {
    await recoverCapture(tabId, capture);
    capture = captureHandoffs.get(tabId);
  }
  if (!capture) return { status: "error", code: "handoff_missing" };
  if (capture.status === "pending") {
    return includeMetadata ? { status: "pending", captureId: capture.captureId } : { status: "pending" };
  }

  await clearCapture(tabId);
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
    if (capture.links?.length > 0) response.links = capture.links;
    if (capture.linkPairs?.length > 0) response.linkPairs = capture.linkPairs;
    if (includeMetadata) response.captureId = capture.captureId;
    return response;
  }
  return includeMetadata
    ? { status: "error", code: capture.code, captureId: capture.captureId }
    : { status: "error", code: capture.code };
}

function clearCapture(tabId) {
  captureHandoffs.delete(tabId);
  return removeCaptureDescriptor(tabId);
}

function recoverCapture(tabId, descriptor) {
  setCaptureWithExpiry(tabId, { status: "pending", captureId: descriptor.captureId }, descriptor.expiresAt);
  return chrome.tabs.get(tabId)
    .then((tab) => captureMessage(tab, descriptor.captureId))
    .catch(() => {
      finishCapture(tabId, descriptor.captureId, { status: "error", code: "capture_failed" });
    });
}

function captureStorageKey(tabId) {
  return `${CAPTURE_STORAGE_PREFIX}${tabId}`;
}

function persistCaptureDescriptor(tabId, capture) {
  const descriptor = {
    captureId: capture.captureId,
    status: capture.status,
    expiresAt: capture.expiresAt,
  };
  queueCaptureStorage(() => chrome.storage.session.set({ [captureStorageKey(tabId)]: descriptor }));
}

function removeCaptureDescriptor(tabId) {
  return queueCaptureStorage(() => chrome.storage.session.remove(captureStorageKey(tabId)));
}

function queueCaptureStorage(operation) {
  captureStorageQueue = captureStorageQueue
    .then(operation, operation)
    .catch(() => {});
  return captureStorageQueue;
}

async function restoreCaptureDescriptor(tabId) {
  try {
    const stored = await chrome.storage.session.get(captureStorageKey(tabId));
    const descriptor = stored?.[captureStorageKey(tabId)];
    if (!descriptor || typeof descriptor.captureId !== "string" || !["pending", "success", "error"].includes(descriptor.status)) {
      return null;
    }
    if (!Number.isFinite(descriptor.expiresAt) || descriptor.expiresAt <= Date.now()) {
      await chrome.storage.session.remove(captureStorageKey(tabId));
      return null;
    }
    setCaptureWithExpiry(tabId, descriptor, descriptor.expiresAt);
    return captureHandoffs.get(tabId);
  } catch {
    return null;
  }
}

function cleanField(value, maxLength) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function cleanLinks(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .filter((link) => typeof link === "string")
    .map((link) => link.trim().replace(/[.,!?;:]+$/, ""))
    .filter((link) => link.length <= 2_048 && /^https?:\/\/[^\s]+$/i.test(link)))).slice(0, 20);
}

function cleanLinkPairs(value) {
  if (!Array.isArray(value)) return [];
  const pairs = [];
  const seen = new Set();
  for (const pair of value) {
    const [displayedUrl] = cleanLinks([pair?.displayedUrl]);
    const [destinationUrl] = cleanLinks([pair?.destinationUrl]);
    if (!displayedUrl || !destinationUrl) continue;
    const key = `${displayedUrl}\n${destinationUrl}`;
    if (seen.has(key) || pairs.length >= 20) continue;
    seen.add(key);
    pairs.push({ displayedUrl, destinationUrl });
  }
  return pairs;
}

function notifyPanel(type, tabId, captureId) {
  chrome.runtime.sendMessage({ type, tabId, captureId }).catch(() => {});
}
