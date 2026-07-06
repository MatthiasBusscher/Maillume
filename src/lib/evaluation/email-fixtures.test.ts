import assert from "node:assert/strict";

import { AI_ANALYSIS_SYSTEM_PROMPT, buildAiAnalysisUserPrompt } from "../analysis/ai-prompt";
import { normalizeAiAnalysisResult } from "../analysis/ai-schema";
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
  assert.ok(prompt.includes(fixture.input.body), `${fixture.id}: AI prompt should include fixture body`);

  const normalized = normalizeAiAnalysisResult({
    risk_level: fixture.expectedRiskLevel,
    risk_score: fixture.minScore ?? fixture.maxScore ?? 35,
    suspicious_signals:
      fixture.category === "legitimate" ? [] : ["Synthetic warning sign for evaluation"],
    detected_links: [],
    recommended_action: "Review this message cautiously through a trusted channel.",
    short_explanation: "Synthetic normalized output for fixture evaluation.",
  });

  assert.equal(typeof normalized.risk_score, "number", `${fixture.id}: AI output should normalize`);
}

for (const category of REQUIRED_CATEGORIES) {
  assert.ok(categories.has(category), `missing evaluation category: ${category}`);
}

for (const language of REQUIRED_LANGUAGES) {
  assert.ok(languages.has(language), `missing evaluation language: ${language}`);
}

assert.ok(
  AI_ANALYSIS_SYSTEM_PROMPT.includes("Return only the requested structured JSON fields."),
  "AI prompt should require structured JSON output",
);

console.log(`Checked ${emailEvaluationFixtures.length} shared evaluation fixtures.`);
