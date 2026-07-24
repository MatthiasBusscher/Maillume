import assert from "node:assert/strict";

import { AI_ANALYSIS_SYSTEM_PROMPT, buildAiAnalysisUserPrompt } from "../analysis/ai-prompt";
import { normalizeAiAnalysisResult } from "../analysis/ai-schema";
import { DERIVED_EVIDENCE_IDS, MODEL_EVIDENCE_IDS } from "../analysis/evidence";
import { emailEvaluationFixtures, type EvaluationCategory, type EvaluationLanguage } from "./email-fixtures";

const REQUIRED_CATEGORIES: EvaluationCategory[] = ["phishing", "spam", "legitimate"];
const REQUIRED_LANGUAGES: EvaluationLanguage[] = ["en", "nl"];
const FORBIDDEN_PRIVATE_MARKERS = ["matthias", "@gmail.com", "@icloud.com"];

const ids = new Set<string>();
const categories = new Set<EvaluationCategory>();
const languages = new Set<EvaluationLanguage>();

for (const fixture of emailEvaluationFixtures) {
  assert.ok(!ids.has(fixture.id), `duplicate evaluation fixture id: ${fixture.id}`);
  ids.add(fixture.id);
  categories.add(fixture.category);
  languages.add(fixture.language);

  const serialized = JSON.stringify(fixture).toLowerCase();

  for (const marker of FORBIDDEN_PRIVATE_MARKERS) {
    assert.ok(!serialized.includes(marker), `${fixture.id}: fixture includes private marker ${marker}`);
  }

  assert.ok(
    fixture.input.senderEmail?.endsWith(".example") ||
      fixture.input.senderEmail?.endsWith(".example.nl") ||
      /@(microsoft-login-alert|mcafee-veiligheid|paypal-service|postnl-betaal-check)[a-z0-9-]*\./.test(
        fixture.input.senderEmail ?? "",
      ),
    `${fixture.id}: sender should use synthetic or reserved domains`,
  );

  const prompt = buildAiAnalysisUserPrompt(fixture.input);
  const promptPayload = JSON.parse(prompt.split("\n").at(-1) ?? "{}") as { body?: string };
  assert.equal(promptPayload.body, fixture.input.body, `${fixture.id}: AI prompt should preserve fixture body as JSON data`);

  const normalized = normalizeAiAnalysisResult({
    evidence_ids: fixture.category === "legitimate" ? [] : ["urgency_pressure"],
  });

  assert.ok(Array.isArray(normalized), `${fixture.id}: AI evidence should normalize`);
}

for (const category of REQUIRED_CATEGORIES) {
  assert.ok(categories.has(category), `missing evaluation category: ${category}`);
}

for (const language of REQUIRED_LANGUAGES) {
  assert.ok(languages.has(language), `missing evaluation language: ${language}`);
}

assert.ok(
  AI_ANALYSIS_SYSTEM_PROMPT.includes("Return only the requested structured JSON field."),
  "AI prompt should require structured JSON output",
);
assert.ok(
  AI_ANALYSIS_SYSTEM_PROMPT.includes("a completed password change or safety advice does not qualify"),
  "AI prompt should distinguish credential requests from hard-negative mentions",
);

// An AI provider is sent normalized message text, never authentication headers, so
// derived evidence is kept out of its vocabulary and rejected if it claims one.
for (const derivedId of DERIVED_EVIDENCE_IDS) {
  assert.ok(
    !MODEL_EVIDENCE_IDS.includes(derivedId as never),
    `${derivedId} must not be offered to an AI provider`,
  );
  assert.ok(
    !AI_ANALYSIS_SYSTEM_PROMPT.includes(derivedId),
    `${derivedId} must not appear in the AI prompt vocabulary`,
  );
  assert.throws(
    () => normalizeAiAnalysisResult({ evidence_ids: [derivedId] }),
    /unknown evidence ID/,
    `${derivedId} must be rejected when returned by an AI provider`,
  );
}

assert.ok(
  !JSON.stringify(buildAiAnalysisUserPrompt({
    body: "Synthetic message",
    emailAuthentication: { spf: "fail", dkim: "fail", dmarc: "fail" },
  })).includes("dmarc"),
  "authentication verdicts must not be sent to an AI provider",
);

assert.deepEqual(normalizeAiAnalysisResult({ evidence_ids: ["urgency_pressure"] }), ["urgency_pressure"]);

console.log(`Checked ${emailEvaluationFixtures.length} shared evaluation fixtures.`);
