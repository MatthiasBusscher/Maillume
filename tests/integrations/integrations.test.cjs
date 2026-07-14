/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

async function testBrowserExtension() {
  let browserLocale = "en-US";
  const manifest = JSON.parse(fs.readFileSync("integrations/browser-extension/manifest.json", "utf8"));
  assert.equal(manifest.default_locale, "en");
  assert.ok(fs.existsSync("integrations/browser-extension/_locales/en/messages.json"));
  assert.ok(fs.existsSync("integrations/browser-extension/_locales/nl/messages.json"));
  const listeners = new Map();
  const elements = new Map();
  const ids = ["capture", "subject", "sender", "body", "endpoint", "apiKey", "save", "reset", "destination", "analyze", "status", "result", "score", "level", "explanation", "signals", "action"];
  for (const id of ids) elements.set(id, {
    value: "", disabled: false, hidden: false, textContent: "", dataset: {}, style: {},
    addEventListener(type, callback) { listeners.set(`${id}:${type}`, callback); },
    replaceChildren() {},
  });
  elements.get("endpoint").value = "https://app.maillume.io";
  const removedOrigins = [];
  const stored = { endpoint: "https://old.example", apiKey: `mlm_${"a".repeat(43)}` };
  const chrome = {
    i18n: { getUILanguage: () => browserLocale },
    permissions: {
      request: async () => true,
      remove: async ({ origins }) => { removedOrigins.push(...origins); return true; },
    },
    storage: { local: {
      get: async () => ({ ...stored }),
      set: async (value) => Object.assign(stored, value),
      remove: async (keys) => keys.forEach((key) => delete stored[key]),
    } },
    tabs: { query: async () => [] },
    scripting: { executeScript: async () => [] },
  };
  const document = {
    documentElement: { lang: "en" },
    getElementById: (id) => elements.get(id),
    querySelectorAll: () => [],
    createElement: () => ({ textContent: "" }),
  };
  vm.runInNewContext(fs.readFileSync("integrations/browser-extension/sidepanel.js", "utf8"), { chrome, document, URL, console });
  await new Promise((resolve) => setImmediate(resolve));

  browserLocale = "nl-NL";
  await listeners.get("capture:click")();
  assert.equal(elements.get("status").textContent, "Er is geen actief browsertabblad beschikbaar.");
  browserLocale = "en-US";

  elements.get("body").value = "Synthetic selected message";
  elements.get("endpoint").value = "https://new.example";
  elements.get("apiKey").value = `mlm_${"b".repeat(43)}`;
  listeners.get("endpoint:input")();
  assert.equal(elements.get("analyze").disabled, true, "unsaved endpoint edits must not be usable");

  await listeners.get("save:click")();
  assert.equal(stored.endpoint, "https://new.example");
  assert.deepEqual(removedOrigins, ["https://old.example/*"], "old deployment permission must be revoked");
  assert.equal(elements.get("analyze").disabled, false);

  await listeners.get("reset:click")();
  assert.equal(stored.endpoint, undefined);
  assert.equal(stored.apiKey, undefined);
  assert.ok(removedOrigins.includes("https://new.example/*"), "reset must revoke the active deployment permission");
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
      getProperty: (key) => userProperties.get(key),
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
    UrlFetchApp: { fetch(url, options) {
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
  vm.runInContext(fs.readFileSync("integrations/gmail-addon/Code.gs", "utf8"), context);

  assert.equal(messageReads, 0, "loading the add-on must not read a message");
  assert.equal(fetches, 0, "loading the add-on must not call Maillume");
  const manifest = JSON.parse(fs.readFileSync("integrations/gmail-addon/appsscript.json", "utf8"));
  assert.ok(manifest.oauthScopes.includes("https://www.googleapis.com/auth/gmail.addons.current.message.action"));
  assert.ok(!manifest.oauthScopes.includes("https://www.googleapis.com/auth/gmail.addons.current.message.readonly"));
  context.analyzeCurrentMessage({ commonEventObject: { userLocale: "nl-NL" }, gmail: { accessToken: "token", messageId: "message" } });
  assert.equal(messageReads, 1, "Analyze must read only the current message once");
  assert.equal(fetches, 1, "Analyze must make one assessment request");
  assert.deepEqual(JSON.parse(JSON.stringify(requestPayload)), {
    source: "paste", subject: "Test", senderEmail: "sender@example.com", body: "Synthetic body", locale: "nl",
  });
  const resultCard = context.buildResultCard({
    risk_level: "high", risk_score: 82, suspicious_signals: ["Synthetisch signaal"], detected_links: [],
    recommended_action: "Controleer via een bekend kanaal.", short_explanation: "Verdacht patroon.",
  }, "nl");
  const resultHeader = resultCard.__calls.setHeader[0][0];
  assert.match(resultHeader.__calls.setTitle[0][0], /HOOG/);
  assert.equal(context.isAnalysisResult({
    risk_level: "high", risk_score: 82, suspicious_signals: [],
    recommended_action: "Verify.", short_explanation: "Suspicious.",
  }), false, "incomplete API results must be rejected");
  context.removeApiKey({ commonEventObject: { userLocale: "nl-NL" } });
  assert.equal(userProperties.has("MAILLUME_API_KEY"), false, "users must be able to remove the stored key");
}

Promise.resolve()
  .then(testBrowserExtension)
  .then(testGmailAddOn)
  .then(() => console.log("Checked browser extension and Gmail add-on behavior."));
