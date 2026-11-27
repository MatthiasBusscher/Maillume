#!/usr/bin/env node
/**
 * Fetches public phishing blocklist feeds and writes the local blocklist
 * cache consumed by src/lib/analysis/feed-evidence.ts.
 *
 * This script runs out-of-band (VPS cron, scheduled task) so the scan path
 * itself stays offline: scans only ever read the generated JSON file.
 *
 * Source (key-less):
 *   - OpenPhish community feed   https://openphish.com/feed.txt
 *
 * URLhaus retired its key-less bulk downloads (HTTP 410, November 2026) and
 * its API now requires an auth key, so it is intentionally not used.
 * PhishTank's downloadable database likewise requires an application key;
 * it can be added behind configuration if that tradeoff is ever accepted.
 *
 * Feed terms: the OpenPhish community edition is free for non-commercial
 * use with attribution. Verify the current terms at the linked page before
 * enabling the feed. The cache file is deployment-local and excluded from
 * Git, packages and the Docker image, so the feed is matched, never
 * redistributed.
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
    url: "https://openphish.com/feed.txt",
    license: "OpenPhish community feed, free for non-commercial use with attribution: https://openphish.com/terms.html",
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

  for (const feed of FEEDS) {
    try {
      const text = await fetchFeedText(feed.url);
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
