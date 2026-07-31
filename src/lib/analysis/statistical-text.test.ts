import assert from "node:assert/strict";

import modelArtifact from "./models/meajor-v2.json";
import {
  isLikelyEnglishText,
  isStatisticallyUnwantedText,
  scoreStatisticalUnwantedText,
  STATISTICAL_TEXT_MODEL_METADATA,
} from "./statistical-text";

assert.deepEqual(
  {
    modelVersion: STATISTICAL_TEXT_MODEL_METADATA.modelVersion,
    datasetDoi: STATISTICAL_TEXT_MODEL_METADATA.datasetDoi,
    datasetLicense: STATISTICAL_TEXT_MODEL_METADATA.datasetLicense,
    datasetChecksum: STATISTICAL_TEXT_MODEL_METADATA.datasetChecksum,
    featureCount: STATISTICAL_TEXT_MODEL_METADATA.featureCount,
  },
  {
    modelVersion: "meajor-logistic-v2",
    datasetDoi: "10.5281/zenodo.18471483",
    datasetLicense: "CC-BY-4.0",
    datasetChecksum: "aa8f59e96787cbd696c0b650e5400dc9",
    featureCount: 80_000,
  },
);
assert.deepEqual(modelArtifact.tokenizer, {
  normalization: "NFKD-strip-marks-lower-ascii-alnum-digit-redaction",
  features: "word-unigrams-and-bigrams-plus-character-3-to-5-grams",
  representation: "lossy-fnv1a-feature-buckets",
  word_bucket_count: 30_000,
  character_bucket_count: 50_000,
  sublinear_tf: true,
  l2_normalized: true,
});

const parityFixtures = [
  {
    subject: "Quarterly planning notes",
    body: "The team meeting is Thursday. Please review the attached agenda in the project portal.",
    expected: 0.0055862550603031505,
  },
  {
    subject: "Exclusive offer today",
    body: "Buy discounted supplements now and claim your free bonus before this offer ends.",
    expected: 0.9725224096815966,
  },
  {
    subject: "Account verification required",
    body: "Confirm your password immediately at the secure link or your mailbox will be suspended.",
    expected: 0.816251473607917,
  },
] as const;

for (const fixture of parityFixtures) {
  const actual = scoreStatisticalUnwantedText(fixture.subject, fixture.body);
  assert.ok(
    Math.abs(actual - fixture.expected) < 1e-8,
    `TypeScript inference must reproduce training inference: ${actual} vs ${fixture.expected}`,
  );
}

assert.equal(
  isStatisticallyUnwantedText(
    "Quarterly planning notes",
    "The team meeting is Thursday. Please review the attached agenda in the project portal.",
  ),
  false,
);
assert.equal(
  isStatisticallyUnwantedText(
    "Exclusive offer today",
    "Buy discounted supplements now and claim your free bonus before this offer ends.",
  ),
  true,
);
assert.equal(
  isLikelyEnglishText(
    "Aantekeningen overleg website",
    "Dank voor het overleg van vanmiddag. Ik stuur morgen de bijgewerkte planning voor de homepage door.",
  ),
  false,
);
assert.equal(
  isLikelyEnglishText(
    "Account verification required",
    "Confirm your password immediately or your mailbox will be suspended today.",
  ),
  true,
);

for (const feature of modelArtifact.features) {
  assert.deepEqual(
    Object.keys(feature).sort(),
    ["bucket", "idf", "kind", "weight"],
    "Model features must contain only the approved derived fields",
  );
  assert.ok(Number.isInteger(feature.bucket));
  assert.ok(feature.bucket >= 0);
  assert.ok(feature.bucket < (feature.kind === "word" ? 30_000 : 50_000));
}
assert.equal(
  new Set(modelArtifact.features.map((feature) => `${feature.kind}:${feature.bucket}`)).size,
  80_000,
  "Each feature bucket must appear exactly once for its feature kind.",
);

assert.doesNotMatch(
  JSON.stringify(modelArtifact),
  /"term"\s*:|@|https?:|[<>]/i,
  "The distributed artifact must contain non-readable buckets, never corpus terms.",
);
assert.equal(
  scoreStatisticalUnwantedText("Payment 123456789", "Reference 987654321"),
  scoreStatisticalUnwantedText("Payment 42", "Reference 7"),
  "Digit-bearing input tokens must be redacted before feature hashing.",
);

console.log("Checked licensed statistical text model integrity and inference parity.");
