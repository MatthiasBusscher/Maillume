import { readFileSync, statSync } from "node:fs";

import type { EvidenceId } from "./evidence";
import { getRegistrableDomain } from "./evidence";

/**
 * Blocklist feed evidence.
 *
 * Maillume never queries reputation services during a scan. A deployment can
 * generate a local blocklist cache out-of-band (see
 * scripts/fetch-blocklist-feeds.mjs and docs/blocklist-feeds.md). Matching
 * happens against that local file only: no DNS, WHOIS, HTTP or other network
 * request is made in the scan path, and no scan content leaves the server.
 *
 * When no valid, fresh cache exists, this factor contributes nothing —
 * availability of feed data is never a legitimacy signal.
 */

export const BLOCKLIST_CACHE_SCHEMA = "maillume-blocklist-cache-v1";
export const BLOCKLIST_CACHE_DEFAULT_PATH = "blocklist-cache.json";

const MAX_CACHE_URLS = 20_000;
const MAX_CACHE_DOMAINS = 10_000;
const MAX_INSPECTED_LINKS = 24;
const DEFAULT_MAX_AGE_HOURS = 72;

export type BlocklistSource = {
  name: string;
  url: string;
  license: string;
};

export type BlocklistCache = {
  schema: typeof BLOCKLIST_CACHE_SCHEMA;
  generated_at: string;
  max_age_hours: number;
  sources: BlocklistSource[];
  urls: string[];
  domains: string[];
};

type CacheEntry = {
  mtimeMs: number;
  cache: BlocklistCache | null;
};

let loadedEntry: CacheEntry | null = null;
let injectedCache: BlocklistCache | null | undefined;

/**
 * Test seam: when set, the loader is bypassed entirely. Pass `null` to
 * simulate a deployment without feed data, `undefined` to restore the
 * file-based behavior.
 */
export function setBlocklistCacheForTests(cache: BlocklistCache | null | undefined): void {
  injectedCache = cache;
  loadedEntry = null;
}

/**
 * Normalizes an HTTP(S) URL for blocklist comparison. Keep in sync with the
 * normalization in scripts/fetch-blocklist-feeds.mjs: lowercase scheme and
 * host, drop the fragment, keep path and query verbatim.
 */
export function normalizeBlocklistUrl(link: string): string | null {
  try {
    const url = new URL(link);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.host = url.host.toLowerCase();
    return url.toString();
  } catch {
    return null;
  }
}

function parseBlocklistCache(value: unknown): BlocklistCache | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<BlocklistCache>;
  if (candidate.schema !== BLOCKLIST_CACHE_SCHEMA) return null;
  if (typeof candidate.generated_at !== "string" || Number.isNaN(Date.parse(candidate.generated_at))) {
    return null;
  }
  const maxAge = typeof candidate.max_age_hours === "number"
    && Number.isFinite(candidate.max_age_hours)
    && candidate.max_age_hours > 0
    ? candidate.max_age_hours
    : DEFAULT_MAX_AGE_HOURS;
  const urls = Array.isArray(candidate.urls)
    ? candidate.urls.filter((entry): entry is string => typeof entry === "string").slice(0, MAX_CACHE_URLS)
    : [];
  const domains = Array.isArray(candidate.domains)
    ? candidate.domains.filter((entry): entry is string => typeof entry === "string").slice(0, MAX_CACHE_DOMAINS)
    : [];
  const sources = Array.isArray(candidate.sources)
    ? candidate.sources.filter(
      (source): source is BlocklistSource =>
        !!source && typeof source === "object" &&
        typeof (source as BlocklistSource).name === "string" &&
        typeof (source as BlocklistSource).url === "string" &&
        typeof (source as BlocklistSource).license === "string",
      )
    : [];
  return {
    schema: BLOCKLIST_CACHE_SCHEMA,
    generated_at: candidate.generated_at,
    max_age_hours: maxAge,
    sources,
    urls,
    domains,
  };
}

function isCacheFresh(cache: BlocklistCache): boolean {
  const generatedAt = Date.parse(cache.generated_at);
  if (Number.isNaN(generatedAt)) return false;
  return Date.now() - generatedAt <= cache.max_age_hours * 3_600_000;
}

function readBlocklistCache(): BlocklistCache | null {
  const path = process.env.MAILLUME_BLOCKLIST_CACHE ?? BLOCKLIST_CACHE_DEFAULT_PATH;
  try {
    const stats = statSync(path);
    if (!loadedEntry || loadedEntry.mtimeMs !== stats.mtimeMs) {
      loadedEntry = {
        mtimeMs: stats.mtimeMs,
        cache: parseBlocklistCache(JSON.parse(readFileSync(path, "utf8"))),
      };
    }
    return loadedEntry.cache;
  } catch {
    loadedEntry = null;
    return null;
  }
}

export function loadBlocklistCache(): BlocklistCache | null {
  if (injectedCache !== undefined) return injectedCache;
  const cache = readBlocklistCache();
  if (!cache) return null;
  return isCacheFresh(cache) ? cache : null;
}

/**
 * Reports feed evidence for the inspected links. An exact blocklist URL hit
 * is decisive and stops inspection; a registrable-domain hit contributes the
 * smaller caution factor. Both are capped by the destination family cap like
 * every other URL factor.
 */
export function collectFeedEvidence(links: string[]): EvidenceId[] {
  const cache = loadBlocklistCache();
  if (!cache || cache.urls.length === 0 && cache.domains.length === 0) return [];

  const urlSet = new Set(cache.urls);
  const domainSet = new Set(cache.domains);
  const evidence: EvidenceId[] = [];

  for (const link of links.slice(0, MAX_INSPECTED_LINKS)) {
    const normalized = normalizeBlocklistUrl(link);
    if (!normalized) continue;
    if (urlSet.has(normalized)) return ["blocklisted_url"];
    const domain = getRegistrableDomain(normalized);
    if (domain && domainSet.has(domain)) {
      evidence.push("blocklisted_domain");
      break;
    }
  }
  return evidence;
}
