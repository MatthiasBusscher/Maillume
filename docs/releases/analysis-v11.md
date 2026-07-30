# `analysis-v11` release notes

`analysis-v11` keeps the scanner fully deterministic and offline while extending
explainable evidence for subtle phishing and unsolicited commercial spam.

## Detection changes

- Quiet account-access prompts now count as credential evidence when they ask for
  a work or company account to preserve, restore, or confirm access.
- Consent requests that ask a reader or application to access files, a mailbox,
  contacts, or a profile now count as MFA/OAuth evidence.
- Dutch requests to update sensitive identity and bank-record fields, including
  BSN, account number, and civil status, now count as identity-reverification
  evidence.
- Specific lead-list, staffing, bookkeeping, webinar, energy, solar, token,
  mining, gambling, wellness, and prize-club offers now contribute visible spam
  evidence. They do not rely on hidden reputation data or network lookups.

Each contribution is still shown in `score_factors`, uses the existing family
caps, and is included in the visible risk-score sum.

## Precision boundaries

Sentence-scoped suppressions still exclude requested password-reset
confirmations, completed payments, unchanged bank details, security-awareness
guidance, and opted-in promotions. A requested reset confirmation that directs
the recipient back to an established portal remains low risk.

## Exposed-corpus calibration

Against the independent development and validation splits, phishing and spam
non-low detection increased from 83.3% and 0.0% to 100.0% on development, and
from 66.7% and 8.3% to 100.0% on validation. Legitimate non-low and high-risk
rates stayed at 0.0% across both exposed splits.

These are synthetic calibration results, not a real-world accuracy claim. The
locked evaluation split was reserved for the release owner’s independent
comparison.

## Locked release evaluation

After the implementation and contract were frozen, the new independent locked
split was evaluated once. It detected 4/12 phishing cases above low risk, 1/12
at high risk, and 0/12 spam cases above low risk. One of 12 legitimate hard
negatives was above low risk and none were high risk. No rules were changed
after observing these results.

The weak transfer from the exposed splits is evidence that these narrow pattern
additions should not be presented as broad real-world detection coverage. The
unchanged synthetic locked and public-advisory regression suites still pass,
combined legitimate non-low/high rates are 0.5%/0.0%, and English/Dutch gaps
remain below ten percentage points.

The maximum-input local benchmark p95 is 2.369 ms, about 1.13× the
`analysis-v10` 2.090 ms reference and below the existing 2× review threshold.
