import assert from "node:assert/strict";

import { V12_HOLDOUT } from "./v12-holdout";

assert.equal(V12_HOLDOUT.length, 36);
assert.equal(new Set(V12_HOLDOUT.map((item) => item.id)).size, 36);

for (const classification of ["phishing", "spam", "legitimate"] as const) {
  const cases = V12_HOLDOUT.filter((item) => item.classification === classification);
  assert.equal(cases.length, 12, `${classification} must contain 12 cases`);
  assert.equal(cases.filter((item) => item.locale === "en").length, 6);
  assert.equal(cases.filter((item) => item.locale === "nl").length, 6);
  for (const source of ["paste", "chrome", "screenshot", "eml"] as const) {
    assert.equal(
      cases.filter((item) => item.source === source).length,
      3,
      `${classification}/${source} must contain three cases`,
    );
  }
}

for (const item of V12_HOLDOUT) {
  assert.equal(item.split, "locked");
  assert.equal(item.provenance.kind, "public_advisory");
  assert.match(item.id, /^v12-(?:phish|spam|legit)-(?:en|nl)-/);
  assert.doesNotMatch(
    JSON.stringify(item.input),
    /@(gmail|hotmail|outlook|yahoo)\.|https?:\/\/(?![^/]*\.(?:example|invalid)(?:[/:]|$))/i,
    `${item.id} must not contain live personal addresses or destinations`,
  );
}

console.log("Checked frozen 36-case v12 holdout structure without scoring it.");
