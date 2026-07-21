# Synthetic Evaluation

Maillume uses a repository-only synthetic corpus to calibrate `analysis-v3` without retaining or collecting users' email.

The risk score is a versioned, capped index of observed evidence. It is not the probability that a message is malicious and these synthetic checks are not a claim of real-world accuracy.

## Corpus Shape

The generated corpus in `src/lib/evaluation/synthetic-corpus.ts` contains exactly 300 cases:

- 100 phishing or fraud cases;
- 50 spam cases;
- 150 legitimate hard negatives;
- 150 English and 150 Dutch cases;
- 200 development and 100 locked cases.

Every paraphrase and format variant shares a `scenario_id`. A scenario may appear in only one split, preventing closely related examples from leaking into both development and locked checks.

Coverage includes credentials, business email compromise, changed payment details, invoices, delivery, MFA, OAuth, QR lures, callbacks, gift cards, government requests, attachments, promotions, and ordinary business messages that use similar vocabulary.

## Fixture Rules

- Use synthetic examples or fully sanitized examples only.
- Do not commit real private email bodies, screenshots, raw `.eml` files, headers, tracking links, names, account identifiers, phone numbers, addresses, or real inbox data.
- Prefer reserved or clearly synthetic domains such as `.example`, `.test`, or intentionally fake phishing domains.
- Derive abstract patterns from public advisories, never from retained production scans.
- Include both English and Dutch examples before advertising bilingual support for a pattern.
- Mark each fixture as `phishing`, `spam`, or `legitimate`.
- Keep all corpus code outside the runtime analysis path and database.

## Locked Release Gates

The locked split must maintain:

- phishing non-low recall of at least 95%;
- phishing high recall of at least 80%;
- legitimate high rate of at most 2%;
- legitimate non-low rate of at most 10%;
- spam non-low recall of at least 85%;
- an English/Dutch gap no larger than ten percentage points for each metric.

These gates catch code regressions against known synthetic scenarios. Public-beta testing and cautious user messaging remain necessary because new attacks and real email distributions differ from the corpus.

## Cross-Input Consistency

Twelve paired English and Dutch scenarios exercise paste, OCR-shaped screenshot text, Chrome capture payloads, and parsed `.eml` adapters after canonical normalization. For equivalent available evidence, release checks require at least 95% classification agreement, a median absolute score difference no greater than five points, and a p95 difference no greater than ten points. Larger expected differences must be traceable to visible format-enriched factors, such as authentication headers or a displayed-link/destination mismatch.

The initial v3 regression set also verifies that missing screenshot metadata cannot produce `likely_legitimate` merely because sender or destination evidence was unavailable. The paired corpus will grow with authorized synthetic scenarios; production scans remain outside it.

## Production Feedback Boundary

Ordinary scans are not evaluation fixtures and must not be retained for later analysis. The optional feedback feature collects non-content labels such as false positive or false negative, expected classification, score band, language, input mode, analyzer version, and high-level suspicious-signal categories.

Feedback must not include message text, sender addresses, subjects, links, attachments, screenshots, `.eml` files, or prompts. Maintainers should use reported patterns to author new synthetic fixtures instead of copying production messages into the repository.

Accepting real or auto-redacted messages requires a separate approved research-data design and is not part of the current roadmap.

See `docs/feedback.md` for the API allowlist, retention behavior, and synthetic-fixture workflow.

## Running Checks

```bash
npm run test:analysis
```

This validates corpus shape and split isolation, applies the locked gates, reports cross-input classification, median/p95 score deltas, and format-enriched factor agreement, checks factor sums and URL/domain regressions, and verifies AI evidence normalization with synthetic outputs.
