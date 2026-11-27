#!/usr/bin/env node
/**
 * Fetches public phishing blocklist feeds and writes the local blocklist
 * cache consumed by src/lib/analysis/feed-evidence.ts.
 *
 * This script runs out-of-band (VPS cron, scheduled task) so the scan path
 * itself stays offline: scans only ever read the generated JSON file.
 *
 * Sources:
 *   - OpenPhish community feed   https://openphish.com/feed.txt   (key-less)
 *   - URLhaus by abuse.ch         https://urlhaus-api.abuse.ch/    (needs an
 *     auth key; set URLHAUS_AUTH_KEY in the environment — never logged,
 *     never committed. Without it the feed is skipped.)
 *
 * Feed terms: the OpenPhish community edition is free for non-commercial
 * use with attribution, and URLhaus data is provided under CC BY 4.0.
 * Verify the current terms at the linked pages before enabling a feed. The
 * cache file is deployment-local and excluded from Git, packages and the
 * Docker image, so the feeds are matched, never redistributed.
 *
 * Usage:
 *   node scripts/fetch-blocklist-feeds.mjs [outputPath] [--max-age hours]
 *
 * Exits non-zero when no feed could be fetched, so a scheduler can alert on
 * a broken refresh. A partial failure still writes a cache from the feeds
 * that succeeded.
 */

import { writeFileSync } from "node:fs";
import { getDomain } from "tldts";

const SCHEMA = "maillume-blocklist-cache-v1";
const MAX_URLS = 20_000;
const MAX_DOMAINS = 10_000;
const FETCH_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_AGE_HOURS = 72;

const FEEDS = [
  {
    name: "openphish",
    kind: "text",
    url: "https://openphish.com/feed.txt",
    license: "OpenPhish community feed, free for non-commercial use with attribution: https://openphish.com/terms.html",
  },
  {
    name: "urlhaus",
    kind: "api",
    url: "https://urlhaus-api.abuse.ch/v1/urls/recent/",
    license: "URLhaus by abuse.ch, CC BY 4.0: https://urlhaus.abuse.ch/",
  },
];

/**
 * Keep in sync with normalizeBlocklistUrl in src/lib/analysis/feed-evidence.ts:
 * lowercase scheme and host, drop the fragment, keep path and query verbatim.
 */
function normalizeUrl(line) {
  try {
    const url = new URL(line.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.host = url.host.toLowerCase();
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchFeedText(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "user-agent": "Maillume blocklist fetcher (https://maillume.io)" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

/**
 * URLhaus API (https://urlhaus-api.abuse.ch/): GET with the Auth-Key header
 * returns JSON with query_status and a urls[] array (the API answers a POST
 * with query_status "http_get_expected" / HTTP 405). The key is a secret:
 * it is read from the environment, never logged, never written anywhere.
 */
async function fetchUrlhausLines(url, authKey) {
  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      "auth-key": authKey,
      "user-agent": "Maillume blocklist fetcher (https://maillume.io)",
    },
  });
  if (!response.ok) {
    // abuse.ch answers an invalid auth key with 405; make that diagnosable.
    if (response.status === 401 || response.status === 403 || response.status === 405) {
      throw new Error(`HTTP ${response.status} for ${url} (check URLHAUS_AUTH_KEY)`);
    }
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const body = JSON.parse(await response.text());
  if (body.query_status !== "ok" || !Array.isArray(body.urls)) {
    throw new Error(`unexpected query_status: ${String(body.query_status)}`);
  }
  return body.urls.map((entry) => typeof entry?.url === "string" ? entry.url : "");
}

function parseArgs(argv) {
  const args = { output: process.env.MAILLUME_BLOCKLIST_CACHE ?? "blocklist-cache.json", maxAgeHours: DEFAULT_MAX_AGE_HOURS };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--max-age") {
      const value = Number(argv[i + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error("--max-age expects a positive number of hours");
      }
      args.maxAgeHours = value;
      i += 1;
    } else {
      positional.push(argv[i]);
    }
  }
  if (positional.length > 1) {
    throw new Error("Usage: node scripts/fetch-blocklist-feeds.mjs [outputPath] [--max-age hours]");
  }
  if (positional.length === 1) args.output = positional[0];
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const urls = new Set();
  const sources = [];
  const failures = [];
  const urlhausAuthKey = process.env.URLHAUS_AUTH_KEY?.trim() ?? "";

  for (const feed of FEEDS) {
    if (feed.kind === "api" && !urlhausAuthKey) {
      process.stdout.write(`${feed.name}: skipped (URLHAUS_AUTH_KEY not set)\n`);
      continue;
    }
    try {
      const text = feed.kind === "api"
        ? (await fetchUrlhausLines(feed.url, urlhausAuthKey)).join("\n")
        : await fetchFeedText(feed.url);
      let count = 0;
      for (const line of text.split("\n")) {
        const normalized = normalizeUrl(line);
        if (normalized) {
          urls.add(normalized);
          count += 1;
        }
      }
      if (count === 0) throw new Error(`no URLs parsed from ${feed.url}`);
      sources.push(feed);
      process.stdout.write(`${feed.name}: parsed ${count} URLs\n`);
    } catch (error) {
      failures.push(feed.name);
      process.stderr.write(`${feed.name}: FAILED ${error instanceof Error ? error.message : error}\n`);
    }
  }

  if (sources.length === 0) {
    process.stderr.write("No feed could be fetched; keeping any existing cache.\n");
    process.exit(1);
  }

  const sortedUrls = Array.from(urls).sort().slice(0, MAX_URLS);
  const domains = new Set();
  for (const url of sortedUrls) {
    try {
      const domain = getDomain(new URL(url).hostname, { allowPrivateDomains: true });
      if (domain) domains.add(domain.toLowerCase());
    } catch {
      // Unreachable: every entry was normalized from a parsed URL.
    }
  }
  const sortedDomains = Array.from(domains).sort().slice(0, MAX_DOMAINS);

  const cache = {
    schema: SCHEMA,
    generated_at: new Date().toISOString(),
    max_age_hours: args.maxAgeHours,
    sources,
    urls: sortedUrls,
    domains: sortedDomains,
  };

  writeFileSync(args.output, `${JSON.stringify(cache, null, 2)}\n`);
  process.stdout.write(`Wrote ${args.output}: ${sortedUrls.length} URLs, ${sortedDomains.length} domains from ${sources.length} feed(s)\n`);
  if (failures.length > 0) {
    process.stdout.write(`Feeds failed (cache is partial): ${failures.join(", ")}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
