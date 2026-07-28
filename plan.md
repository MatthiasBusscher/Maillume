# Maillume Heuristic Scanner Improvement Plan

_Created: 2026-07-27 · Status: in progress (Phases 0–1 complete) · Scope: heuristic accuracy, evaluation, and explainability_

## 1. Goal

Improve Maillume's heuristic scanner so that it performs reliably on a broader range of
real-world phishing, spam, and legitimate email without adding hosted AI, external reputation
lookups, background mailbox access, scan history, or unbounded operating cost.

The work should make the scanner:

- more accurate on subtle and previously unseen messages;
- less likely to flag legitimate security, invoice, delivery, and account emails;
- clearer about which evidence was and was not available;
- easier to evaluate with honest, repeatable metrics;
- deterministic, explainable, fast, and privacy-preserving.

This is an accuracy-hardening project, not a promise that Maillume can guarantee whether an
email is safe.

## 2. Current baseline

The current scanner already has a sound architecture:

- deterministic evidence IDs with localized English and Dutch labels;
- weighted identity, destination, intent, delivery, and style families;
- family caps that prevent many weak signals from dominating a score;
- decisive attack-chain rules for several high-risk combinations;
- contextual suppression for credential and MFA safety advice;
- sender-domain, link-mismatch, attachment, QR, and authentication evidence;
- a versioned analysis contract shared by the web app and extension;
- no network requests from the heuristic engine;
- privacy-safe result feedback that excludes message content and links.

The analysis suite currently passes:

- 12 shared calibration fixtures;
- 12 public-advisory/product-template holdout cases;
- a 300-message synthetic corpus;
- English/Dutch parity checks;
- cross-input consistency checks;
- OCR, QR, `.eml`, authentication, request, and privacy regressions.

The synthetic release results are currently perfect, but the 100 locked examples come from
only ten underlying scenarios. Five variants of a scenario mostly differ by a reference line
and number. These tests are useful regression checks, but they do not establish broad
generalization. The independent holdout is also too small and is weighted toward Dutch
advisories.

The first optimization target is therefore evaluation quality, followed by evidence
improvements driven by measured errors.

## 3. Product and privacy boundaries

The following constraints are mandatory throughout this project:

- Ordinary scans remain zero-retention.
- No message, subject, sender, link, result, or prompt is added to analytics or feedback.
- The hosted public scanner remains heuristic-only.
- The heuristic engine performs no DNS, WHOIS, URL fetch, redirect resolution, threat-feed,
  Safe Browsing, or other external lookup.
- The scanner never opens or follows a detected link.
- User feedback never changes production weights automatically.
- User-supplied examples enter a test corpus only through a separate, explicit, documented,
  manually reviewed contribution flow.
- Evaluation fixtures must be synthetic, independently paraphrased from a cited public
  advisory, or explicitly contributed in sanitized form.
- A passing sender-authentication result must not reduce risk; attackers can authenticate
  lookalike domains they control.
- Missing evidence must not be interpreted as reassuring evidence.
- The output remains an automated risk assessment, never a guarantee.

## 4. Non-goals

This project does not include:

- automated Gmail or Outlook scanning or labeling;
- hosted AI analysis or payment integration;
- per-user scan history or sender baselines;
- storing raw false-positive or false-negative messages;
- training a statistical model on user scans;
- live URL detonation, attachment execution, or sandboxing;
- automatic reporting, deletion, quarantine, or mailbox modification;
- a large hardcoded allowlist that labels a message safe solely because it names or uses a
  known organization.

## 5. Success measures

### 5.1 Evaluation-set requirements

Before tuning scoring weights, create an independent evaluation set with at least 60
genuinely distinct cases:

- at least 24 phishing/fraud cases;
- at least 12 spam cases;
- at least 24 legitimate hard-negative cases;
- meaningful English and Dutch representation in every category;
- no templated variation counted as an independent case;
- provenance recorded for every case;
- development and locked-holdout scenarios kept separate;
- coverage of paste, Chrome capture, screenshot, and `.eml` evidence availability.

The existing synthetic corpus remains as a regression suite, but reports must distinguish
the number of messages from the number of genuinely distinct scenarios.

### 5.2 Provisional release gates

Confirm or revise these thresholds after the expanded corpus produces a baseline:

- phishing non-low recall: at least 90%;
- phishing high-risk recall: at least 75%;
- spam non-low recall: at least 85%;
- legitimate non-low rate: at most 10%;
- legitimate high-risk rate: at most 2%;
- English/Dutch metric gap: at most 10 percentage points;
- no known decisive attack-chain regression;
- no result whose score differs from the sum of its visible factors;
- identical normalized evidence produces an identical result;
- missing evidence cannot produce `likely_legitimate`.

Every reported metric must include the numerator, denominator, scenario count, language,
source, and analysis version. Percentages without sample sizes are not sufficient.

### 5.3 Runtime budget

The heuristic engine must remain local and inexpensive:

- no network I/O;
- deterministic output;
- bounded work for the existing maximum input size;
- no catastrophic regular-expression behavior;
- a benchmark command records median and p95 analysis time;
- a change that makes the representative benchmark more than twice as slow requires review
  and justification.

Do not make an absolute millisecond threshold a CI gate until stable measurements exist
across local and GitHub-hosted runners.

## 6. Work plan

### Phase 0 — Establish honest baseline reporting

**Objective:** make evaluation results visible and comparable before changing detection.

**Status:** Completed on 27 July 2026 without changing detection rules, weights,
thresholds, or `analysis-v7`.

Tasks:

- [x] Extract reusable metric calculation from `synthetic-corpus.test.ts`.
- [x] Add `npm run eval:heuristic`.
- [x] Report confusion matrices and rates for phishing, spam, legitimate, and uncertain results.
- [x] Break results down by language, scan source, evidence completeness, and attack category.
- [x] Report both message count and distinct scenario count.
- [x] Support human-readable console output and a machine-readable JSON artifact.
- [x] Record the analysis version and corpus revision in every report.
- [x] Add `npm run bench:heuristic` with representative short, long, link-heavy, and maximum-size
  inputs.
- [x] Save the initial baseline in `docs/heuristic-evaluation.md`.

Likely files:

- `src/lib/evaluation/metrics.ts` (new)
- `src/lib/evaluation/report.ts` (new)
- `src/lib/evaluation/synthetic-corpus.test.ts`
- `src/lib/evaluation/public-advisory-holdout.test.ts`
- `scripts/evaluate-heuristic.mjs` (new)
- `scripts/benchmark-heuristic.mjs` (new)
- `package.json`
- `docs/heuristic-evaluation.md` (new)

Exit criteria:

- [x] One command produces a reproducible baseline.
- [x] Existing release gates still pass.
- [x] The report clearly exposes that repeated synthetic variants are not independent scenarios.

### Phase 1 — Expand the independent evaluation corpus

**Objective:** cover realistic messages that were not written to match the rules.

**Status:** Completed on 28 July 2026 without changing detection rules, weights,
thresholds, or `analysis-v7`. The frozen baseline and failure inventory are in
`docs/independent-corpus-review.md`.

Add distinct cases for:

- credential phishing without urgency;
- low-pressure identity re-verification;
- OAuth consent and MFA fatigue;
- business-email compromise and changed payment instructions;
- executive, supplier, payroll, and tax impersonation;
- QR phishing and callback scams;
- delivery-fee and fake-subscription fraud;
- shared-document and attachment lures;
- hidden links, nested redirect URLs, IP-address URLs, and unusual URL syntax;
- newsletter spam, lead generation, investment spam, and high-risk spam;
- legitimate invoices, receipts, renewals, order tracking, account alerts, password resets,
  security training, newsletters, support tickets, and appointment confirmations;
- legitimate forwarded mail, mailing-list authentication outcomes, and different reply paths;
- messages with incomplete sender, link, or body evidence.

Corpus rules:

- Keep development, validation, and locked-holdout cases in separate modules.
- Never copy full copyrighted or private emails.
- Independently paraphrase advisory patterns and retain only the minimum facts needed.
- Use reserved `.example` and `.invalid` domains.
- Do not let the scoring module import any evaluation fixture.
- Lock holdout cases before modifying the rules they will evaluate.
- Add a corpus-review checklist for privacy, provenance, duplication, language quality, and
  expected classification.

Likely files:

- `src/lib/evaluation/email-fixtures.ts`
- `src/lib/evaluation/public-advisory-holdout.ts`
- `src/lib/evaluation/synthetic-corpus.ts`
- `src/lib/evaluation/independent-holdout.ts` (new)
- corresponding test modules

Exit criteria:

- [x] At least 60 distinct independent cases meet the balance requirements.
- [x] The baseline report includes category, language, source, and evidence-coverage breakdowns.
- [x] Failures are documented before scoring is changed.

### Phase 2 — Strengthen deterministic URL and domain analysis

**Objective:** detect deceptive URL structure without visiting a destination.

Candidate evidence:

- IP-literal destination;
- non-default or deceptive port;
- URL user-info trick such as `trusted.example@attacker.example`;
- punycode/internationalized hostname requiring caution;
- mixed-script hostname where safe local detection is feasible;
- nested or encoded URL in a redirect-style query parameter;
- destination-domain brand lookalike;
- claimed brand, sender domain, and destination domain disagreement;
- suspicious hosted-page destination combined with a sensitive request.

Implementation requirements:

- Normalize once through the analysis envelope.
- Compare registrable domains, not raw subdomain strings.
- Prefer structural facts over broad top-level-domain blocklists.
- Treat punycode as evidence requiring caution, not proof of phishing.
- Do not flag ordinary URL paths ending in `.zip` as a `.zip` hostname.
- Bound nested decoding depth and input length.
- Do not resolve shortened links or redirects over the network.
- Keep URL parsing in a focused module rather than expanding one large heuristic file.

Likely files:

- `src/lib/analysis/url-evidence.ts` (new)
- `src/lib/analysis/url-evidence.test.ts` (new)
- `src/lib/analysis/heuristic-analysis.ts`
- `src/lib/analysis/evidence.ts`
- `src/lib/analysis/analysis-envelope.ts`
- `src/lib/evaluation/*`

Required regressions:

- IPv4, IPv6, localhost, and malformed hosts;
- standard and non-standard ports;
- punycode and Unicode normalization;
- encoded redirects with bounded nested decoding;
- `@` in paths versus URL user-info;
- same-site subdomains versus unrelated registrable domains;
- legitimate internationalized domains;
- URLs truncated by screenshot or selected-text capture.

Exit criteria:

- New evidence improves independent-corpus results.
- Legitimate hard-negative rates stay within their gates.
- No URL is fetched or opened.

### Phase 3 — Improve context, action, and negation handling

**Objective:** distinguish instructions to perform a risky action from warnings, receipts,
completed events, and user-requested actions.

Extend contextual handling beyond credentials and MFA:

- payment requested versus payment received;
- bank details changed versus already-recorded details used;
- reset your password versus a reset you requested;
- approve this login versus never approve an unexpected login;
- delivery fee demanded versus order shipment confirmed;
- call this number now versus use the number in the official directory;
- subscription threat versus ordinary renewal notice;
- promotion lure versus an explicitly subscribed newsletter;
- attachment lure versus a previously discussed report;
- identity verification demand versus in-person appointment instructions.

Implementation approach:

- Introduce reusable sentence/clause segmentation.
- Represent an evidence candidate with its matched span and context.
- Apply narrowly scoped suppressions to a candidate, not to the entire message.
- Keep positive and suppressing rules explicit and testable.
- Avoid general sentiment analysis or opaque probability scores.
- Preserve suspicious evidence elsewhere in a message even when one sentence is a warning.

Likely files:

- `src/lib/analysis/context.ts` (new)
- `src/lib/analysis/context.test.ts` (new)
- `src/lib/analysis/heuristic-analysis.ts`
- `src/lib/analysis/evidence.ts`
- `src/lib/evaluation/*`

Exit criteria:

- Hard-negative performance improves without hiding real attack instructions.
- Mixed messages containing both safety advice and a malicious instruction retain the
  malicious evidence.

### Phase 4 — Add evidence-coverage output

**Objective:** explain how complete the assessment was without presenting a misleading
confidence percentage.

Add an `evidence_coverage` object to the result contract with fields derived from the existing
analysis envelope, for example:

- subject available;
- sender available;
- full content available;
- link destinations available;
- authentication results available;
- attachment evidence available;
- extraction type: direct, OCR, or parsed.

UI behavior:

- Show a concise coverage summary near the classification.
- Explain missing evidence in plain English and Dutch.
- Use a stronger limitation message when only selected text or OCR was available.
- Never subtract risk points because evidence is unavailable.
- Never show `likely_legitimate` when material evidence is incomplete.
- Avoid the word “confidence” unless it refers to a separately defined and validated concept.

Compatibility:

- Treat the result addition as an additive API change.
- Update the web app, OpenAPI contract, extension validator, docs, and tests together.
- Bump the analysis pipeline version if scoring or classification behavior changes.
- Confirm the currently published extension fails safely with the additive response.

Likely files:

- `src/lib/types.ts`
- `src/lib/analysis/analysis-envelope.ts`
- `src/lib/analysis/evidence.ts`
- `src/components/email-scan-form.tsx`
- `integrations/browser-extension/sidepanel.js`
- `integrations/browser-extension/_locales/en/messages.json`
- `integrations/browser-extension/_locales/nl/messages.json`
- API schema/documentation and contract tests

Exit criteria:

- Every result identifies its evidence coverage.
- English and Dutch UI and accessibility tests pass.
- No existing client accepts a malformed coverage object.

### Phase 5 — Expand decisive attack-chain scoring

**Objective:** recognize combinations that are more meaningful together than separately.

Evaluate explicit chains such as:

- brand lookalike + credential request + destination mismatch;
- executive impersonation + secrecy/urgency + payment request;
- changed bank details + invoice or supplier context;
- QR lure + account threat + identity/payment request;
- fake security alert + callback instruction;
- OAuth consent request + shared-document lure;
- sender-authentication failure + brand claim + sensitive action;
- delivery problem + small fee + return pressure.

Rules:

- Add a chain only when supported by independent evaluation cases.
- A chain may raise severity, but all contributing factors must remain visible.
- Avoid duplicate points for semantically identical evidence.
- Keep family caps unless the evaluation shows a documented reason to revise them.
- Do not tune a weight using the locked holdout and then continue calling it a holdout.

Likely files:

- `src/lib/analysis/evidence.ts`
- `src/lib/analysis/heuristic-analysis.ts`
- `src/lib/evaluation/*`

Exit criteria:

- Each new chain has positive, incomplete, negated, and legitimate regression cases.
- Weight and threshold changes include before/after metrics.

### Phase 6 — Use privacy-safe feedback for calibration

**Objective:** let real users identify weak areas without collecting their email.

Tasks:

- Aggregate feedback by analysis version, source, locale, score band, expected classification,
  feedback kind, and coarse signal category.
- Add a maintainer-only, content-free evaluation query/report.
- Define minimum sample sizes before treating feedback rates as meaningful.
- Exclude obvious abuse, duplicates, tests, and unsupported conclusions.
- Use recurring feedback patterns to choose new independently written fixtures.
- Optionally add the existing feedback flow to the Chrome extension after a separate privacy
  and abuse review.
- Document a separate opt-in route for contributing a manually redacted example; do not add
  raw content fields to the existing feedback table.

Rules:

- No automatic production-weight updates.
- No message IDs, mailbox IDs, sender addresses, subjects, bodies, links, results, IP
  addresses, or user identifiers in the analysis report.
- Do not publish small aggregates that could reveal an individual.

Likely files:

- `src/lib/feedback/*`
- a content-free reporting script or protected operator query
- `docs/heuristic-evaluation.md`
- extension feedback files only if separately approved

Exit criteria:

- The maintainer can identify recurring false-positive/false-negative categories without
  access to scanned content.
- Feedback-derived changes still pass the independent locked holdout.

### Phase 7 — Release, documentation, and monitoring

**Objective:** ship improvements as a reviewable analysis-version update.

Tasks:

- Produce a before/after evaluation report.
- Review every score and classification threshold change.
- Bump `ANALYSIS_PIPELINE_VERSION` when behavior changes.
- Update English and Dutch result copy.
- Update the OpenAPI contract and extension compatibility range.
- Run typecheck, lint, analysis, security, integration, extension, build, and browser suites.
- Build and scan the production container.
- Test the web app and packaged extension against the same revision.
- Add release notes explaining improved categories and known limitations.
- Monitor only aggregate, content-free feedback and quota/availability counters.

Exit criteria:

- All release gates pass.
- The production health endpoint reports the intended analysis version.
- Web and extension results use the same analysis contract.
- Rollback remains possible through the previous immutable container digest.

## 7. Recommended implementation sequence

Keep pull requests small enough to review independently:

1. Baseline metric/reporting utilities; no scoring change.
2. Benchmark command; no scoring change.
3. Expanded independent corpus; document failures without fixing them in the same PR.
4. URL/domain evidence module and tests.
5. Context/action/negation module and hard negatives.
6. Evidence-coverage contract and web UI.
7. Evidence-coverage support in the extension.
8. Attack-chain and weight calibration backed by before/after metrics.
9. Privacy-safe aggregate feedback reporting.
10. Analysis-version release PR with complete acceptance evidence.

Do not combine corpus creation and rule tuning in one PR when the new cases are intended to
act as a holdout.

## 8. Definition of done

- [x] Evaluation reporting distinguishes distinct scenarios from generated variants.
- [x] At least 60 independent cases satisfy the corpus requirements.
- [ ] Provisional release metrics are confirmed or replaced with justified thresholds.
- [ ] URL and domain analysis covers the approved structural signals without network access.
- [ ] Context handling covers the approved hard-negative categories.
- [ ] Every result clearly reports evidence coverage.
- [ ] New attack chains are independently justified and visibly explainable.
- [ ] Privacy-safe feedback can guide fixture priorities without exposing scan content.
- [ ] Runtime remains deterministic, bounded, and within the reviewed regression budget.
- [ ] English and Dutch behavior remains within the language-parity gate.
- [ ] Web, API, and extension contracts are compatible and tested.
- [ ] The analysis version is bumped and documented for behavioral changes.
- [ ] All CI, security, browser, extension, and production-image checks pass.
- [ ] No hosted AI, external lookup, mailbox access, or scan-history dependency is introduced.

## 9. First implementation task

Begin with Phase 0 only:

1. [x] Add reusable evaluation metrics.
2. [x] Add `npm run eval:heuristic`.
3. [x] Report scenario counts and confusion matrices.
4. [x] Add a non-gating benchmark command.
5. [x] Commit the baseline report without changing a single evidence rule, weight, threshold, or
   analysis version.

This creates an honest measurement foundation for every scanner improvement that follows.
