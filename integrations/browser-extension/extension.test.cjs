/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const extensionDir = __dirname;

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
      sidePanel: { setOptions: async () => {}, open: async () => {} },
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
    setTimeout: () => 1,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(extensionDir, "service-worker.js"), "utf8"), context);
  return { context, events, setFrameResults(value) { frameResults = value; } };
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
  worker.events.updated.listener(10, { url: "https://mail.google.com/mail/u/0/#inbox/next" });
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
    disabled: false,
    hidden: false,
    textContent: "",
    dataset: {},
    style: {},
    addEventListener(type, listener) { listeners.set(type, listener); },
    async dispatch(type) { return listeners.get(type)?.(); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    replaceChildren() {},
    setAttribute(name, value) { attributes.set(name, String(value)); },
  };
}

async function testPanelSendsCapturedLinkMetadata() {
  const runtime = event();
  const ids = ["capture", "captureHelp", "captureHelpToggle", "reviewStep", "subject", "sender", "body", "endpoint", "apiKey", "save", "reset", "destination", "analyze", "status", "result", "score", "level", "classification", "explanation", "factors", "signals", "action"];
  const elements = new Map(ids.map((id) => [id, createPanelElement()]));
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
    },
    analysis_mode: "heuristic",
    analysis_provider: "heuristic",
    analysis_version: "analysis-v4",
    disclaimer: "This is an automated risk assessment.",
    privacy: {
      stored: false,
      retention: "not_stored",
      message: "Scan content is not stored.",
    },
  };
  let responsePayload = validResponse;
  const context = {
    chrome: {
      i18n: { getUILanguage: () => "en-US" },
      runtime: { onMessage: runtime, sendMessage: async () => responses.shift() },
      storage: {
        local: { get: async () => ({ endpoint: "https://app.maillume.io" }), set: async () => {}, remove: async () => {} },
        session: { get: async () => ({ apiKey: `mlm_${"a".repeat(43)}` }), set: async () => {}, remove: async () => {} },
      },
      permissions: { request: async () => true, remove: async () => true },
      tabs: { query: async () => [{ id: 22 }] },
    },
    document: {
      documentElement: { lang: "en" },
      getElementById: (id) => elements.get(id),
      querySelectorAll: () => [],
      createElement: () => createPanelElement(),
    },
    clearTimeout,
    console,
    fetch: async (_url, options) => {
      requestPayload = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => responsePayload,
      };
    },
    setTimeout,
    URL,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(extensionDir, "sidepanel.js"), "utf8"), context);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await flush();
  assert.equal(elements.get("body").value, "Captured once");
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
  assert.equal(elements.get("reviewStep").hidden, true, "successful analysis must collapse the captured-detail step");
  assert.equal(elements.get("analyze").hidden, true, "successful analysis must replace the analyze action with the result");
  assert.equal(elements.get("result").hidden, false);
  assert.equal(elements.get("level").dataset.level, "low");

  assert.equal(context.isAnalysisResponse(validResponse), true);
  for (const invalidResponse of [
    { ...validResponse, analysis_version: "analysis-v2.0" },
    { ...validResponse, privacy: { ...validResponse.privacy, stored: true } },
    { ...validResponse, privacy: { ...validResponse.privacy, retention: "temporary" } },
    { ...validResponse, analysis_provider: "unknown" },
  ]) {
    assert.equal(context.isAnalysisResponse(invalidResponse), false);
  }

  responsePayload = { ...validResponse, analysis_version: "analysis-v2.0" };
  await elements.get("analyze").dispatch("click");
  assert.equal(elements.get("result").hidden, true, "the panel must reject an invalid API envelope");
  assert.equal(elements.get("status").textContent, "The deployment returned an invalid analysis response.");

  runtime.listener({ type: "capture-ready", tabId: 22, captureId: "capture-7" });
  await flush();
  assert.equal(elements.get("body").value, "Captured once", "a duplicate consumer must not erase a successful capture");

  responses.push({
    status: "success",
    text: "Freshly captured message",
    source: "open_message",
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
}

(async () => {
  await testCapturePriorityAndMetadata();
  await testCaptureRecoversAfterWorkerRestart();
  testOpenMessageExtractors();
  testInactiveInputSelectionFallback();
  await testPanelSendsCapturedLinkMetadata();
  console.log("Browser extension capture, fallback, and handoff race checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
