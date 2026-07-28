# Supported attack chains in `analysis-v10`

Phase 5 strengthens combinations that are more meaningful together than their individual
signals. It does not lower the general medium/high thresholds, remove family caps, add
network lookups, or interpret missing evidence as reassuring.

## Selection boundary

Only development and validation cases were inspected while designing these rules. The
individual locked-holdout messages remained sealed. Aggregate locked metrics were read only
after implementation and did not change, so the result is not evidence of broad
generalization.

The implemented or refined chains are:

- changed payment details plus an actual payment instruction;
- executive or internal-authority impersonation plus payment and secrecy or urgency;
- a security, fraud-alert, backup, or software-subscription claim plus an unverified
  callback instruction;
- an OAuth/application approval request plus an unexpected shared-content lure;
- a QR instruction plus identity re-verification and threatened loss of access or benefits;
- a delivery problem plus a demanded fee and return pressure;
- repeated MFA/sign-in prompts plus an instruction to approve each prompt.

Existing account/credential/urgency, MFA/urgency, security/payment, and
promotion/payment/urgency chains remain explicit in the same module.

Each chain has its own minimum visible score. A chain can raise the risk level only after
all of its required evidence is present and the applied factor contributions reach that
minimum. The score still equals the sum of visible factors. No hidden chain bonus is added.

## Context and suppression

New patterns are deliberately narrow:

- Secrecy evidence requires pressure to hide a request; ordinary confidential-document
  notices and explicit “not confidential” language are suppressed.
- Shared-content evidence is suppressed for requested, expected, discussed, or approved
  files and folders.
- Repeated-approval evidence requires both multiple prompts and an instruction to approve
  them. Advice that says never to approve unexpected prompts is suppressed.
- QR identity/account evidence requires the QR action, identity linkage, and threatened
  loss to occur together. Optional guide QR codes and “no action required” language are
  suppressed.
- Callback evidence retains the existing official-directory and official-website
  suppressions.
- Completed payments, unchanged bank details, delivered parcels with no fee, and explicit
  “do not pay” language remain suppressed.

Every new chain has positive, incomplete, negated, and legitimate regression cases in
`src/lib/analysis/attack-chains.test.ts`.

## Before and after

The corpus revision stayed
`sha256:1e4312f0b7648ac4cd9d26635c992c60a2aff41b89e3a7e06fd249f1be670788`.
These are repository evaluation results, not real-world accuracy claims.

| Dataset | Metric | Before (`analysis-v9`) | After (`analysis-v10`) |
| --- | --- | ---: | ---: |
| Independent development | Phishing non-low | 4/8 (50.0%) | 8/8 (100.0%) |
| Independent development | Phishing high | 0/8 (0.0%) | 5/8 (62.5%) |
| Independent validation | Phishing non-low | 4/8 (50.0%) | 8/8 (100.0%) |
| Independent validation | Phishing high | 1/8 (12.5%) | 5/8 (62.5%) |
| Independent locked | Phishing non-low | 3/8 (37.5%) | 3/8 (37.5%) |
| Independent locked | Phishing high | 1/8 (12.5%) | 1/8 (12.5%) |
| All independent cases | Phishing non-low | 11/24 (45.8%) | 19/24 (79.2%) |
| All independent cases | Phishing high | 2/24 (8.3%) | 11/24 (45.8%) |
| All independent cases | Legitimate non-low | 0/24 (0.0%) | 0/24 (0.0%) |
| All independent cases | Legitimate high | 0/24 (0.0%) | 0/24 (0.0%) |
| Combined repository inventory | Phishing non-low | 178/191 (93.2%) | 186/191 (97.4%) |
| Combined repository inventory | Phishing high | 114/191 (59.7%) | 144/191 (75.4%) |

Independent spam non-low remained 1/12 (8.3%). The provisional independent phishing and
spam gates are therefore not met. Future work needs new distinct cases and spam-focused
evidence rather than further tuning against the sealed holdout.

English/Dutch combined-inventory gaps remain below ten percentage points: phishing
non-low is 98.9% versus 95.9%, phishing high is 77.7% versus 73.2%, and spam non-low is
82.4% versus 83.9%. Legitimate medium/high rates remain zero in both languages.

## Runtime

The benchmark remains deterministic and local:

| Scenario | Before p95 | After p95 |
| --- | ---: | ---: |
| Short message | 0.111 ms | 0.093 ms |
| Long message | 0.974 ms | 1.092 ms |
| Link-heavy message | 0.458 ms | 0.413 ms |
| Maximum-size message | 1.813 ms | 2.090 ms |

The maximum-size p95 change is about 1.15×, below the plan's 2× review threshold.

## Deferred candidates

Two proposed combinations were not added:

- brand lookalike plus credentials plus destination mismatch;
- authentication failure plus a brand claim plus a sensitive action.

The non-locked independent cases do not yet provide enough direct support for those exact
chains. Existing URL and authentication evidence still applies normally. Adding a chain
now would either tune without independent support or rely on a factor hidden by an existing
family cap, conflicting with the requirement that all contributing factors remain visible.
