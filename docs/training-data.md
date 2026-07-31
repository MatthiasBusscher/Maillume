# Training data

Maillume's runtime and release artifacts do not contain raw third-party email
corpora. Ordinary user scans are never retained or used for training.

## MeAJOR v2.0

The optional offline classifier training pipeline uses:

- **Dataset:** MeAJOR: Merged email Assets from Joint Open-source Repositories
- **Version:** 2.0
- **DOI:** <https://doi.org/10.5281/zenodo.18471483>
- **Publisher:** Zenodo
- **License:** Creative Commons Attribution 4.0 International (`CC-BY-4.0`)
- **Creators:** Francisco Cardoso, João Vitorino, Paulo Mendes, Eva Maia, and
  Isabel Praça
- **CSV size:** 191,121,228 bytes
- **CSV MD5:** `aa8f59e96787cbd696c0b650e5400dc9`

The official Zenodo record describes 108,685 anonymized, preprocessed examples
with a binary label: benign or phishing. It combines TREC-05, TREC-06, TREC-07,
the Nazario Phishing Corpus, and Nigerian Fraud. Its binary label is not treated
as a reliable distinction between unsolicited spam and credential/payment
phishing.

Training downloads are stored under ignored `.training-data/` and must never be
committed, included in the application image, or packaged with the browser
extension. Only reproducible preprocessing code, attribution, aggregate
evaluation results, and compact derived model parameters may be committed. The
derived model stores lossy FNV-1a feature-bucket coefficients, never vocabulary
terms. Before hashing, every digit-bearing token is replaced by the
generic `number` token. This prevents phone, account, invoice, campaign, and
name-number identifiers from becoming part of the distributed artifact.

The current artifact is `meajor-logistic-v2` in `meajor-v2.json`. The retained
`docs/releases/meajor-v1-holdout.json` is historical, immutable evidence for
the earlier readable-vocabulary v1 artifact; it must not be treated as evidence
for v2. v2 remains blocked from release until it has fresh, independently
authored English and Dutch evaluation evidence.

The data is used to estimate whether text resembles the licensed corpus's
malicious class. Deterministic Maillume evidence remains responsible for the
user-visible classification and score factors. Model output cannot turn missing
evidence into `likely_legitimate`, and it cannot silently contribute points.
Inference is bounded to the subject and first 200 characters so the supporting
model cannot make maximum-size scans unreasonably expensive.

## Reuse conditions

Any distributed derived artifact must retain this attribution, link to the
license and source record, and identify Maillume's preprocessing and training as
changes. Maintainers must re-check the Zenodo record and file checksum before
training a new model version.

This review approves only the anonymized MeAJOR v2.0 deposit above. It does not
approve downloading or training on the raw SpamAssassin, Enron, TREC, Nazario,
or Nigerian Fraud corpora separately, and it does not change the prohibition on
training from Maillume user scans.
