# MeAJOR classifier v2 — blocked privacy remediation candidate

`meajor-logistic-v2` replaces the readable-vocabulary v1 artifact with 30,000
word and 50,000 character lossy FNV-1a feature buckets. Digit-bearing input
tokens are replaced with `number` before feature extraction. The committed v2
artifact therefore contains bucket coefficients rather than corpus vocabulary.

The independent source-held-out record in `meajor-v1-holdout.json` belongs only
to v1 and remains unchanged. It is not evidence for v2. v2 is blocked from
release pending fresh, independently authored English and Dutch evaluation;
analysis-v12 remains blocked.

Development-only validation from the pinned MeAJOR corpus recorded precision
97.3202%, recall 93.1174%, and a 0.8590% false-positive rate. These figures
are not release evidence and must not be used to tune or claim locked-split
performance.
