# `analysis-v12` release notes

`analysis-v12` strengthens deterministic, offline detection of subtle phishing
and unsolicited commercial messages without lowering the global risk
threshold. Its release decision uses separate recall and precision gates so a
strong result for one class cannot conceal misses or false positives in another.

## Detection changes

- Credential evidence recognizes compositional instructions involving company
  or work sign-ins, current passwords, PINs, and passcodes.
- OAuth evidence recognizes broader English and Dutch application-consent
  requests involving files, mailboxes, contacts, profiles, and delegated access.
- Identity evidence recognizes requests for combinations of sensitive
  employment, tax, insurance, government, payment-card, and bank records.
- Delivery evidence recognizes a failed or held delivery paired with a requested
  fee, even when the message avoids overt urgency.
- QR evidence is strengthened when a QR instruction is paired with a credential
  or sensitive account action.
- Spam evidence uses the co-occurrence of a commercial offer, a claimed benefit,
  and a call to action. Requested work, existing vendors, opted-in messages, and
  ordinary renewal context remain explicit suppressions.

Every contribution remains visible in `score_factors`, respects the existing
family caps, and sums exactly to the risk index. No reputation request, retained
message content, hidden score adjustment, or feedback-derived weight is added.

## Precision boundaries

Regression cases preserve low-risk handling for requested password-reset
confirmations, unchanged bank and payment details, security-awareness guidance,
requested documents, established-vendor work, and opted-in commercial
messages. Missing material evidence still cannot produce
`likely_legitimate`.

## Release acceptance

The v12 release gate requires all of the following on a fresh, frozen holdout:

- phishing recall of at least 90%;
- phishing precision of at least 90%;
- spam recall of at least 90%;
- spam precision of at least 90%;
- legitimate non-low rate of at most 10%;
- legitimate high-risk rate of at most 2%; and
- English/Dutch gaps no larger than ten percentage points.

The holdout contains 36 synthetic public-advisory adaptations: 12 phishing, 12
spam, and 12 legitimate hard negatives, equally balanced across English/Dutch
and paste, Chrome, screenshot, and `.eml` inputs. Its structure is tested
without invoking the detector. Detector logic, version metadata, and this
release protocol are frozen before the one-time scoring run.

## Fresh holdout result

The candidate frozen at commit `b8285c9` did not pass its one-time fresh
holdout evaluation:

- phishing recall: 66.7% (8/12);
- spam recall: 83.3% (10/12);
- phishing precision: 88.9% (8/9);
- spam precision: 100.0% (10/10);
- legitimate non-low rate: 8.3% (1/12);
- legitimate high-risk rate: 0.0% (0/12);
- phishing-recall English/Dutch gap: 33.3 percentage points; and
- legitimate non-low English/Dutch gap: 16.7 percentage points.

The frozen corpus revision is
`sha256:aec2ab43e12c04841725e88c88fcb4490528e00726e4fa8c18d6245c5d4bc2ea`.
The exact machine-readable result is stored in
[`analysis-v12-holdout.json`](analysis-v12-holdout.json). No detector rule was
changed after observing this result.

This candidate is therefore not releasable as `analysis-v12` and must not be
described as meeting the 90% gates. Further detector work must use broader
development evidence and a newly authored untouched holdout; this failed
holdout cannot be reused as proof.

## Existing regression inventory and performance

Before the fresh holdout was scored, the existing 504-case repository inventory
reported 203/203 phishing cases above low risk with the correct phishing
classification, 86/89 spam cases above low risk with the correct spam
classification, and 0/212 legitimate cases above low risk. This inventory
includes calibration and previously exposed holdouts, so it is regression
evidence rather than fresh validation.

The maximum-size 20,000-character local benchmark p95 is 3.350 ms. That is
approximately 1.41× the `analysis-v11` 2.369 ms reference and remains below the
existing 2× review threshold.

These repository-only synthetic results are a release control, not a claim of
90% real-world accuracy. Real inbox distributions and new attack campaigns can
differ materially, so the scanner must continue to explain its evidence and
present uncertainty honestly.
