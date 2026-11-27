# Local Blocklist Feeds

`analysis-v13` adds a local blocklist evidence factor. A deployment can
periodically download public phishing feeds out-of-band and match scans
against that **local copy**. The scan path itself stays fully offline:
no DNS, WHOIS, HTTP, or reputation request is made while analyzing a
message, and no scan content leaves the server.

## How it works

1. `scripts/fetch-blocklist-feeds.mjs` downloads the key-less public feed:

   | Feed | URL | Terms |
   | --- | --- | --- |
   | OpenPhish community feed | https://openphish.com/feed.txt | Free for non-commercial use with attribution |

   Verify the current feed terms at the linked page before enabling the
   feed. The generated cache file is deployment-local and excluded from
   Git, packages, and the Docker image, so the feed is matched, never
   redistributed.

   Other candidate feeds were evaluated and are intentionally not used:
   URLhaus retired its key-less bulk downloads in November 2026 (HTTP 410)
   and its API now requires an auth key, and PhishTank's downloadable
   database requires an application key. Both could be added behind
   configuration later if that tradeoff is accepted.

2. The script writes `blocklist-cache.json` (bounded: at most 20,000 URLs
   and 10,000 registrable domains) with the generation time, a maximum age
   (default 72 hours), and per-feed license records.

3. During a scan, `src/lib/analysis/feed-evidence.ts` reads that file from
   the path in `MAILLUME_BLOCKLIST_CACHE` (default `blocklist-cache.json`
   relative to the working directory) and matches the inspected HTTP(S)
   destinations:

   - an exact normalized URL match reports `blocklisted_url` (25 points);
   - otherwise a registrable-domain match reports `blocklisted_domain`
     (10 points), capped by the destination family cap like every other
     URL factor.

   At most 24 links are inspected per scan. URLs are normalized the same
   way by the fetcher and the matcher: lowercase scheme and host, fragment
   dropped, path and query kept verbatim.

## Degradation

The factor is deliberately conservative about availability:

- no cache file, an unparsable cache, or a cache older than its
  `max_age_hours` contributes **nothing**;
- feed availability is never a legitimacy signal: a message is never
  treated as safer because the cache is missing.

## Scheduling

Run the fetcher on a schedule that keeps the cache inside its max age, for
example hourly on the VPS:

```bash
node scripts/fetch-blocklist-feeds.mjs
```

The script exits non-zero when no feed could be fetched and writes a
partial cache when only some feeds succeed, so a scheduler can alert on a
broken refresh. The public deployment runs the Next.js server with the
cache file reachable at the configured path.

## Privacy

- Scans never transmit message content, URLs, or domains to any third
  party; feeds are downloaded in bulk and matched locally.
- The cache file contains only feed data, never scan data.
- Blocklist evidence is a derived evidence ID: an AI provider cannot
  author it.

## Evaluation

Repository evaluation runs intentionally execute without a cache file, so
the factor contributes nothing there and the locked gates measure the
unchanged heuristic behavior. Cache-present behavior is covered by the
injected-fixture tests in `src/lib/analysis/feed-evidence.test.ts` (exact
hit, domain hit, miss, absent/stale/malformed cache).

A live deployment that enables the cache should be watched for false
positives: domain-level hits can occur on compromised but otherwise
legitimate hosting, which is why the domain factor contributes only a
caution-level score and exact URL matches carry the weight.
