# Synthetic Evaluation

Maillume uses repository-only synthetic and sanitized public-advisory corpora to calibrate `analysis-v10` without retaining or collecting users' email.

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

## Public Advisory Regressions

Confirmed public advisories may contribute independently written, sanitized regression fixtures. Each fixture records the advisory URL and publication date, but replaces real recipients, sender addresses, destinations, identifiers, and message-specific details with reserved synthetic data. The fixture should preserve only the attack mechanism and the wording needed to exercise it.

The frozen advisory holdout currently contains 12 independently written phishing and legitimate hard-negative cases, including two Maillume product-template regressions. It is evaluated separately from the generated 300-case corpus and is never imported by runtime scoring code.

This is deliberately not a production database of known phishing emails. Maillume does not retain user scans or perform exact-message lookup. Campaign text and infrastructure change too quickly for signatures to be a sufficient detector; advisory-derived phishing fixtures must be paired with similar legitimate hard negatives so a new rule cannot improve recall by silently degrading precision.

## Independent Development, Validation, and Holdout Corpus

The heuristic improvement project adds 60 distinct, independently written
scenarios: 24 phishing, 12 spam, and 24 legitimate hard negatives. Development,
validation, and locked holdout cases live in separate modules and are counted
once each; there are no generated reference-number or language variants in this
set.

The corpus covers English and Dutch, paste, Chrome, screenshot/OCR, and `.eml`
sources, plus different levels of sender, link, authentication, attachment, and
content completeness. Its first baseline was captured before detection tuning.
See [the independent corpus review](independent-corpus-review.md) for the review
checklist, frozen revision, and documented failures.

## Cross-Input Consistency

Eighteen paired English and Dutch scenarios exercise paste, OCR-shaped screenshot text, Chrome capture payloads, and parsed `.eml` adapters after canonical normalization. The matrix includes credential, payment-change, delivery, MFA/OAuth, business-email-compromise, callback-fraud, malformed-MIME, promotion, and legitimate invoice cases. The adapters mirror the real evidence boundary: screenshots can recover explicitly labelled subject and sender fields from OCR and can decode an HTTP(S) destination embedded in a QR code, but cannot reveal ordinary button destinations; Chrome and `.eml` can preserve richer sender, subject, and destination evidence.

Parity is measured only where the available evidence is equivalent. Those comparisons require at least 95% classification agreement and median and p95 score differences no greater than five points. Format-enriched factors, such as a displayed-link/destination mismatch, are compared between Chrome and `.eml`. OCR-only phishing fixtures must not fall to low risk, and missing screenshot metadata must produce uncertainty rather than a claim that the message is likely legitimate.

The browser suite also renders synthetic BEC and callback messages to PNG and passes them through the real local OCR path. Those screenshots must remain above low risk without loading OCR assets from third parties.

These checks measure adapter consistency and a source-specific safety floor, not real-world accuracy. The paired corpus will grow with authorized synthetic scenarios; production scans remain outside it.

## Production Feedback Boundary

Ordinary scans are not evaluation fixtures and must not be retained for later analysis. The optional feedback feature collects non-content labels such as false positive or false negative, expected classification, score band, language, input mode, analyzer version, and high-level suspicious-signal categories.

Feedback must not include message text, sender addresses, subjects, links, attachments, screenshots, `.eml` files, or prompts. Maintainers should use reported patterns to author new synthetic fixtures instead of copying production messages into the repository.

Accepting real or auto-redacted messages requires a separate approved research-data design and is not part of the current roadmap.

See `docs/feedback.md` for the API allowlist, retention behavior, and synthetic-fixture workflow.
Maintainers can use `npm run report:feedback` to retrieve only thresholded, content-free
aggregate cells; the command cannot retrieve raw feedback rows.

## Running Checks

```bash
npm run test:analysis
npm run eval:heuristic
npm run bench:heuristic
```

This validates corpus shape and split isolation, applies the locked gates, reports cross-input classification, median/p95 score deltas, and format-enriched factor agreement, checks factor sums and URL/domain regressions, and verifies AI evidence normalization with synthetic outputs.

`npm run eval:heuristic` emits an aggregate human-readable report across all
repository evaluation sets. Add `-- --format json --output
heuristic-evaluation.json` for a machine-readable artifact. The report records the
analysis version, a SHA-256 corpus revision, confusion matrices, both case and
scenario counts, and breakdowns by dataset, language, source, evidence completeness,
and attack category.

`npm run bench:heuristic` measures representative short, long, link-heavy, and
maximum-size normalized inputs. It measures the heuristic engine rather than API
transport, parsing, OCR, or browser capture. It is diagnostic and deliberately does
not enforce an absolute CI timing threshold.

See [the heuristic evaluation baseline](heuristic-evaluation.md) for the initial
`analysis-v8` results, interpretation limits, performance measurements, and the
comparison protocol for future scanner changes.

The current result also reports the evidence boundary introduced in `analysis-v9` for each
observation. See [evidence coverage](evidence-coverage.md) for its derivation,
classification rule, compatibility plan, and validation coverage.
