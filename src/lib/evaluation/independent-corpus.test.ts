import assert from "node:assert/strict";

import { createAnalysisEnvelope } from "../analysis/analysis-envelope";
import type { ScanSource } from "../types";
import {
  INDEPENDENT_CORPUS,
  INDEPENDENT_DEVELOPMENT,
  INDEPENDENT_HOLDOUT,
  INDEPENDENT_VALIDATION,
} from "./independent-corpus";
import {
  EVALUATION_EXPECTATIONS,
  type EvaluationExpectation,
} from "./types";

const splits = {
  development: INDEPENDENT_DEVELOPMENT,
  validation: INDEPENDENT_VALIDATION,
  locked: INDEPENDENT_HOLDOUT,
};

assert.equal(INDEPENDENT_CORPUS.length, 108);
assert.equal(new Set(INDEPENDENT_CORPUS.map((item) => item.id)).size, 108);

for (const [split, cases] of Object.entries(splits)) {
  assert.equal(cases.length, 36, `${split} must contain 36 distinct cases`);
  assert.ok(cases.every((item) => item.split === split));
  assert.deepEqual(
    countBy(cases.map((item) => item.classification)),
    { phishing: 12, spam: 12, legitimate: 12 },
    `${split} must keep the required class balance`,
  );
  assert.deepEqual(
    countByValue(cases.map((item) => item.locale)),
    { en: 18, nl: 18 },
    `${split} must keep equal English and Dutch representation`,
  );
  const expansionCases = cases.slice(20);
  assert.equal(expansionCases.length, 16, `${split} must add exactly 16 cases`);
  assert.deepEqual(
    countBy(expansionCases.map((item) => item.classification)),
    { phishing: 4, spam: 8, legitimate: 4 },
    `${split} expansion must have the requested class mix`,
  );
  assert.deepEqual(
    countByValue(expansionCases.map((item) => item.locale)),
    { en: 8, nl: 8 },
    `${split} expansion must keep equal English and Dutch representation`,
  );
  assert.deepEqual(
    countByValue(expansionCases.map((item) => item.source)),
    { paste: 4, screenshot: 4, chrome: 4, eml: 4 },
    `${split} expansion must include exactly four cases for each source`,
  );
}

assert.deepEqual(
  countBy(INDEPENDENT_CORPUS.map((item) => item.classification)),
  { phishing: 36, spam: 36, legitimate: 36 },
);

for (const expectation of EVALUATION_EXPECTATIONS) {
  const categoryCases = INDEPENDENT_CORPUS.filter(
    (item) => item.classification === expectation,
  );
  assert.ok(
    categoryCases.some((item) => item.locale === "en"),
    `${expectation} must include English cases`,
  );
  assert.ok(
    categoryCases.some((item) => item.locale === "nl"),
    `${expectation} must include Dutch cases`,
  );
}

for (const source of ["paste", "chrome", "screenshot", "eml"] satisfies ScanSource[]) {
  assert.ok(
    INDEPENDENT_CORPUS.some((item) => item.source === source),
    `independent corpus must cover ${source}`,
  );
}

const envelopes = INDEPENDENT_CORPUS.map((item) =>
  createAnalysisEnvelope(item.input, item.source),
);
assert.ok(
  envelopes.some((envelope) =>
    envelope.availability.sender
    && envelope.availability.linkDestinations
    && envelope.availability.contentComplete
  ),
  "independent corpus must include complete evidence",
);
assert.ok(
  envelopes.some((envelope) =>
    !envelope.availability.sender
    || !envelope.availability.linkDestinations
    || !envelope.availability.contentComplete
  ),
  "independent corpus must include incomplete evidence",
);
assert.ok(
  envelopes.some((envelope) => envelope.availability.authenticationHeaders),
  "independent corpus must include parsed authentication evidence",
);
assert.ok(
  INDEPENDENT_CORPUS.some((item) =>
    (item.input.attachmentRiskTypes?.length ?? 0) > 0
  ),
  "independent corpus must include attachment evidence",
);

const normalizedBodies = new Set<string>();
for (const item of INDEPENDENT_CORPUS) {
  const normalizedBody = item.input.body.toLocaleLowerCase(item.locale).replace(/\s+/g, " ");
  assert.ok(
    !normalizedBodies.has(normalizedBody),
    `${item.id}: repeated message body is not an independent scenario`,
  );
  normalizedBodies.add(normalizedBody);

  assert.equal(item.input.locale, item.locale);
  assert.ok(item.provenance, `${item.id}: provenance is required`);
  if (item.provenance.kind === "synthetic") {
    assert.equal(item.provenance.authoring, "independently_written");
    assert.ok(item.provenance.basis.length >= 20);
  }

  if (item.input.senderEmail) {
    assert.match(
      item.input.senderEmail,
      /@(?:[a-z0-9-]+\.)*(?:example|invalid)$/i,
      `${item.id}: sender must use a reserved domain`,
    );
  }
  for (const link of [
    ...(item.input.links ?? []),
    ...(item.input.linkPairs ?? []).flatMap((pair) => [
      pair.displayedUrl,
      pair.destinationUrl,
    ]),
  ]) {
    assert.match(
      new URL(link).hostname,
      /(?:\.(?:example|invalid)$|^203\.0\.113\.42$)/i,
      `${item.id}: link must use a reserved domain or documentation IP`,
    );
  }
}

console.log("Independent 108-case corpus structure passed.");

function countBy(
  values: EvaluationExpectation[],
): Record<EvaluationExpectation, number> {
  return Object.fromEntries(
    EVALUATION_EXPECTATIONS.map((expectation) => [
      expectation,
      values.filter((value) => value === expectation).length,
    ]),
  ) as Record<EvaluationExpectation, number>;
}

function countByValue<T extends string>(values: T[]): Record<T, number> {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {} as Record<T, number>);
}
