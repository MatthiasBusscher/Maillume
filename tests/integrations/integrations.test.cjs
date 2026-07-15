/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function createEvent() {
  return {
    listener: undefined,
    addListener(callback) { this.listener = callback; },
  };
}

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

async function testBrowserServiceWorker() {
  const onInstalled = createEvent();
  const onStartup = createEvent();
  const onMessage = createEvent();
  const onActionClicked = createEvent();
  const onTabUpdated = createEvent();
  const onTabRemoved = createEvent();
  const panelOptions = [];
  const openedPanels = [];
  const runtimeMessages = [];
  let scriptRequest;
  let scriptExecutions = 0;
  let captureSequence = 0;

  const chrome = {
    runtime: {
      onInstalled,
      onStartup,
      onMessage,
      sendMessage: async (message) => { runtimeMessages.push(message); },
    },
    action: { onClicked: onActionClicked },
    tabs: { onUpdated: onTabUpdated, onRemoved: onTabRemoved },
    sidePanel: {
      setOptions: async (options) => { panelOptions.push(options); },
      open: async (options) => { openedPanels.push(options); },
    },
    scripting: {
      executeScript: async (request) => {
        scriptExecutions += 1;
        scriptRequest = request;
        return [
          { frameId: 0, result: { text: "Old window selection", source: "window", focused: false } },
          { frameId: 7, result: { text: "Selected from framed input", source: "input", focused: true } },
        ];
      },
    },
  };
  const context = {
    chrome,
    console,
    crypto: { randomUUID: () => `capture-${++captureSequence}` },
    Date,
    Map,
    Number,
    Promise,
    setTimeout: () => 1,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("integrations/browser-extension/service-worker.js", "utf8"), context);

  assert.deepEqual(plain(panelOptions[0]), { enabled: false }, "the global side panel must be disabled");
  assert.equal(typeof onActionClicked.listener, "function");
  await onActionClicked.listener({ id: 17, url: "https://mail.example.test/message" });

  assert.equal(scriptExecutions, 1);
  assert.deepEqual(plain(scriptRequest.target), { tabId: 17, allFrames: true });
  assert.equal(scriptRequest.func, context.readSelectionFromFrame);
  assert.ok(panelOptions.some((options) => options.tabId === 17 && options.enabled && options.path === "sidepanel.html"));
  assert.deepEqual(plain(openedPanels), [{ tabId: 17 }]);
  assert.deepEqual(runtimeMessages.map(({ type }) => type), ["capture-started", "capture-ready"]);

  let response;
  onMessage.listener({ type: "consume-capture", tabId: 17 }, {}, (value) => { response = value; });
  assert.equal(response.status, "success");
  assert.equal(response.text, "Selected from framed input");
  onMessage.listener({ type: "consume-capture", tabId: 17 }, {}, (value) => { response = value; });
  assert.deepEqual(plain(response), { status: "error", code: "handoff_missing" }, "capture handoff must be one-time");

  await onActionClicked.listener({ id: 18, url: "chrome://settings/" });
  assert.equal(scriptExecutions, 1, "restricted browser pages must not receive injected scripts");
  onMessage.listener({ type: "consume-capture", tabId: 18 }, {}, (value) => { response = value; });
  assert.deepEqual(plain(response), { status: "error", code: "restricted_page" });

  await onActionClicked.listener({ id: 19, url: "https://mail.example.test/next" });
  onTabUpdated.listener(19, { status: "loading" });
  await flush();
  onMessage.listener({ type: "consume-capture", tabId: 19 }, {}, (value) => { response = value; });
  assert.deepEqual(plain(response), { status: "error", code: "handoff_missing" }, "navigation must clear stale captures");
  assert.ok(panelOptions.some((options) => options.tabId === 19 && options.enabled === false));

  context.document = {
    activeElement: { tagName: "INPUT", value: "before SELECTED after", selectionStart: 7, selectionEnd: 15 },
    hasFocus: () => true,
  };
  context.window = { getSelection: () => ({ toString: () => "window text" }) };
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.readSelectionFromFrame())),
    { text: "SELECTED", source: "input", focused: true },
  );
  context.document.activeElement = { tagName: "DIV" };
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.readSelectionFromFrame())),
    { text: "window text", source: "window", focused: true },
  );
}

function createElement() {
  return {
    value: "",
    disabled: false,
    hidden: false,
    textContent: "",
    dataset: {},
    style: {},
    children: [],
    addEventListener() {},
    replaceChildren(...children) { this.children = children; },
  };
}

async function testBrowserSidePanel() {
  let browserLocale = "en-US";
  let queriedTabId = 17;
  let captureResponse = { status: "success", text: "Synthetic selected message" };
  const manifest = JSON.parse(fs.readFileSync("integrations/browser-extension/manifest.json", "utf8"));
  assert.equal(manifest.minimum_chrome_version, "116");
  assert.equal(manifest.default_locale, "en");
  assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "sidePanel", "storage"]);
  assert.ok(fs.existsSync("integrations/browser-extension/_locales/en/messages.json"));
  assert.ok(fs.existsSync("integrations/browser-extension/_locales/nl/messages.json"));

  const listeners = new Map();
  const runtimeEvent = createEvent();
  const elements = new Map();
  const ids = ["subject", "sender", "body", "endpoint", "apiKey", "save", "reset", "destination", "analyze", "status", "result", "score", "level", "classification", "explanation", "factors", "signals", "action"];
  for (const id of ids) {
    const element = createElement();
    element.addEventListener = (type, callback) => listeners.set(`${id}:${type}`, callback);
    elements.set(id, element);
  }
  elements.get("endpoint").value = "https://app.maillume.io";

  const removedOrigins = [];
  const requestedOrigins = [];
  let removalFailureOrigin = "";
  const localStorage = { endpoint: "https://old.example" };
  const sessionStorage = { apiKey: `mlm_${"a".repeat(43)}` };
  const storageWrites = [];
  const createStorageArea = (area, name) => ({
    get: async () => ({ ...area }),
    set: async (value) => { storageWrites.push({ name, value }); Object.assign(area, value); },
    remove: async (keys) => keys.forEach((key) => delete area[key]),
  });
  const chrome = {
    i18n: { getUILanguage: () => browserLocale },
    runtime: {
      onMessage: runtimeEvent,
      sendMessage: async (message) => message.type === "consume-capture" ? captureResponse : undefined,
    },
    permissions: {
      request: async ({ origins }) => { requestedOrigins.push(...origins); return true; },
      remove: async ({ origins }) => {
        removedOrigins.push(...origins);
        return !origins.includes(removalFailureOrigin);
      },
    },
    storage: {
      local: createStorageArea(localStorage, "local"),
      session: createStorageArea(sessionStorage, "session"),
    },
    tabs: { query: async () => [{ id: queriedTabId }] },
  };
  const document = {
    documentElement: { lang: "en" },
    getElementById: (id) => elements.get(id),
    querySelectorAll: () => [],
    createElement: () => ({ textContent: "" }),
  };
  const context = { chrome, document, URL, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("integrations/browser-extension/sidepanel.js", "utf8"), context);
  await flush();

  assert.equal(elements.get("body").value, "Synthetic selected message");
  assert.equal(elements.get("endpoint").value, "https://old.example");
  assert.equal(elements.get("apiKey").value, sessionStorage.apiKey);
  assert.equal(elements.get("analyze").disabled, false);
  assert.equal(elements.get("result").hidden, true);

  queriedTabId = 18;
  runtimeEvent.listener({ type: "capture-started", tabId: 18 });
  await flush();
  assert.equal(elements.get("body").value, "Synthetic selected message", "a hidden panel must not consume another tab's capture");
  queriedTabId = 17;

  elements.get("endpoint").value = "https://new.example";
  elements.get("apiKey").value = `mlm_${"b".repeat(43)}`;
  listeners.get("endpoint:input")();
  assert.equal(elements.get("analyze").disabled, true, "unsaved endpoint edits must not be usable");

  await listeners.get("save:click")();
  assert.deepEqual(requestedOrigins, ["https://new.example/*"]);
  assert.equal(localStorage.endpoint, "https://new.example");
  assert.equal(localStorage.apiKey, undefined, "API keys must never enter local storage");
  assert.equal(sessionStorage.apiKey, `mlm_${"b".repeat(43)}`);
  assert.equal(sessionStorage.endpoint, undefined, "deployment URLs belong in local storage");
  assert.ok(storageWrites.some(({ name, value }) => name === "local" && Object.keys(value).join() === "endpoint"));
  assert.ok(storageWrites.some(({ name, value }) => name === "session" && Object.keys(value).join() === "apiKey"));
  assert.deepEqual(removedOrigins, ["https://old.example/*"], "old deployment permission must be revoked");
  assert.equal(elements.get("analyze").disabled, false);

  removalFailureOrigin = "https://new.example/*";
  elements.get("endpoint").value = "https://third.example";
  elements.get("apiKey").value = `mlm_${"c".repeat(43)}`;
  listeners.get("endpoint:input")();
  await listeners.get("save:click")();
  assert.equal(localStorage.endpoint, "https://new.example", "failed permission revocation must roll back the endpoint");
  assert.equal(sessionStorage.apiKey, `mlm_${"b".repeat(43)}`, "failed permission revocation must roll back the session key");
  assert.match(elements.get("status").textContent, /previous deployment permission could not be removed/);
  assert.ok(removedOrigins.includes("https://third.example/*"), "the uncommitted origin grant must be removed");
  removalFailureOrigin = "";

  browserLocale = "nl-NL";
  runtimeEvent.listener({ type: "capture-started", tabId: 17 });
  await flush();
  assert.equal(elements.get("body").value, "", "a new toolbar action must clear stale message data");
  assert.equal(elements.get("result").hidden, true);
  captureResponse = { status: "error", code: "no_selection" };
  runtimeEvent.listener({ type: "capture-ready", tabId: 17 });
  await flush();
  assert.match(elements.get("status").textContent, /^Er is geen geselecteerde tekst gevonden/);
  browserLocale = "en-US";

  assert.equal(context.isAnalysisResult({
    classification: "likely_phishing",
    risk_level: "high",
    risk_score: 82,
    score_factors: [
      { id: "synthetic-destination", family: "destination", contribution: 30, label: "Synthetic destination warning" },
      { id: "synthetic-intent", family: "intent", contribution: 30, label: "Synthetic intent warning" },
      { id: "synthetic-identity", family: "identity", contribution: 22, label: "Synthetic identity warning" },
    ],
    suspicious_signals: ["Synthetic warning"],
    detected_links: ["https://example.test/login"],
    recommended_action: "Verify.",
    short_explanation: "Suspicious.",
  }), true);
  assert.equal(context.isAnalysisResult({
    classification: "likely_phishing",
    risk_level: "high",
    risk_score: 82,
    score_factors: [{ id: "synthetic", family: "intent", contribution: 82, label: "Synthetic warning" }],
    suspicious_signals: [],
    detected_links: ["javascript:alert(1)"],
    recommended_action: "Verify.",
    short_explanation: "Suspicious.",
  }), false, "detected_links must contain only HTTP(S) URLs");
  assert.equal(context.isAnalysisResult({
    classification: "likely_phishing",
    risk_level: "high",
    risk_score: 82,
    score_factors: [{ id: "synthetic", family: "intent", contribution: 82, label: "Synthetic warning" }],
    suspicious_signals: [],
    recommended_action: "Verify.",
    short_explanation: "Suspicious.",
  }), false, "detected_links is required");

  await listeners.get("reset:click")();
  assert.equal(localStorage.endpoint, undefined);
  assert.equal(sessionStorage.apiKey, undefined);
  assert.ok(removedOrigins.includes("https://new.example/*"), "reset must revoke the active deployment permission");
  assert.equal(elements.get("body").value, "");

  const sidePanelSource = fs.readFileSync("integrations/browser-extension/sidepanel.js", "utf8");
  assert.doesNotMatch(sidePanelSource, /chrome\.scripting/, "the panel must not capture after activeTab expires");
  assert.doesNotMatch(fs.readFileSync("integrations/browser-extension/sidepanel.html", "utf8"), /id="capture"/);
}

function fluent() {
  const calls = {};
  const proxy = new Proxy({}, { get(_current, property) {
    if (property === "build") return () => proxy;
    if (property === "__calls") return calls;
    return (...args) => {
      (calls[property] ||= []).push(args);
      return proxy;
    };
  } });
  return proxy;
}

function testGmailAddOn() {
  let messageReads = 0;
  let fetches = 0;
  let requestPayload;
  const userProperties = new Map([["MAILLUME_API_KEY", `mlm_${"a".repeat(43)}`]]);
  const context = {
    PropertiesService: { getUserProperties: () => ({
      getProperty: (key) => userProperties.get(key) ?? null,
      setProperty: (key, value) => userProperties.set(key, value),
      deleteProperty: (key) => userProperties.delete(key),
    }) },
    GmailApp: {
      setCurrentMessageAccessToken() {},
      getMessageById() {
        messageReads += 1;
        return { getSubject: () => "Test", getFrom: () => "sender@example.com", getPlainBody: () => "Synthetic body" };
      },
    },
    UrlFetchApp: { fetch(_url, options) {
      fetches += 1;
      requestPayload = JSON.parse(options.payload);
      return { getResponseCode: () => 500, getContentText: () => JSON.stringify({ error: "Unavailable" }) };
    } },
    CardService: new Proxy({ TextButtonStyle: { FILLED: "FILLED" } }, { get(target, property) {
      if (property in target) return target[property];
      return () => fluent();
    } }),
    console,
  };
  vm.createContext(context);
  const gmailSource = fs.readFileSync("integrations/gmail-addon/Code.gs", "utf8");
  vm.runInContext(gmailSource, context);

  assert.match(gmailSource, /PropertiesService\.getUserProperties\(\)/, "the API key must be stored per Google user");
  assert.doesNotMatch(gmailSource, /CacheService/, "the API key must not silently expire after six hours");
  assert.doesNotMatch(gmailSource, /setPropert(?:y|ies)\([^\n]*(?:body|subject|sender|message|result)/i, "message data must not be persisted");
  assert.equal(messageReads, 0, "loading the add-on must not read a message");
  assert.equal(fetches, 0, "loading the add-on must not call Maillume");
  const manifest = JSON.parse(fs.readFileSync("integrations/gmail-addon/appsscript.json", "utf8"));
  assert.deepEqual(manifest.oauthScopes, [
    "https://www.googleapis.com/auth/gmail.addons.execute",
    "https://www.googleapis.com/auth/gmail.addons.current.message.action",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.locale",
  ]);

  context.analyzeCurrentMessage({ commonEventObject: { userLocale: "nl-NL" }, gmail: { accessToken: "token", messageId: "message" } });
  assert.equal(messageReads, 1, "Analyze must read only the current message once");
  assert.equal(fetches, 1, "Analyze must make one assessment request");
  assert.deepEqual(JSON.parse(JSON.stringify(requestPayload)), {
    source: "paste", subject: "Test", senderEmail: "sender@example.com", body: "Synthetic body", locale: "nl",
  });

  const replacementKey = `mlm_${"b".repeat(43)}`;
  context.saveApiKey({
    commonEventObject: {
      userLocale: "en-US",
      formInputs: { apiKey: { stringInputs: { value: [replacementKey] } } },
    },
  });
  assert.equal(userProperties.get("MAILLUME_API_KEY"), replacementKey);

  const resultCard = context.buildResultCard({
    classification: "likely_phishing", risk_level: "high", risk_score: 82,
    score_factors: [
      { id: "synthetic-destination", family: "destination", contribution: 30, label: "Synthetisch bestemmingssignaal" },
      { id: "synthetic-intent", family: "intent", contribution: 30, label: "Synthetisch intentiesignaal" },
      { id: "synthetic-identity", family: "identity", contribution: 22, label: "Synthetisch identiteitssignaal" },
    ],
    suspicious_signals: ["Synthetisch signaal"], detected_links: [],
    recommended_action: "Controleer via een bekend kanaal.", short_explanation: "Verdacht patroon.",
  }, "nl");
  const resultHeader = resultCard.__calls.setHeader[0][0];
  assert.equal(resultHeader.__calls.setTitle[0][0], "Maillume");
  assert.match(resultHeader.__calls.setSubtitle[0][0], /HOOG/);
  assert.equal(context.isAnalysisResult({
    classification: "likely_phishing", risk_level: "high", risk_score: 82,
    score_factors: [{ id: "synthetic", family: "intent", contribution: 82, label: "Synthetic warning" }], suspicious_signals: [],
    recommended_action: "Verify.", short_explanation: "Suspicious.",
  }), false, "incomplete API results must be rejected");

  context.removeApiKey({ commonEventObject: { userLocale: "nl-NL" } });
  assert.equal(userProperties.has("MAILLUME_API_KEY"), false, "users must be able to remove the saved key");
}

function testOutlookIntegration() {
  const source = fs.readFileSync("src/components/outlook-integration.tsx", "utf8");
  assert.match(source, /window\.sessionStorage\.getItem\("maillume-outlook-api-key"\)/);
  assert.match(source, /window\.sessionStorage\.setItem\("maillume-outlook-api-key"/);
  assert.match(source, /window\.sessionStorage\.removeItem\("maillume-outlook-api-key"\)/);
  assert.doesNotMatch(source, /window\.localStorage/, "the Outlook API key must not outlive the task-pane session");
}

Promise.resolve()
  .then(testBrowserServiceWorker)
  .then(testBrowserSidePanel)
  .then(testGmailAddOn)
  .then(testOutlookIntegration)
  .then(() => console.log("Checked browser, Gmail, and Outlook integration hardening."));
