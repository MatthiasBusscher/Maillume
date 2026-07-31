# Independent Heuristic Corpus Review

This document records the independent evaluation corpus and its initial
60-case `analysis-v7` baseline. A later structural expansion adds independently
written scenarios without changing any of the original locked cases or their
expectations.

It is a repository evaluation set, not a production dataset or a claim of
real-world accuracy.

## Corpus inventory

The corpus contains 108 genuinely distinct scenarios:

| Split | Phishing | Spam | Legitimate | Total |
| --- | ---: | ---: | ---: | ---: |
| Development | 12 | 12 | 12 | 36 |
| Validation | 12 | 12 | 12 | 36 |
| Locked holdout | 12 | 12 | 12 | 36 |
| **Total** | **36** | **36** | **36** | **108** |

Every split contains 18 English and 18 Dutch cases, and all four sources are
represented. The 48-case expansion contributes 16 cases per split: eight spam,
four subtle phishing, and four legitimate hard negatives, with eight cases per
language and exactly four per source. The set includes complete and incomplete
evidence, sender-authentication summaries, attachments, displayed-link
mismatches, an IP-literal destination, punycode, a nested redirect parameter,
URL user information, and a non-default port.

The expansion was authored as new synthetic scenarios, not translations or
format variants. Its new locked cases are sealed and have not been scored or
used to tune detection behavior.

The source modules are deliberately separate:

- `src/lib/evaluation/independent-development.ts`
- `src/lib/evaluation/independent-validation.ts`
- `src/lib/evaluation/independent-holdout.ts`

Runtime scoring code does not import these modules.

## Review checklist

Apply this checklist to every new or changed case:

- [ ] The message is synthetic, independently paraphrased from a cited public
  advisory, or contributed through a separately approved sanitized-example
  process.
- [ ] No real recipient, sender, subject, message body, mailbox identifier,
  tracking link, account number, address, or private header is present.
- [ ] Sender and destination infrastructure uses reserved `.example` or
  `.invalid` domains, or an IETF documentation-only IP range.
- [ ] Provenance records how the scenario was authored and the minimum pattern
  it is intended to preserve.
- [ ] The scenario is materially distinct, not a language, number, reference,
  formatting, or source-adapter variant counted as a new case.
- [ ] The English or Dutch wording is natural and does not merely copy current
  detector phrases.
- [ ] The expected `phishing`, `spam`, or `legitimate` label is justified by
  the requested action and context, not by a brand name alone.
- [ ] A legitimate hard negative exists for risky vocabulary when that
  distinction is important.
- [ ] Evidence availability matches the declared source and does not invent
  link destinations or authentication headers that source cannot expose.
- [ ] The case is placed in exactly one development, validation, or locked
  split.
- [ ] A locked case is not edited after rule tuning begins. A correction must
  be documented and accompanied by a new corpus revision.

`src/lib/evaluation/independent-corpus.test.ts` enforces the corpus size, class
balance, split isolation, expansion-specific language and source distributions,
distinct bodies, provenance, reserved infrastructure, and evidence-availability
coverage.

## Frozen Phase 1 pre-tuning baseline

Generated on 28 July 2026 with:

- analysis version: `analysis-v7`;
- report schema: `heuristic-evaluation-report-v1`;
- corpus revision:
  `sha256:1e4312f0b7648ac4cd9d26635c992c60a2aff41b89e3a7e06fd249f1be670788`;
- no scanner rule, weight, threshold, or classification change.

### Independent-set results

| Dataset | Phishing non-low | Phishing high | Spam non-low | Legitimate non-low | Legitimate high |
| --- | ---: | ---: | ---: | ---: | ---: |
| Development | 12.5% (1/8) | 0.0% (0/8) | 0.0% (0/4) | 12.5% (1/8) | 0.0% (0/8) |
| Validation | 25.0% (2/8) | 12.5% (1/8) | 25.0% (1/4) | 0.0% (0/8) | 0.0% (0/8) |
| Locked holdout | 25.0% (2/8) | 0.0% (0/8) | 0.0% (0/4) | 0.0% (0/8) | 0.0% (0/8) |
| **Combined independent set** | **20.8% (5/24)** | **4.2% (1/24)** | **8.3% (1/12)** | **4.2% (1/24)** | **0.0% (0/24)** |

English phishing non-low detection is 33.3% (4/12); Dutch is 8.3% (1/12).
Complete-evidence phishing non-low detection is 27.8% (5/18), while incomplete
evidence is 0.0% (0/6). These sample sizes are small but clearly disprove the
earlier impression of near-perfect generalization from repeated synthetic
variants.

### Documented failures before tuning

The following case IDs received a low-risk result even though the expected
category was phishing:

- Development: `dev-en-quiet-credential-review`,
  `dev-nl-routine-identity-refresh`, `dev-en-oauth-photo-share-ocr`,
  `dev-nl-directeur-bankwijziging`, `dev-en-qr-benefits-enrolment`,
  `dev-nl-pakket-kleine-heffing`, and
  `dev-nl-antivirus-telefoonfraude`.
- Validation: `validation-en-executive-gift-cards`,
  `validation-en-subscription-callback`,
  `validation-nl-belasting-identificatie-ocr`,
  `validation-nl-mfa-vermoeidheid`,
  `validation-en-payroll-form-ocr`, and
  `validation-nl-bank-helpdesk-callback`.
- Locked holdout: `holdout-en-calendar-credential-lure`,
  `holdout-nl-oauth-contract`, `holdout-en-tax-refund-ocr`,
  `holdout-nl-qr-bankpas`, `holdout-nl-bezorgadres-bevestigen`, and
  `holdout-nl-zorgverzekering-controle-ocr`.

Eleven of twelve independent spam cases also remained low. Only
`validation-nl-seo-audit` reached medium risk. The misses cover cold sales,
newsletters, promotions, investment pitches, gambling, supplements, and
English and Dutch wording.

One legitimate hard negative,
`dev-en-subscribed-newsletter-ocr`, reached medium risk and was classified as
spam because a subscriber discount activated the existing promotion signal.
No legitimate case reached high risk.

The main pre-tuning error clusters are:

1. narrow phrase matching that does not generalize to ordinary paraphrases;
2. risky actions that score too weakly when urgency or a known brand is absent;
3. callback, OAuth/MFA, payment-change, identity, and delivery wording gaps;
4. almost no independent spam coverage outside existing SEO phrases;
5. incomplete OCR evidence producing no positive signal;
6. a newsletter hard negative where subscription context does not suppress a
   promotion match.

The original 20-case locked holdout is frozen at the corpus revision above.
Detection work may use development cases directly and validation cases for
iteration checks. It must not inspect and tune individual rules against locked
outcomes; the locked aggregate is reserved for release comparison. The 16 new
locked scenarios added in the structural expansion are likewise sealed and
remain intentionally unscored until an independently planned evaluation.

## Reproduction

```bash
npm run test:analysis
npm run eval:heuristic
npm run bench:heuristic
```

The evaluation report remains aggregate and content-free. Ordinary user scans
never enter this corpus.
