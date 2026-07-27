# Heuristic Evaluation Baseline

This document records the Phase 0 baseline for Maillume's deterministic heuristic
engine. It establishes a repeatable measurement process before any detection rule,
weight, risk threshold, or analysis version changes.

The baseline is a repository regression inventory, not a measurement of real-world
accuracy. Many cases are bilingual paraphrases or source-format variants of the same
scenario. Results therefore report both case counts and distinct scenario counts.

## Reproduce the report

Run the human-readable report:

```bash
npm run eval:heuristic
```

Write the machine-readable report:

```bash
npm run eval:heuristic -- --format json --output heuristic-evaluation.json
```

The JSON report uses schema `heuristic-evaluation-report-v1`. Every report records:

- the analysis version;
- a SHA-256 revision over the evaluation corpus and scenario metadata;
- its generation timestamp;
- case and scenario counts;
- expected-versus-predicted confusion matrices;
- phishing, spam, and legitimate risk-level rates;
- breakdowns by dataset, language, scan source, evidence completeness, and attack
  category.

Reports contain aggregate fixture results only. They contain no fixture message text
and no production scan content.

## Initial baseline

Generated on 27 July 2026 with:

- analysis version: `analysis-v7`;
- report schema: `heuristic-evaluation-report-v1`;
- corpus revision:
  `sha256:94800e6d07bdbd8613394d9034e24edd99b29f66e0fcfeb0531c02a7998ab0dc`;
- 396 cases representing 72 distinct scenarios.

### Dataset inventory

| Dataset | Cases | Scenarios | Phishing non-low | Phishing high | Spam non-low | Legitimate non-low | Legitimate high |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Calibration | 12 | 12 | 100.0% (5/5) | 80.0% (4/5) | 100.0% (3/3) | 0.0% (0/4) | 0.0% (0/4) |
| Public-advisory holdout | 12 | 12 | 83.3% (5/6) | 0.0% (0/6) | n/a | 0.0% (0/6) | 0.0% (0/6) |
| Synthetic development | 200 | 20 | 100.0% (70/70) | 42.9% (30/70) | 100.0% (30/30) | 0.0% (0/100) | 0.0% (0/100) |
| Synthetic locked | 100 | 10 | 100.0% (30/30) | 100.0% (30/30) | 100.0% (20/20) | 0.0% (0/50) | 0.0% (0/50) |
| Cross-input | 72 | 18 | 100.0% (56/56) | 26.8% (15/56) | n/a | 0.0% (0/16) | 0.0% (0/16) |

The combined inventory reports 99.4% phishing non-low detection (166/167 cases),
47.3% phishing high-risk detection (79/167), 100.0% spam non-low detection (53/53),
and 0.0% legitimate non-low/high results (0/176). These combined percentages mix
calibration, repeated synthetic variants, independent holdout cases, and repeated
source adapters. They must not be presented as product accuracy claims.

### Confusion matrix

Cells show `cases / distinct scenarios`.

| Expected | Predicted phishing | Predicted spam | Predicted legitimate | Predicted uncertain |
| --- | ---: | ---: | ---: | ---: |
| Phishing | 166 / 34 | 0 / 0 | 0 / 0 | 1 / 1 |
| Spam | 0 / 0 | 53 / 8 | 0 / 0 | 0 / 0 |
| Legitimate | 0 / 0 | 0 / 0 | 135 / 22 | 41 / 11 |

`uncertain` is a classification, while the release rates above use risk levels. A
low-risk result may deliberately remain uncertain when evidence is incomplete or a
small positive signal prevents a strong legitimate classification.

### Important breakdown observations

- English contains 199 cases across 52 scenarios; Dutch contains 197 cases across
  50 scenarios. Phishing non-low is 100.0% in English and 98.8% in Dutch.
- Paste contributes 342 cases. Chrome, `.eml`, and screenshot each contribute 18
  cross-input cases, so their source-specific percentages are adapter regressions,
  not independent accuracy estimates.
- 376 cases have complete material evidence and 20 are incomplete. The incomplete
  group consists of screenshot inputs and malformed-MIME cases; all 16 phishing cases
  in that group remain non-low, while only 2 are high.
- The weakest phishing attack-category non-low result is link deception at 91.7%
  (11/12 cases across three scenarios). This is a useful investigation target, but
  Phase 0 intentionally makes no scoring change.
- No legitimate case becomes medium or high in this inventory. That is reassuring
  for regression testing but not evidence of a zero real-world false-positive rate.

Use the full command output or JSON artifact for all attack-category and source
breakdowns. Do not compare percentages without also comparing corpus revisions and
scenario counts.

## Performance baseline

Run the diagnostic benchmark:

```bash
npm run bench:heuristic
```

For JSON output or a shorter local run:

```bash
npm run bench:heuristic -- --format json --output heuristic-benchmark.json
npm run bench:heuristic -- --iterations 100 --warmup 20
```

The initial local run used Node `v25.8.0` on macOS/arm64 with 1,000 measured and 100
warm-up iterations per scenario. It measures the normalized heuristic engine; API
transport, request validation, file parsing, OCR, and browser capture are outside
this microbenchmark.

| Scenario | Body characters | Links | Median | p95 |
| --- | ---: | ---: | ---: | ---: |
| Short suspicious message | 76 | 0 | 0.029 ms | 0.071 ms |
| Long neutral message | 10,000 | 0 | 0.664 ms | 0.971 ms |
| Link-heavy message | 718 | 20 | 0.104 ms | 0.152 ms |
| Maximum-size message | 20,000 | 0 | 1.263 ms | 1.424 ms |

Timing depends on hardware, operating system, Node version, and process load. This
benchmark is non-gating until stable measurements exist across local and GitHub-hosted
runners. It is intended to reveal large regressions, not enforce absolute
millisecond limits.

## Change protocol

For a future heuristic change:

1. save the before report and benchmark;
2. implement one explainable change;
3. rerun `npm run test:analysis`, `npm run eval:heuristic`, and
   `npm run bench:heuristic`;
4. compare both cases and distinct scenarios, especially the independent holdout;
5. document intentional behavior changes and bump the analysis version when the
   production result contract changes.

The locked release gates remain authoritative for known regression coverage. A
better synthetic score alone is not sufficient evidence to ship a rule.
