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

function createWorkerContext() {
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
      tabs: { onUpdated: events.updated, onRemoved: events.removed },
      sidePanel: { setOptions: async () => {}, open: async () => {} },
      scripting: { executeScript: async () => frameResults },
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
  assert.deepEqual(plain(worker.context.consumeCapture(10)), { status: "success", text: "Explicit selection" });

  worker.setFrameResults([
    { frameId: 0, result: { text: "Open Outlook message", source: "open_message", subject: "Payment update", sender: "sender@example.com", focused: true } },
  ]);
  await worker.events.action.listener({ id: 11, url: "https://outlook.office.com/mail/inbox/id/example" });
  assert.deepEqual(plain(worker.context.consumeCapture(11, true)), {
    status: "success",
    text: "Open Outlook message",
    source: "open_message",
    subject: "Payment update",
    sender: "sender@example.com",
    captureId: "capture-2",
  });
}

function fakeElement(options = {}) {
  return Object.assign(new FakeElement(), {
    tagName: "DIV",
    innerText: "",
    textContent: "",
    attributes: {},
    query: {},
    getClientRects: () => [{}],
    getBoundingClientRect: () => ({ top: 100, bottom: 400, left: 10, right: 700 }),
    contains: () => false,
    closest: () => null,
    querySelector(selector) { return this.query[selector] || null; },
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
  const body = fakeElement({ innerText: "Please review this Gmail message.", closest: () => container });
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

function createPanelElement() {
  return {
    value: "",
    disabled: false,
    hidden: false,
    textContent: "",
    dataset: {},
    style: {},
    addEventListener() {},
    replaceChildren() {},
  };
}

async function testDuplicateConsumerDoesNotEraseCapture() {
  const runtime = event();
  const ids = ["subject", "sender", "body", "endpoint", "apiKey", "save", "reset", "destination", "analyze", "status", "result", "score", "level", "classification", "explanation", "factors", "signals", "action"];
  const elements = new Map(ids.map((id) => [id, createPanelElement()]));
  elements.get("endpoint").value = "https://app.maillume.io";
  const responses = [
    { status: "pending", captureId: "capture-7" },
    { status: "success", text: "Captured once", source: "selection", captureId: "capture-7" },
    { status: "error", code: "handoff_missing" },
  ];
  const context = {
    chrome: {
      i18n: { getUILanguage: () => "en-US" },
      runtime: { onMessage: runtime, sendMessage: async () => responses.shift() },
      storage: {
        local: { get: async () => ({}), set: async () => {}, remove: async () => {} },
        session: { get: async () => ({}), set: async () => {}, remove: async () => {} },
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
    fetch,
    setTimeout,
    URL,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(extensionDir, "sidepanel.js"), "utf8"), context);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await flush();
  assert.equal(elements.get("body").value, "Captured once");

  runtime.listener({ type: "capture-ready", tabId: 22, captureId: "capture-7" });
  await flush();
  assert.equal(elements.get("body").value, "Captured once", "a duplicate consumer must not erase a successful capture");
}

(async () => {
  await testCapturePriorityAndMetadata();
  testOpenMessageExtractors();
  await testDuplicateConsumerDoesNotEraseCapture();
  console.log("Browser extension capture, fallback, and handoff race checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
