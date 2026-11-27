import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  BLOCKLIST_CACHE_DEFAULT_PATH,
  collectFeedEvidence,
  loadBlocklistCache,
  normalizeBlocklistUrl,
  setBlocklistCacheForTests,
  type BlocklistCache,
} from "./feed-evidence";

function makeCache(overrides: Partial<BlocklistCache> = {}): BlocklistCache {
  return {
    schema: "maillume-blocklist-cache-v1",
    generated_at: new Date().toISOString(),
    max_age_hours: 72,
    sources: [{
      name: "openphish",
      url: "https://openphish.com/feed.txt",
      license: "test license",
    }],
    urls: [],
    domains: [],
    ...overrides,
  };
}

// Normalization stays in lockstep with the fetcher script.
assert.equal(
  normalizeBlocklistUrl("HTTPS://Portal.Example/Login?token=x#section"),
  "https://portal.example/Login?token=x",
);
assert.equal(normalizeBlocklistUrl("ftp://portal.example/"), null);
assert.equal(normalizeBlocklistUrl("not a URL"), null);

// Matching logic, injected via the test seam.
setBlocklistCacheForTests(makeCache({ urls: ["https://portal.example/login?token=x"] }));
assert.deepEqual(
  collectFeedEvidence(["https://PORTAL.example/login?token=x#anchor"]),
  ["blocklisted_url"],
);
// The exact hit wins even when earlier links would only hit the domain list.
assert.deepEqual(
  collectFeedEvidence(["https://other.example/", "https://portal.example/login?token=x"]),
  ["blocklisted_url"],
);

setBlocklistCacheForTests(makeCache({ domains: ["portal.example"] }));
assert.deepEqual(
  collectFeedEvidence(["https://campaign.portal.example/verify"]),
  ["blocklisted_domain"],
);
assert.deepEqual(
  collectFeedEvidence(["https://portal.example/verify"]),
  ["blocklisted_domain"],
);

// Unlisted destinations stay clean.
setBlocklistCacheForTests(makeCache({
  urls: ["https://blocked.example/login"],
  domains: ["blocked.example"],
}));
assert.deepEqual(collectFeedEvidence(["https://legit.example/newsletter"]), []);
// A listed URL that differs in path or query is only a domain hit.
assert.deepEqual(
  collectFeedEvidence(["https://blocked.example/unsubscribe"]),
  ["blocklisted_domain"],
);
// Only http(s) links are inspected.
setBlocklistCacheForTests(makeCache({ domains: ["portal.example"] }));
assert.deepEqual(collectFeedEvidence(["javascript:alert(1)"]), []);

// Loader behavior through the real file path, not the seam.
const cacheDir = mkdtempSync(join(tmpdir(), "maillume-blocklist-"));
const cachePath = join(cacheDir, "cache.json");
process.env.MAILLUME_BLOCKLIST_CACHE = cachePath;
try {
  setBlocklistCacheForTests(undefined);
  // Missing file: no evidence, and never a legitimacy signal.
  assert.equal(loadBlocklistCache(), null);
  assert.deepEqual(collectFeedEvidence(["https://portal.example/login"]), []);

  // Malformed schema is ignored.
  writeFileSync(cachePath, JSON.stringify({
    ...makeCache({ urls: ["https://portal.example/login"] }),
    schema: "maillume-blocklist-cache-v0",
  }));
  assert.equal(loadBlocklistCache(), null);
  assert.deepEqual(collectFeedEvidence(["https://portal.example/login"]), []);

  // A fresh, valid file is loaded and matched.
  writeFileSync(cachePath, JSON.stringify(
    makeCache({ urls: ["https://portal.example/login"] }),
  ));
  const loaded = loadBlocklistCache();
  assert.ok(loaded !== null);
  assert.equal(loaded.max_age_hours, 72);
  assert.deepEqual(
    collectFeedEvidence(["https://portal.example/login"]),
    ["blocklisted_url"],
  );

  // A stale file is ignored entirely.
  writeFileSync(cachePath, JSON.stringify(makeCache({
    generated_at: new Date(Date.now() - 73 * 3_600_000).toISOString(),
    urls: ["https://portal.example/login"],
  })));
  assert.equal(loadBlocklistCache(), null);
  assert.deepEqual(collectFeedEvidence(["https://portal.example/login"]), []);
} finally {
  delete process.env.MAILLUME_BLOCKLIST_CACHE;
  rmSync(cacheDir, { recursive: true, force: true });
}

// Default path constant stays in sync with the fetcher script default.
assert.equal(BLOCKLIST_CACHE_DEFAULT_PATH, "blocklist-cache.json");

// Restore seam-free loading for anything that runs after this file.
setBlocklistCacheForTests(undefined);
