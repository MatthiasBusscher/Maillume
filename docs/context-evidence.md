# Context, Action, and Negation Evidence

Phase 3 introduces reusable local context handling in
`src/lib/analysis/context.ts`. The scanner now distinguishes an instruction to
perform a sensitive action from a warning, receipt, completed event, expected
action, or known contact route.

The change remains part of `analysis-v8`. It extends the behavior introduced in
Phase 2 without changing the result contract, score weights, family caps, or
risk thresholds.

## Context model

The context module:

- splits normalized content into bounded sentence and clause segments;
- records each segment's start and end offsets;
- records the exact matched span for every evidence candidate;
- applies suppressions only to the candidate's own segment;
- supports explicit co-occurrence checks across a window of at most three
  neighboring segments;
- preserves a positive candidate in another segment even when one segment
  contains safety advice;
- ignores stateful regular-expression flags when evaluating repeated patterns.

At most 256 segments are created. Before doing scoped segment work, the module
uses a whole-message prefilter to skip pattern groups that cannot match. This
keeps long benign inputs inexpensive without changing the local suppression
semantics.

## Covered distinctions

The following categories have explicit positive and suppressing context:

| Evidence | Actionable example | Suppressed routine context |
| --- | --- | --- |
| Credentials | Enter or provide a password/login | Requested reset, no password required, never share credentials |
| MFA or OAuth | Approve a login or grant application access | Never approve an unexpected prompt |
| Payment | Pay, settle, or transfer funds | Payment received, completed, or already processed |
| Changed payment details | Use a new bank or remittance account | Details are unchanged, existing, or already recorded |
| Delivery | Delivery problem + fee + return pressure | Confirmed shipment/delivery with no extra fee |
| Callback | Call an urgent or supplied number | Use a published number, official directory, or known channel |
| Subscription | Blocking/expiry or forced renewal | Ordinary renewal under the current agreement with no action |
| Promotion | Prize, discount, or limited offer | Explicitly subscribed newsletter or managed preferences |
| Attachment/document | Open/download/enable a supplied file | Previously discussed, requested, or approved report |
| Identity | Confirm or update identity details | In-person verification during a scheduled appointment |

The regression suite also includes mixed messages. A legitimate safety sentence
does not suppress a credential, MFA, payment, changed-bank, or callback
instruction in a different sentence.

## Evaluation comparison

The independent corpus remains frozen at
`sha256:1e4312f0b7648ac4cd9d26635c992c60a2aff41b89e3a7e06fd249f1be670788`.
No fixture was edited during Phase 3.

| Metric | Phase 2 | Phase 3 |
| --- | ---: | ---: |
| Independent phishing non-low | 25.0% (6/24; 24 scenarios) | 45.8% (11/24; 24 scenarios) |
| Independent phishing high | 4.2% (1/24; 24 scenarios) | 8.3% (2/24; 24 scenarios) |
| Independent spam non-low | 8.3% (1/12; 12 scenarios) | 8.3% (1/12; 12 scenarios) |
| Independent legitimate non-low | 4.2% (1/24; 24 scenarios) | 0.0% (0/24; 24 scenarios) |
| Independent legitimate high | 0.0% (0/24; 24 scenarios) | 0.0% (0/24; 24 scenarios) |
| Public-advisory phishing non-low | 100.0% (6/6; 6 scenarios) | 100.0% (6/6; 6 scenarios) |
| Public-advisory phishing high | 50.0% (3/6; 6 scenarios) | 50.0% (3/6; 6 scenarios) |

The development, validation, and locked independent aggregates remain reported
separately by `npm run eval:heuristic`. Individual locked cases were not opened
or used for rule tuning.

Across the full evaluation inventory, the English/Dutch gaps remain below the
provisional ten-point gate: phishing non-low is 94.7% (89/94) in English and
91.8% (89/97) in Dutch; phishing high is 59.6% (56/94) and 59.8% (58/97);
spam non-low is 82.4% (28/34) and 83.9% (26/31). Neither language has a
legitimate non-low or legitimate high result.

These figures describe the versioned test inventory, not real-world accuracy.
The independent phishing and spam results are still below the provisional
release targets and remain work for the attack-chain and calibration phases.

## Performance and privacy

The optimized 1,000-iteration local diagnostic run on Node 25.8.0/Darwin arm64
recorded:

| Scenario | Median | p95 |
| --- | ---: | ---: |
| Short message | 0.074 ms | 0.100 ms |
| Long message | 0.821 ms | 0.947 ms |
| Link-heavy message | 0.368 ms | 0.565 ms |
| Maximum-size message | 1.624 ms | 1.852 ms |

Compared with the recorded Phase 2 diagnostic, the link-heavy median changes
from about 0.348 ms to 0.368 ms and the maximum-size median from about 1.330 ms
to 1.624 ms. Both remain below the two-times review threshold. An initial
implementation repeatedly segmented every benign message and exceeded that
threshold; whole-message prefilters removed that avoidable work before the
phase was accepted.

Context analysis is deterministic and performs no DNS, URL fetch, redirect
resolution, reputation lookup, analytics call, or other network operation.
