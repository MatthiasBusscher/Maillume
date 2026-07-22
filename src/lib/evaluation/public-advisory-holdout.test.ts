import assert from "node:assert/strict";

import { analyzeEmailHeuristic } from "../analysis/heuristic-analysis";
import { PUBLIC_ADVISORY_HOLDOUT } from "./public-advisory-holdout";

assert.equal(PUBLIC_ADVISORY_HOLDOUT.length, 12);
assert.equal(new Set(PUBLIC_ADVISORY_HOLDOUT.map((item) => item.id)).size, 12);

const results = PUBLIC_ADVISORY_HOLDOUT.map((item) => ({
  item,
  result: analyzeEmailHeuristic(item.input),
}));
const phishing = results.filter(({ item }) => item.expected === "phishing");
const legitimate = results.filter(({ item }) => item.expected === "legitimate");

for (const { item } of results) {
  if (item.provenance.kind === "public_advisory") {
    assert.match(item.provenance.url, /^https:\/\/opgelicht\.avrotros\.nl\/alerts\//);
  } else {
    assert.match(item.provenance.path, /^supabase\/templates\//);
  }
  assert.match(item.input.senderEmail ?? "", /\.(?:example|invalid)$/);
}
assert.ok(
  phishing.filter(({ result }) => result.risk_level !== "low").length / phishing.length >= 0.8,
  "Public-advisory phishing holdout non-low recall must remain at least 80%",
);
assert.ok(
  legitimate.filter(({ result }) => result.risk_level !== "low").length / legitimate.length <= 0.2,
  "Public-advisory hard-negative non-low rate must remain at most 20%",
);
assert.ok(legitimate.every(({ result }) => result.classification !== "likely_phishing"));

console.log("Public-advisory holdout gates passed.");
