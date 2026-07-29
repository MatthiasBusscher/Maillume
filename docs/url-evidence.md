# Deterministic URL Evidence

Phase 2 moves URL and domain inspection into
`src/lib/analysis/url-evidence.ts`. The module parses normalized HTTP(S) strings
locally and never opens, follows, resolves, or sends a destination anywhere.

## Structural evidence

`analysis-v8` can report:

- IP-literal destinations;
- non-default network ports;
- URL user information that can disguise the real host;
- punycode/internationalized hostnames as a caution signal;
- bounded nested HTTP(S) destinations in query parameters;
- brand-lookalike destination domains;
- a sensitive request whose claimed brand, sender, and destination disagree;
- a sensitive request using a hosted-page destination;
- existing short-link, risky-hostname-TLD, and displayed-link mismatch evidence.

Punycode is not treated as proof of phishing. It contributes a small caution
factor and remains low risk by itself. Likewise, a hosted page or unrelated
sender/destination pair is only scored by the new contextual rules when the
message also contains a sensitive request.

The implementation compares registrable domains, so ordinary same-site
subdomains do not become mismatches. A path ending in `.zip` is not treated as
a `.zip` hostname.

## Bounds and privacy

- A URL longer than 4,096 characters is not structurally inspected.
- At most 24 query values are inspected.
- A query value is capped at 2,048 characters.
- Percent-decoding is capped at two nested passes.
- Only HTTP and HTTPS strings are accepted.
- No DNS, WHOIS, redirect, reputation, Safe Browsing, URL fetch, or network API
  is used.
- Nested destinations are inspected as evidence but are not opened.

These limits keep work deterministic and bounded for the existing scan-size
limit.

## Evaluation comparison

The frozen pre-tuning corpus revision remains
`sha256:1e4312f0b7648ac4cd9d26635c992c60a2aff41b89e3a7e06fd249f1be670788`.
The URL change does not edit a corpus fixture.

| Metric | `analysis-v7` before | `analysis-v8` after |
| --- | ---: | ---: |
| Independent phishing non-low | 20.8% (5/24) | 25.0% (6/24) |
| Independent phishing high | 4.2% (1/24) | 4.2% (1/24) |
| Independent spam non-low | 8.3% (1/12) | 8.3% (1/12) |
| Independent legitimate non-low | 4.2% (1/24) | 4.2% (1/24) |
| Independent legitimate high | 0.0% (0/24) | 0.0% (0/24) |
| Public-advisory phishing non-low | 83.3% (5/6) | 100.0% (6/6) |
| Public-advisory phishing high | 0.0% (0/6) | 50.0% (3/6) |

The independent improvement comes from the IP-literal credential case. The
locked independent aggregate does not change, which is recorded without tuning
against individual locked outcomes. Existing legitimate gates remain inside
their provisional limits.

## Performance review

On the local 100-iteration diagnostic run, the link-heavy median moved from
approximately 0.111 ms to 0.348 ms because each of its 20 destinations now
receives structural parsing. This is more than the plan's two-times review
trigger, but the absolute increase is about 0.237 ms and remains below one
millisecond. The maximum-size text case moved from 1.247 ms to 1.330 ms.

The regression is accepted for this phase because URL inspection is the added
security behavior, work is capped per URL and query value, and total scan work
remains small compared with parsing, OCR, and request transport. Benchmarks
remain diagnostic across machines rather than an absolute CI timing gate.

## Regression coverage

Tests cover IPv4, IPv6, localhost, malformed and oversized strings, standard and
non-standard ports, Unicode-to-punycode normalization, bounded encoded
redirects, `@` in URL paths versus user information, same-site subdomains,
unrelated registrable domains, brand lookalikes, legitimate internationalized
domains, hosted-page context, and `.zip` paths versus `.zip` hostnames.
