import assert from "node:assert/strict";
import test from "node:test";

import { getAnalyticsConfig } from "./analytics";

const websiteId = "0f8fad5b-d9cb-469f-a165-70867728950e";

test("loads nothing unless both analytics variables are set", () => {
  assert.equal(getAnalyticsConfig({}), null);
  assert.equal(getAnalyticsConfig({ UMAMI_SCRIPT_URL: "https://stats.example/script.js" }), null);
  assert.equal(getAnalyticsConfig({ UMAMI_WEBSITE_ID: websiteId }), null);
});

test("accepts an https script URL and a UUID website id", () => {
  assert.deepEqual(
    getAnalyticsConfig({ UMAMI_SCRIPT_URL: "https://stats.example/stats/script.js", UMAMI_WEBSITE_ID: websiteId.toUpperCase() }),
    { scriptUrl: "https://stats.example/stats/script.js", websiteId, origin: "https://stats.example" },
  );
});

test("rejects values that could weaken the page", () => {
  for (const UMAMI_SCRIPT_URL of ["http://stats.example/script.js", "javascript:alert(1)", "https://user:pass@stats.example/script.js", "not a url"]) {
    assert.equal(getAnalyticsConfig({ UMAMI_SCRIPT_URL, UMAMI_WEBSITE_ID: websiteId }), null);
  }
  assert.equal(getAnalyticsConfig({ UMAMI_SCRIPT_URL: "https://stats.example/script.js", UMAMI_WEBSITE_ID: "x\" onload=\"alert(1)" }), null);
});
