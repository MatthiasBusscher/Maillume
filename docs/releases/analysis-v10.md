# `analysis-v10` release notes

`analysis-v10` is a deterministic heuristic-scanner release. It adds no hosted AI,
network reputation lookup, mailbox access, scan-history dependency, or storage of
scanned message content.

## What changed

- Added structural URL and domain evidence without network requests.
- Added context, action, completion, and negation handling to reduce keyword-only
  conclusions.
- Added explicit evidence coverage to every result so missing sender, link,
  authentication, attachment, or full-content evidence is visible.
- Added evidence-backed attack chains for changed-payment fraud, executive payment
  pressure, security callbacks, shared-content OAuth lures, QR identity threats,
  delivery fees, and repeated MFA approvals.
- Added privacy-safe aggregate feedback reporting. The operator report returns only
  thresholded, content-free groups and cannot retrieve raw feedback rows.
- Extended the English and Dutch web and extension result copy for the new evidence.
- Updated the API contract to `analysis-v10` and Chrome extension compatibility to
  `analysis-v6` through `analysis-v10`. Extension `0.3.8` requires evidence coverage
  for `analysis-v9` and `analysis-v10`.
- Added packaged-extension release metadata so CI can prove that the extension and
  production image came from the same Git revision and use a compatible analysis
  contract.

## Evaluation evidence

The frozen independent corpus revision is
`sha256:1e4312f0b7648ac4cd9d26635c992c60a2aff41b89e3a7e06fd249f1be670788`.
These repository results are regression evidence, not real-world accuracy claims.

| Metric | `analysis-v9` | `analysis-v10` |
| --- | ---: | ---: |
| Independent phishing non-low | 11/24 (45.8%) | 19/24 (79.2%) |
| Independent phishing high | 2/24 (8.3%) | 11/24 (45.8%) |
| Independent legitimate non-low | 0/24 (0.0%) | 0/24 (0.0%) |
| Independent legitimate high | 0/24 (0.0%) | 0/24 (0.0%) |
| Combined-inventory phishing non-low | 178/191 (93.2%) | 186/191 (97.4%) |
| Combined-inventory phishing high | 114/191 (59.7%) | 144/191 (75.4%) |

Independent spam non-low remains 1/12 (8.3%). English/Dutch gaps remain below ten
percentage points. The maximum-size local benchmark p95 changed from 1.813 ms to
2.090 ms, about 1.15× and below the reviewed 2× regression threshold.

The provisional 90% phishing non-low, 75% phishing high, and 85% spam non-low
percentages are retained as research targets rather than release gates. The small
independent corpus cannot support threshold tuning against its sealed cases. This
release instead requires no regression on the unchanged locked split, all existing
synthetic and advisory gates, legitimate-message safety, language parity, factor-sum
and determinism invariants, and the runtime budget.

The general classification thresholds are unchanged:

- high risk requires a score of at least 70 and two strong evidence families;
- medium risk requires the existing strong-evidence or multi-family conditions,
  or a score of at least 35;
- likely phishing continues to require high risk, phishing evidence with a score
  of at least 35, or phishing-specific evidence with a score of at least 30.

Named attack chains have explicit minimum visible scores. They do not add hidden
points; the displayed factors still sum exactly to the risk score.

See [supported attack chains](../attack-chain-evidence.md),
[evidence coverage](../evidence-coverage.md), and
[heuristic evaluation](../heuristic-evaluation.md) for the full evidence and
interpretation boundaries.

## Known limitations

- The provisional independent phishing and spam targets are not met. The unchanged
  sealed holdout result means the improvements have not yet demonstrated broad
  generalization.
- The scanner cannot determine reputation, domain age, redirect destinations,
  attachment contents, or mailbox context without evidence supplied in the request.
- Screenshot/OCR inputs do not expose ordinary link destinations or authentication
  headers. Missing evidence produces an explicit coverage limitation, not reassurance.
- Obfuscated, image-only, novel, or carefully worded attacks can still be missed.
- A low result is not a guarantee. Important requests should be verified through a
  known contact channel.

## Release and rollback

The production workflow:

1. runs the application, database, security, extension, browser, and contract suites;
2. packages extension `0.3.8` with the workflow Git SHA;
3. builds the web image with the same SHA and verifies it through `/api/health`;
4. blocks high or critical container vulnerabilities;
5. publishes the image by immutable digest and records provenance;
6. refuses deployment until Google's public update service serves extension
   `0.3.8` and the operator confirms the feedback-summary migration is applied;
7. deploys only the previously verified main-branch image.

The previous immutable container digest remains the rollback target. The feedback
summary migration must be applied with the release and can be verified through the
pgTAP lifecycle suite before deployment.

## Monitoring boundary

Monitor only:

- thresholded feedback aggregates from `npm run report:feedback`;
- quota and rate-limit counters;
- service availability and health revision;
- aggregate error rates that contain no scan content.

Do not log or retain subjects, senders, message bodies, links, result payloads,
mailbox identifiers, or IP addresses for scanner tuning.
