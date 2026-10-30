/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const extensionDir = __dirname;

function loadPanelScripts(context) {
  for (const file of [
    "sidepanel-compatibility.js",
    "sidepanel-copy.js",
    "sidepanel-contract.js",
    "sidepanel-render.js",
    "sidepanel-capture.js",
    "sidepanel-connection.js",
    "sidepanel.js",
  ]) {
    vm.runInContext(fs.readFileSync(path.join(extensionDir, file), "utf8"), context, { filename: file });
  }
}

function event() {
  return { listener: undefined, addListener(callback) { this.listener = callback; } };
}

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createSessionStorage() {
  const values = new Map();
  return {
    async get(keys) {
      if (keys === null || keys === undefined) return Object.fromEntries(values);
      const requested = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(requested.filter((key) => values.has(key)).map((key) => [key, values.get(key)]));
    },
    async set(entries) {
      Object.entries(entries).forEach(([key, value]) => values.set(key, value));
    },
    async remove(keys) {
      (Array.isArray(keys) ? keys : [keys]).forEach((key) => values.delete(key));
    },
    snapshot() {
      return Object.fromEntries(values);
    },
  };
}

function createWorkerContext(sessionStorage = createSessionStorage()) {
  const events = {
    installed: event(), startup: event(), message: event(), action: event(), updated: event(), removed: event(),
  };
  let frameResults = [];
  const panelOptions = [];
  let captureSequence = 0;
  const context = {
    crypto: { randomUUID: () => `capture-${++captureSequence}` },
    chrome: {
      runtime: {
        onInstalled: events.installed,
        onStartup: events.startup,
        onMessage: events.message,
        sendMessage: async () => {},
      },
      action: { onClicked: events.action },
      tabs: {
        onUpdated: events.updated,
        onRemoved: events.removed,
        get: async (tabId) => ({ id: tabId, url: "https://mail.google.com/mail/u/0/#inbox/thread" }),
      },
      sidePanel: { setOptions: async (options) => { panelOptions.push(options); }, open: async () => {} },
      scripting: { executeScript: async () => frameResults },
      storage: { session: sessionStorage },
    },
    console,
    Date,
    Map,
    Number,
    Promise,
    Set,
    String,
    URL,
    setTimeout: () => 1,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(extensionDir, "service-worker.js"), "utf8"), context);
  return { context, events, panelOptions, setFrameResults(value) { frameResults = value; } };
}

async function testCapturePriorityAndMetadata() {
  const worker = createWorkerContext();
  worker.setFrameResults([
    { frameId: 0, result: { text: "Open message", source: "open_message", subject: "Invoice", sender: "billing@example.com", focused: true } },
    { frameId: 2, result: { text: "Explicit selection", source: "window", focused: false } },
  ]);
  await worker.events.action.listener({ id: 10, url: "https://mail.google.com/mail/u/0/#inbox/thread" });
  assert.deepEqual(plain(await worker.context.consumeCapture(10)), { status: "success", text: "Explicit selection" });

  worker.setFrameResults([
    { frameId: 0, result: { text: "Next open message", source: "open_message", subject: "Next", sender: "next@example.com", focused: true } },
  ]);
  let recaptureResponse;
  assert.equal(worker.events.message.listener(
    { type: "capture-active-tab", tabId: 10 },
    {},
    (value) => { recaptureResponse = value; },
  ), true);
  await flush();
  assert.equal(recaptureResponse.accepted, true);
  assert.deepEqual(plain(await worker.context.consumeCapture(10, true)), {
    status: "success",
    text: "Next open message",
    source: "open_message",
    subject: "Next",
    sender: "next@example.com",
    captureId: "capture-2",
  });
  await worker.events.updated.listener(10, { url: "https://mail.google.com/mail/u/0/#inbox/next" });
  assert.deepEqual(
    plain(await worker.context.consumeCapture(10)),
    { status: "error", code: "handoff_missing" },
    "URL-only webmail navigation must clear the previous capture",
  );

  worker.setFrameResults([
    { frameId: 0, result: { text: "Open Outlook message", source: "open_message", subject: "Payment update", sender: "sender@example.com", focused: true } },
  ]);
  await worker.events.action.listener({ id: 11, url: "https://outlook.office.com/mail/inbox/id/example" });
  assert.deepEqual(plain(await worker.context.consumeCapture(11, true)), {
    status: "success",
    text: "Open Outlook message",
    source: "open_message",
    subject: "Payment update",
    sender: "sender@example.com",
    captureId: "capture-3",
  });

  worker.setFrameResults([
    { frameId: 0, result: { text: "Outlook message before navigation", source: "open_message", focused: true } },
  ]);
  await worker.events.action.listener({ id: 11, url: "https://outlook.office.com/mail/inbox/id/first" });
  await worker.events.updated.listener(
    11,
    { status: "loading", url: "https://outlook.office.com/mail/inbox/id/second" },
    { id: 11, url: "https://outlook.office.com/mail/inbox/id/second" },
  );
  assert.deepEqual(plain(worker.panelOptions.at(-1)), {
    tabId: 11,
    path: "sidepanel.html",
    enabled: true,
  }, "Outlook message navigation must keep the tab-specific side panel enabled");
  assert.deepEqual(
    plain(await worker.context.consumeCapture(11)),
    { status: "error", code: "handoff_missing" },
    "Outlook navigation must clear the previous message while keeping the panel open",
  );

  await worker.events.updated.listener(
    11,
    { status: "loading", url: "https://outlook.office.com/calendar/view/week" },
    { id: 11, url: "https://outlook.office.com/calendar/view/week" },
  );
  assert.deepEqual(plain(worker.panelOptions.at(-1)), { tabId: 11, enabled: false }, "leaving Outlook mail must disable the panel");
}

async function testCaptureRecoversAfterWorkerRestart() {
  const sessionStorage = createSessionStorage();
  const firstWorker = createWorkerContext(sessionStorage);
  firstWorker.setFrameResults([
    { frameId: 0, result: { text: "Message survives worker restart", source: "open_message", subject: "Restart test", sender: "sender@example.com", focused: true } },
  ]);
  await firstWorker.events.action.listener({ id: 12, url: "https://mail.google.com/mail/u/0/#inbox/thread" });
  await flush();

  const descriptor = sessionStorage.snapshot()["capture-handoff:12"];
  assert.deepEqual(Object.keys(descriptor).sort(), ["captureId", "expiresAt", "status"]);
  assert.equal("text" in descriptor, false, "session recovery state must not contain message content");

  const restartedWorker = createWorkerContext(sessionStorage);
  restartedWorker.setFrameResults([
    { frameId: 0, result: { text: "Message survives worker restart", source: "open_message", subject: "Restart test", sender: "sender@example.com", focused: true } },
  ]);
  assert.deepEqual(plain(await restartedWorker.context.consumeCapture(12, true)), {
    status: "success",
    text: "Message survives worker restart",
    source: "open_message",
    subject: "Restart test",
    sender: "sender@example.com",
    captureId: "capture-1",
  });
  assert.deepEqual(sessionStorage.snapshot(), {}, "consuming a recovered handoff must clear its session descriptor");
}

async function testCaptureBoundaries() {
  const worker = createWorkerContext();

  await worker.events.action.listener({ id: 13, url: "chrome://settings" });
  assert.deepEqual(
    plain(await worker.context.consumeCapture(13)),
    { status: "error", code: "restricted_page" },
    "restricted browser pages must fail without attempting a capture",
  );

  worker.setFrameResults([
    { frameId: 0, result: { text: "x".repeat(20_001), source: "window", focused: true } },
  ]);
  await worker.events.action.listener({ id: 14, url: "https://mail.google.com/mail/u/0/#inbox/oversized" });
  const boundedCapture = plain(await worker.context.consumeCapture(14));
  assert.equal(boundedCapture.status, "success");
  assert.equal(boundedCapture.text.length, 20_000, "captured text must respect the API character limit");

  const unicodeText = `${"x".repeat(19_997)}🛡️`;
  assert.equal(unicodeText.length, 20_000);
  worker.setFrameResults([
    { frameId: 0, result: { text: unicodeText, source: "window", focused: true } },
  ]);
  await worker.events.action.listener({ id: 15, url: "https://outlook.office.com/mail/inbox/id/unicode" });
  assert.deepEqual(
    plain(await worker.context.consumeCapture(15)),
    { status: "success", text: unicodeText },
    "Unicode text at the maximum accepted length must survive capture unchanged",
  );
}

function fakeElement(options = {}) {
  return Object.assign(new FakeElement(), {
    tagName: "DIV",
    innerText: "",
    textContent: "",
    attributes: {},
    query: {},
    queries: {},
    getClientRects: () => [{}],
    getBoundingClientRect: () => ({ top: 100, bottom: 400, left: 10, right: 700 }),
    contains: () => false,
    closest: () => null,
    querySelector(selector) { return this.query[selector] || null; },
    querySelectorAll(selector) { return this.queries[selector] || []; },
    getAttribute(name) { return this.attributes[name] || null; },
    ...options,
  });
}

class FakeElement {}

function testOpenMessageExtractors() {
  const { context } = createWorkerContext();
  const sender = fakeElement({ attributes: { email: "sender@gmail.test" } });
  const subject = fakeElement({ innerText: "Suspicious invoice" });
  const container = fakeElement({ query: { ".gD[email]": sender } });
  const hiddenLink = fakeElement({
    innerText: "https://portal.example.test/security",
    attributes: { href: "https://bit.ly/synthetic-review" },
  });
  const body = fakeElement({
    innerText: "Please review this Gmail message.",
    closest: () => container,
    queries: { "a[href]": [hiddenLink] },
  });
  context.Element = FakeElement;
  context.getComputedStyle = () => ({ display: "block", visibility: "visible", opacity: "1" });
  context.innerWidth = 1000;
  context.innerHeight = 800;
  context.location = { hostname: "mail.google.com" };
  context.window = { getSelection: () => ({ toString: () => "" }) };
  context.document = {
    activeElement: fakeElement(),
    hasFocus: () => true,
    querySelectorAll: (selector) => selector === ".a3s.aiL" || selector === ".a3s" ? [body] : [],
    querySelector: (selector) => selector === "h2.hP" ? subject : null,
  };
  assert.deepEqual(plain(context.readSelectionFromFrame()), {
    text: "Please review this Gmail message.",
    source: "open_message",
    focused: true,
    subject: "Suspicious invoice",
    sender: "sender@gmail.test",
    viewportScore: 206850,
    links: ["https://bit.ly/synthetic-review"],
    linkPairs: [{
      displayedUrl: "https://portal.example.test/security",
      destinationUrl: "https://bit.ly/synthetic-review",
    }],
  });

  context.document.querySelectorAll = (selector) => selector === ".a3s.aiL" || selector === ".a3s"
    ? [body, fakeElement({ innerText: "A second expanded Gmail message." })]
    : [];
  assert.deepEqual(plain(context.readSelectionFromFrame()), {
    text: "",
    source: "window",
    focused: true,
    errorCode: "multiple_messages",
  });

  const offscreenBody = fakeElement({
    innerText: "An older expanded Gmail message outside the viewport.",
    getBoundingClientRect: () => ({ top: 1_200, bottom: 1_500, left: 10, right: 700 }),
  });
  context.document.querySelectorAll = (selector) => selector === ".a3s.aiL" || selector === ".a3s"
    ? [body, offscreenBody]
    : [];
  assert.equal(
    plain(context.readSelectionFromFrame()).text,
    "Please review this Gmail message.",
    "A clearly dominant in-viewport message should be captured from an expanded thread",
  );

  const outlookSender = fakeElement({ attributes: { title: "alerts@outlook.test" } });
  const outlookSubject = fakeElement({ innerText: "Account notice" });
  const outlookContainer = fakeElement({
    query: {
      "[data-testid='message-subject']": outlookSubject,
      "[data-testid='message-sender'] [title*='@']": outlookSender,
    },
  });
  const outlookBody = fakeElement({ innerText: "Please review this Outlook message.", closest: () => outlookContainer });
  context.location = { hostname: "outlook.office.com" };
  context.document = {
    activeElement: fakeElement(),
    hasFocus: () => true,
    querySelectorAll: (selector) => selector === "[data-testid='message-body']" ? [outlookBody] : [],
    querySelector: () => null,
  };
  assert.deepEqual(plain(context.readSelectionFromFrame()), {
    text: "Please review this Outlook message.",
    source: "open_message",
    focused: true,
    subject: "Account notice",
    sender: "alerts@outlook.test",
    viewportScore: 206850,
  });

  const outlookGenericWrapper = fakeElement({ innerText: "Please review this Outlook message." });
  context.document.querySelectorAll = (selector) => {
    if (selector === "[data-testid='message-body']") return [outlookBody];
    if (selector === "[role='document']" || selector === ".allowTextSelection") return [outlookGenericWrapper];
    return [];
  };
  assert.equal(
    plain(context.readSelectionFromFrame()).text,
    "Please review this Outlook message.",
    "nested fallback containers for one Outlook message must not be treated as multiple expanded messages",
  );

  const secondOutlookBody = fakeElement({ innerText: "A genuinely second expanded Outlook message." });
  context.document.querySelectorAll = (selector) => selector === "[data-testid='message-body']"
    ? [outlookBody, secondOutlookBody]
    : [];
  assert.deepEqual(plain(context.readSelectionFromFrame()), {
    text: "",
    source: "window",
    focused: true,
    errorCode: "multiple_messages",
  });

  context.window = { getSelection: () => ({ toString: () => "Only analyze this sentence" }) };
  assert.deepEqual(plain(context.readSelectionFromFrame()), {
    text: "Only analyze this sentence",
    source: "window",
    focused: true,
  });
}

function testInactiveInputSelectionFallback() {
  const { context } = createWorkerContext();
  const selectedInput = fakeElement({
    tagName: "TEXTAREA",
    value: "Before framed selection after",
    selectionStart: 7,
    selectionEnd: 23,
  });
  context.location = { hostname: "example.test" };
  context.window = { getSelection: () => ({ toString: () => "" }) };
  context.document = {
    activeElement: fakeElement(),
    hasFocus: () => false,
    querySelectorAll: (selector) => selector === "input, textarea" ? [selectedInput] : [],
  };

  assert.deepEqual(plain(context.readSelectionFromFrame()), {
    text: "framed selection",
    source: "input",
    focused: false,
  });

  context.document.querySelectorAll = (selector) => selector === "input, textarea"
    ? [selectedInput, fakeElement({
        tagName: "TEXTAREA",
        value: "second selection",
        selectionStart: 0,
        selectionEnd: 6,
      })]
    : [];
  assert.deepEqual(plain(context.readSelectionFromFrame()), {
    text: "",
    source: "window",
    focused: false,
  });
}

function createPanelElement() {
  const listeners = new Map();
  const attributes = new Map();
  return {
    value: "",
    checked: false,
    disabled: false,
    hidden: false,
    type: "password",
    textContent: "",
    dataset: {},
    style: {},
    addEventListener(type, listener) { listeners.set(type, listener); },
    async dispatch(type) { return listeners.get(type)?.(); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    children: [],
    replaceChildren(...children) { this.children = children; },
    setAttribute(name, value) { attributes.set(name, String(value)); },
  };
}

function createStreamingJsonResponse(payload, status, { chunks, contentLength } = {}) {
  const responseChunks = chunks || [new TextEncoder().encode(JSON.stringify(payload))];
  let index = 0;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return name.toLowerCase() === "content-length" ? contentLength ?? null : null;
      },
    },
    body: {
      getReader() {
        return {
          async read() {
            if (index >= responseChunks.length) return { done: true };
            return { done: false, value: responseChunks[index++] };
          },
          async cancel() {},
          releaseLock() {},
        };
      },
    },
  };
}

async function testPanelSendsCapturedLinkMetadata() {
  const runtime = event();
  const ids = ["scannerView", "settingsView", "settingsToggle", "settingsBack", "settingsHeading", "capture", "captureHelp", "captureHelpToggle", "reviewStep", "subject", "sender", "body", "endpoint", "save", "reset", "destination", "analyze", "status", "settingsStatus", "result", "score", "level", "classification", "explanation", "coverageSection", "coverageSummary", "coverage", "factors", "signals", "action"];
  const elements = new Map(ids.map((id) => [id, createPanelElement()]));
  elements.get("settingsView").hidden = true;
  // Credentials left behind by the account-based 0.4.x releases must be wiped on start-up.
  const localStorage = { apiKey: `mlm_${"a".repeat(43)}`, apiKeyExpiresAt: "2027-01-01T00:00:00.000Z", connectionKind: "browser", browserConnectionId: "mlb_12345678123441238123123456789abc" };
  const sessionStorage = { apiKey: `mlm_${"b".repeat(43)}`, extensionPairing: { endpoint: "https://app.maillume.io" } };
  const getStored = (storage, keys) => Object.fromEntries(keys.filter((key) => storage[key] !== undefined).map((key) => [key, storage[key]]));
  const setStored = async (storage, values) => { Object.assign(storage, values); };
  const removeStored = async (storage, keys) => { keys.forEach((key) => { delete storage[key]; }); };
  const responses = [
    {
      status: "success",
      text: "Captured once",
      source: "open_message",
      subject: "Synthetic account review",
      sender: "alerts@notice.example",
      links: ["https://bit.ly/synthetic-review"],
      linkPairs: [{
        displayedUrl: "https://portal.example.test/security",
        destinationUrl: "https://bit.ly/synthetic-review",
      }],
      captureId: "capture-7",
    },
    { status: "error", code: "handoff_missing" },
  ];
  let requestPayload;
  const validResponse = {
    result: {
      classification: "uncertain",
      risk_level: "low",
      risk_score: 0,
      score_factors: [],
      suspicious_signals: [],
      detected_links: [],
      recommended_action: "Review the message.",
      short_explanation: "No strong signal.",
      evidence_coverage: {
        subject_available: true,
        sender_available: true,
        full_content_available: true,
        link_destinations_available: true,
        authentication_results_available: false,
        attachment_evidence_available: false,
        extraction_type: "direct",
      },
    },
    analysis_mode: "heuristic",
    analysis_provider: "heuristic",
    analysis_version: "analysis-v12",
    disclaimer: "This is an automated risk assessment.",
    privacy: {
      stored: false,
      retention: "not_stored",
      message: "Scan content is not stored.",
    },
  };
  let responsePayload = validResponse;
  let responseStatus = 200;
  let responseChunks;
  let responseContentLength;
  let permissionGranted = true;
  let requestHeaders;
  let requestCount = 0;
  let requestedOrigins;
  const context = {
    chrome: {
      i18n: { getUILanguage: () => "en-US" },
      runtime: {
        id: "bjiiailjalkfjimkjdikoockjlnjolle",
        getManifest: () => ({ version: "0.5.0" }),
        onMessage: runtime,
        sendMessage: async () => responses.shift(),
      },
      storage: {
        local: { get: async (keys) => getStored(localStorage, keys), set: async (values) => setStored(localStorage, values), remove: async (keys) => removeStored(localStorage, keys) },
        session: { get: async (keys) => getStored(sessionStorage, keys), set: async (values) => setStored(sessionStorage, values), remove: async (keys) => removeStored(sessionStorage, keys) },
      },
      permissions: { request: async ({ origins }) => { requestedOrigins = origins; return permissionGranted; }, remove: async () => true },
      tabs: {
        query: async () => [{ id: 22 }],
      },
    },
    document: {
      documentElement: { lang: "en" },
      getElementById: (id) => elements.get(id),
      querySelectorAll: () => [],
      createElement: () => createPanelElement(),
    },
    clearTimeout,
    console,
    crypto: { randomUUID: () => "12345678-1234-4123-8123-123456789abc" },
    fetch: async (url, options = {}) => {
      requestCount += 1;
      assert.equal(url, `${localStorage.endpoint ?? "https://app.maillume.io"}/api/v1/analyze`);
      requestPayload = JSON.parse(options.body);
      requestHeaders = options.headers;
      return createStreamingJsonResponse(responsePayload, responseStatus, {
        chunks: responseChunks,
        contentLength: responseContentLength,
      });
    },
    setTimeout,
    TextDecoder,
    Uint8Array,
    URL,
  };
  vm.createContext(context);
  loadPanelScripts(context);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await flush();
  assert.equal(elements.get("body").value, "Captured once");
  await elements.get("settingsToggle").dispatch("click");
  assert.equal(elements.get("scannerView").hidden, true, "settings must replace the scanner view instead of expanding it");
  assert.equal(elements.get("settingsView").hidden, false);
  assert.equal(elements.get("settingsToggle").getAttribute("aria-expanded"), "true");
  await elements.get("settingsBack").dispatch("click");
  assert.equal(elements.get("scannerView").hidden, false);
  assert.equal(elements.get("settingsView").hidden, true);
  assert.equal(elements.get("settingsToggle").getAttribute("aria-expanded"), "false");
  for (const key of ["apiKey", "apiKeyExpiresAt", "connectionKind", "browserConnectionId"]) {
    assert.equal(localStorage[key], undefined, `legacy ${key} must be removed from local storage`);
  }
  assert.equal(sessionStorage.apiKey, undefined, "a legacy session key must be removed");
  assert.equal(sessionStorage.extensionPairing, undefined, "a legacy pairing must be removed");
  assert.equal(elements.get("endpoint").value, "https://app.maillume.io");
  assert.equal(elements.get("reset").hidden, true, "the default deployment needs no restore action");

  elements.get("endpoint").value = "not a url";
  await elements.get("save").dispatch("click");
  assert.equal(elements.get("status").textContent, "Enter an HTTPS deployment URL, or an HTTP localhost URL for local testing.");
  elements.get("endpoint").value = "https://maillume.example.test/";
  await elements.get("save").dispatch("click");
  assert.equal(localStorage.endpoint, "https://maillume.example.test");
  assert.equal(elements.get("status").textContent, "Deployment saved: https://maillume.example.test");
  assert.equal(elements.get("reset").hidden, false);
  await elements.get("reset").dispatch("click");
  assert.equal(localStorage.endpoint, undefined, "restoring the default must not store a redundant endpoint");
  assert.equal(elements.get("endpoint").value, "https://app.maillume.io");
  assert.equal(elements.get("status").textContent, "Restored the default deployment, app.maillume.io.");
  await elements.get("settingsBack").dispatch("click");

  permissionGranted = false;
  await elements.get("analyze").dispatch("click");
  assert.deepEqual(plain(requestedOrigins), ["https://app.maillume.io/*"]);
  assert.equal(requestCount, 0, "nothing may be sent without the deployment permission");
  assert.equal(elements.get("status").textContent, "Chrome did not grant access to the Maillume deployment, so the message was not sent.");
  assert.equal(elements.get("analyze").disabled, false, "a denied permission must leave analysis available to retry");
  permissionGranted = true;
  await elements.get("captureHelpToggle").dispatch("click");
  assert.equal(elements.get("captureHelp").hidden, true);
  assert.equal(elements.get("captureHelpToggle").textContent, "Show instructions");
  await elements.get("captureHelpToggle").dispatch("click");
  assert.equal(elements.get("captureHelp").hidden, false);
  await elements.get("analyze").dispatch("click");
  assert.deepEqual(requestPayload, {
    source: "chrome",
    subject: "Synthetic account review",
    senderEmail: "alerts@notice.example",
    body: "Captured once",
    locale: "en",
    links: ["https://bit.ly/synthetic-review"],
    linkPairs: [{
      displayedUrl: "https://portal.example.test/security",
      destinationUrl: "https://bit.ly/synthetic-review",
    }],
  });
  assert.equal(requestHeaders.Authorization, undefined, "anonymous analysis must not send a credential");
  assert.equal(requestHeaders["X-Maillume-Extension-Version"], "0.5.0");
  assert.equal(requestHeaders["X-Maillume-Extension-Id"], "bjiiailjalkfjimkjdikoockjlnjolle");
  assert.equal(requestHeaders["X-Maillume-Analysis-Versions"].includes("analysis-v12"), true);
  assert.equal(elements.get("reviewStep").hidden, true, "successful analysis must collapse the captured-detail step");
  assert.equal(elements.get("analyze").hidden, true, "successful analysis must replace the analyze action with the result");
  assert.equal(elements.get("result").hidden, false);
  assert.equal(elements.get("level").dataset.level, "low");
  assert.equal(elements.get("coverageSection").hidden, false);
  assert.equal(
    elements.get("coverageSummary").textContent,
    "Maillume received the main message evidence needed for this assessment.",
  );
  assert.equal(elements.get("coverage").children.length, 7);

  assert.equal(context.isAnalysisResponse(validResponse), true);
  assert.equal(context.isAnalysisResponse({
    ...validResponse,
    analysis_version: "analysis-v8",
    result: {
      ...validResponse.result,
      evidence_coverage: undefined,
    },
  }), true, "the new panel must remain compatible with a pre-coverage analysis-v8 deployment");
  assert.equal(context.isAnalysisResponse({
    ...validResponse,
    analysis_version: "analysis-v9",
    result: {
      ...validResponse.result,
      evidence_coverage: undefined,
    },
  }), false, "coverage must remain required for analysis-v9");
  for (const invalidResponse of [
    { ...validResponse, analysis_version: "analysis-v2.0" },
    { ...validResponse, privacy: { ...validResponse.privacy, stored: true } },
    { ...validResponse, privacy: { ...validResponse.privacy, retention: "temporary" } },
    { ...validResponse, analysis_provider: "unknown" },
    {
      ...validResponse,
      result: {
        ...validResponse.result,
        evidence_coverage: undefined,
      },
    },
    {
      ...validResponse,
      result: {
        ...validResponse.result,
        evidence_coverage: {
          ...validResponse.result.evidence_coverage,
          full_content_available: "yes",
        },
      },
    },
    {
      ...validResponse,
      result: {
        ...validResponse.result,
        suspicious_signals: Array(101).fill("Too many signals"),
      },
    },
    {
      ...validResponse,
      result: {
        ...validResponse.result,
        short_explanation: "x".repeat(2_049),
      },
    },
  ]) {
    assert.equal(context.isAnalysisResponse(invalidResponse), false);
  }

  responsePayload = { ...validResponse, analysis_version: "analysis-v2.0" };
  await elements.get("analyze").dispatch("click");
  assert.equal(elements.get("result").hidden, true, "the panel must reject an invalid API envelope");
  assert.equal(elements.get("status").textContent, "The extension and deployment use different analysis versions. Update the extension from the official source, then reload it in chrome://extensions.");

  responsePayload = validResponse;
  responseContentLength = String(256 * 1024 + 1);
  await elements.get("analyze").dispatch("click");
  assert.equal(elements.get("result").hidden, true, "an oversized declared response must not reach rendering");
  assert.equal(elements.get("status").textContent, "The deployment returned an analysis response that is too large to display safely.");

  responseContentLength = "1";
  responseChunks = [new Uint8Array(256 * 1024 + 1)];
  await elements.get("analyze").dispatch("click");
  assert.equal(elements.get("result").hidden, true, "an oversized streamed response with a false Content-Length must not reach parsing or rendering");
  assert.equal(elements.get("status").textContent, "The deployment returned an analysis response that is too large to display safely.");

  responseContentLength = undefined;
  await elements.get("analyze").dispatch("click");
  assert.equal(elements.get("result").hidden, true, "an oversized streamed response without Content-Length must not reach parsing or rendering");
  assert.equal(elements.get("status").textContent, "The deployment returned an analysis response that is too large to display safely.");
  responseChunks = undefined;

  context.renderResult({
    ...validResponse.result,
    short_explanation: "x".repeat(2_048 + 1),
    score_factors: Array.from({ length: 100 + 1 }, () => ({
      id: "factor", family: "style", contribution: 1, label: "x".repeat(2_048 + 1),
    })),
    suspicious_signals: Array(100 + 1).fill("x".repeat(2_048 + 1)),
  });
  assert.equal(elements.get("factors").children.length, 100, "rendering must cap factor nodes even if validation is bypassed");
  assert.equal(elements.get("signals").children.length, 100, "rendering must cap signal nodes even if validation is bypassed");
  assert.equal(elements.get("explanation").textContent.length, 2_048, "rendering must cap direct text even if validation is bypassed");

  runtime.listener({ type: "capture-ready", tabId: 22, captureId: "capture-7" });
  await flush();
  assert.equal(elements.get("body").value, "Captured once", "a duplicate consumer must not erase a successful capture");

  responses.push({
    status: "success",
    text: "Freshly captured message",
    source: "selection",
    subject: "Fresh capture",
    sender: "fresh@notice.example",
    captureId: "capture-8",
  });
  runtime.listener({ type: "capture-started", tabId: 22, captureId: "capture-8" });
  await flush();
  assert.equal(elements.get("reviewStep").hidden, false, "a new capture must restore the captured-detail step");
  assert.equal(elements.get("result").hidden, true, "a new capture must clear the previous result");
  runtime.listener({ type: "capture-ready", tabId: 22, captureId: "capture-8" });
  await flush();
  assert.equal(elements.get("body").value, "Freshly captured message");

  responsePayload = validResponse;
  responseStatus = 401;
  await elements.get("analyze").dispatch("click");
  assert.equal(
    requestPayload.evidenceTruncated,
    true,
    "selected text must be marked as incomplete evidence",
  );
  assert.equal(elements.get("result").hidden, true, "an error must not leave a stale result visible");
  assert.equal(elements.get("status").textContent, "The deployment returned HTTP 401.");

  responseStatus = 429;
  await elements.get("analyze").dispatch("click");
  assert.equal(elements.get("result").hidden, true, "a rate-limit response must not leave a stale result visible");
  assert.equal(elements.get("status").textContent, "Too many analyses in a short time. Wait a minute and try again.");
}


(async () => {
  await testCapturePriorityAndMetadata();
  await testCaptureRecoversAfterWorkerRestart();
  await testCaptureBoundaries();
  testOpenMessageExtractors();
  testInactiveInputSelectionFallback();
  await testPanelSendsCapturedLinkMetadata();
  console.log("Browser extension capture, deployment, anonymous analysis, API-response, and handoff checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
