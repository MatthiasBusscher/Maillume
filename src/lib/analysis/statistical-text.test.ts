import assert from "node:assert/strict";

import modelArtifact from "./models/meajor-v1.json";
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
    modelVersion: "meajor-logistic-v1",
    datasetDoi: "10.5281/zenodo.18471483",
    datasetLicense: "CC-BY-4.0",
    datasetChecksum: "aa8f59e96787cbd696c0b650e5400dc9",
    featureCount: 80_000,
  },
);

const parityFixtures = [
  {
    subject: "Quarterly planning notes",
    body: "The team meeting is Thursday. Please review the attached agenda in the project portal.",
    expected: 0.00681979929193642,
  },
  {
    subject: "Exclusive offer today",
    body: "Buy discounted supplements now and claim your free bonus before this offer ends.",
    expected: 0.9752727119500829,
  },
  {
    subject: "Account verification required",
    body: "Confirm your password immediately at the secure link or your mailbox will be suspended.",
    expected: 0.7824234330357747,
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
    ["idf", "kind", "term", "weight"],
    "Model features must contain only the approved derived fields",
  );
  assert.doesNotMatch(feature.term, /@|https?:|[<>]/i);
  if (feature.kind === "character") {
    assert.ok(feature.term.length >= 3 && feature.term.length <= 5);
  } else {
    assert.ok(feature.term.split(" ").length <= 2);
  }
}

console.log("Checked licensed statistical text model integrity and inference parity.");
