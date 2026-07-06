import assert from "node:assert/strict";

import { getAnalysisConfig, AnalysisConfigError } from "./config";
import { createAnalysisProvider, AnalysisProviderUnavailableError } from "./providers";

async function main() {
  const defaultConfig = getAnalysisConfig({});
  assert.deepEqual(defaultConfig, {
    mode: "heuristic",
    provider: "heuristic",
  });

  const explicitHeuristic = getAnalysisConfig({
    ANALYSIS_MODE: " HEURISTIC ",
    OPENAI_API_KEY: "fake-openai-key-unused",
  });
  assert.deepEqual(explicitHeuristic, {
    mode: "heuristic",
    provider: "heuristic",
  });

  assert.throws(
    () => getAnalysisConfig({ ANALYSIS_MODE: "manual" }),
    AnalysisConfigError,
    "invalid analysis mode should fail loudly",
  );

  assert.throws(
    () => getAnalysisConfig({ ANALYSIS_MODE: "ai" }),
    AnalysisConfigError,
    "AI mode requires a supported provider",
  );

  assert.throws(
    () => getAnalysisConfig({ ANALYSIS_MODE: "ai", AI_PROVIDER: "openai" }),
    AnalysisConfigError,
    "OpenAI mode requires an OpenAI key",
  );

  assert.throws(
    () => getAnalysisConfig({ ANALYSIS_MODE: "ai", AI_PROVIDER: "anthropic" }),
    AnalysisConfigError,
    "Anthropic mode requires an Anthropic key",
  );

  const openAiConfig = getAnalysisConfig({
    ANALYSIS_MODE: "ai",
    AI_PROVIDER: "openai",
    OPENAI_API_KEY: "fake-openai-key-for-tests",
  });

  assert.equal(openAiConfig.mode, "ai");
  assert.equal(openAiConfig.provider, "openai");

  const anthropicConfig = getAnalysisConfig({
    ANALYSIS_MODE: "ai",
    AI_PROVIDER: "anthropic",
    ANTHROPIC_API_KEY: "fake-anthropic-key-for-tests",
  });

  assert.equal(anthropicConfig.mode, "ai");
  assert.equal(anthropicConfig.provider, "anthropic");

  const heuristicProvider = createAnalysisProvider(defaultConfig);
  const heuristicResult = await heuristicProvider.analyze({
    body: "Hi, here are the notes from our meeting tomorrow.",
  });

  assert.equal(heuristicProvider.mode, "heuristic");
  assert.equal(heuristicProvider.provider, "heuristic");
  assert.equal(typeof heuristicResult.risk_score, "number");

  const aiProvider = createAnalysisProvider(openAiConfig);
  assert.equal(aiProvider.mode, "ai");
  assert.equal(aiProvider.provider, "openai");

  await assert.rejects(
    () => aiProvider.analyze({ body: "Synthetic message body." }),
    AnalysisProviderUnavailableError,
    "AI provider calls should remain gated until Issue #8",
  );

  console.log("Checked analysis provider configuration.");
}

void main();
