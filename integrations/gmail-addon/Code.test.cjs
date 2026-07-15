/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function fluent() {
  const target = {};
  return new Proxy(target, {
    get(object, property) {
      if (property === "build") return () => object;
      if (!(property in object)) object[property] = () => new Proxy(object, this);
      return object[property];
    },
  });
}

const properties = new Map();
let responseStatus = 500;
let messageReads = 0;

const context = {
  PropertiesService: {
    getUserProperties: () => ({
      getProperty: (key) => properties.get(key) ?? null,
      setProperty: (key, value) => properties.set(key, value),
      deleteProperty: (key) => properties.delete(key),
    }),
  },
  GmailApp: {
    setCurrentMessageAccessToken() {},
    getMessageById() {
      messageReads += 1;
      return {
        getSubject: () => "Synthetic subject",
        getFrom: () => "sender@example.com",
        getPlainBody: () => "Synthetic body",
      };
    },
  },
  UrlFetchApp: {
    fetch: () => ({
      getResponseCode: () => responseStatus,
      getContentText: () => JSON.stringify({ error: "Synthetic response" }),
    }),
  },
  CardService: new Proxy(
    { TextButtonStyle: { FILLED: "FILLED" } },
    {
      get(target, property) {
        if (property in target) return target[property];
        return () => fluent();
      },
    },
  ),
};

vm.createContext(context);
const source = fs.readFileSync(__dirname + "/Code.gs", "utf8");
vm.runInContext(source, context);

const apiKey = `mlm_${"a".repeat(43)}`;
const event = {
  commonEventObject: {
    userLocale: "en-US",
    formInputs: { apiKey: { stringInputs: { value: [apiKey] } } },
  },
  gmail: { accessToken: "current-message-token", messageId: "synthetic-message" },
};

assert.doesNotMatch(source, /CacheService/, "the add-on must not use an expiring cache for the API key");
assert.equal(messageReads, 0, "loading the add-on must not read Gmail content");

context.saveApiKey(event);
assert.deepEqual([...properties.entries()], [["MAILLUME_API_KEY", apiKey]], "only the API key may be persisted");
assert.equal(context.getStoredApiKey(), apiKey);

responseStatus = 500;
context.analyzeCurrentMessage(event);
assert.equal(properties.get("MAILLUME_API_KEY"), apiKey, "temporary service errors must not remove a valid key");

context.saveApiKey(event);
responseStatus = 401;
context.analyzeCurrentMessage(event);
assert.equal(properties.has("MAILLUME_API_KEY"), false, "401 must remove the rejected key");

context.saveApiKey(event);
responseStatus = 403;
context.analyzeCurrentMessage(event);
assert.equal(properties.get("MAILLUME_API_KEY"), apiKey, "403 must preserve a key that may still be valid");

assert.equal(messageReads, 3, "each explicit analysis action reads only the current message once");
assert.deepEqual([...properties.entries()], [["MAILLUME_API_KEY", apiKey]], "only the API key may remain in user properties");

console.log("Checked Gmail add-on API-key persistence, rejection cleanup, and zero content storage.");
