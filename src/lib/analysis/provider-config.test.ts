import assert from "node:assert/strict";

import { AiResponseValidationError } from "./ai-schema";
import { getAnalysisConfig, AnalysisConfigError } from "./config";
import { createAnalysisProvider, AiProviderRequestError } from "./providers";

const VALID_AI_RESULT = {
  risk_level: "high",
  risk_score: 82,
  suspicious_signals: ["Asks for credentials", "Uses urgent language"],
  detected_links: ["https://example.test/login"],
  recommended_action: "Do not click links. Verify the sender through a trusted channel.",
  short_explanation: "The message includes multiple common phishing warning signs.",
};

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

  assert.throws(
    () =>
      getAnalysisConfig({
        ANALYSIS_MODE: "ai",
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "fake-openai-key-for-tests",
        AI_MAX_OUTPUT_TOKENS: "20",
      }),
    AnalysisConfigError,
    "AI_MAX_OUTPUT_TOKENS should be bounded",
  );

  const openAiConfig = getAnalysisConfig({
    ANALYSIS_MODE: "ai",
    AI_PROVIDER: "openai",
    OPENAI_API_KEY: "fake-openai-key-for-tests",
    OPENAI_MODEL: "openai-test-model",
    AI_MAX_OUTPUT_TOKENS: "700",
  });

  assert.equal(openAiConfig.mode, "ai");
  assert.equal(openAiConfig.provider, "openai");
  assert.equal(openAiConfig.model, "openai-test-model");
  assert.equal(openAiConfig.maxOutputTokens, 700);

  const anthropicConfig = getAnalysisConfig({
    ANALYSIS_MODE: "ai",
    AI_PROVIDER: "anthropic",
    ANTHROPIC_API_KEY: "fake-anthropic-key-for-tests",
    ANTHROPIC_MODEL: "anthropic-test-model",
  });

  assert.equal(anthropicConfig.mode, "ai");
  assert.equal(anthropicConfig.provider, "anthropic");
  assert.equal(anthropicConfig.model, "anthropic-test-model");

  const heuristicProvider = createAnalysisProvider(defaultConfig);
  const heuristicResult = await heuristicProvider.analyze({
    body: "Hi, here are the notes from our meeting tomorrow.",
  });

  assert.equal(heuristicProvider.mode, "heuristic");
  assert.equal(heuristicProvider.provider, "heuristic");
  assert.equal(typeof heuristicResult.risk_score, "number");

  let openAiRequestBody: Record<string, unknown> | undefined;
  const openAiProvider = createAnalysisProvider(openAiConfig, {
    fetcher: async (_url, init) => {
      openAiRequestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;

      return jsonResponse({
        output_text: JSON.stringify(VALID_AI_RESULT),
      });
    },
  });

  const openAiResult = await openAiProvider.analyze({
    subject: "Synthetic subject",
    senderEmail: "sender@example.test",
    body: "Synthetic phishing-like message body.",
  });

  assert.equal(openAiProvider.mode, "ai");
  assert.equal(openAiProvider.provider, "openai");
  assert.equal(openAiResult.risk_level, "high");
  assert.equal(openAiResult.risk_score, 82);
  assert.ok(openAiRequestBody, "OpenAI request body should be captured");
  assert.equal(openAiRequestBody.model, "openai-test-model");
  assert.equal(openAiRequestBody.max_output_tokens, 700);
  assert.ok(openAiRequestBody.text, "OpenAI request should include a structured output schema");

  const anthropicProvider = createAnalysisProvider(anthropicConfig, {
    fetcher: async (_url, init) => {
      const requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;

      assert.equal(requestBody.model, "anthropic-test-model");
      assert.ok(requestBody.output_config, "Anthropic request should include structured output config");

      return jsonResponse({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ...VALID_AI_RESULT,
              risk_level: "low",
            }),
          },
        ],
      });
    },
  });

  const anthropicResult = await anthropicProvider.analyze({
    body: "Synthetic phishing-like message body.",
  });

  assert.equal(anthropicResult.risk_level, "high", "risk level should be normalized from score");

  const malformedProvider = createAnalysisProvider(openAiConfig, {
    fetcher: async () => jsonResponse({ output_text: JSON.stringify({ risk_score: 50 }) }),
  });

  await assert.rejects(
    () => malformedProvider.analyze({ body: "Synthetic message body." }),
    AiResponseValidationError,
    "malformed provider output should fail validation",
  );

  const failingProvider = createAnalysisProvider(openAiConfig, {
    fetcher: async () => jsonResponse({ error: "rate_limited" }, 429),
  });

  await assert.rejects(
    () => failingProvider.analyze({ body: "Synthetic message body." }),
    AiProviderRequestError,
    "provider HTTP failures should return controlled errors",
  );

  const invalidJsonProvider = createAnalysisProvider(openAiConfig, {
    fetcher: async () => new Response("not json"),
  });

  await assert.rejects(
    () => invalidJsonProvider.analyze({ body: "Synthetic message body." }),
    AiResponseValidationError,
    "invalid provider JSON should fail validation",
  );

  const rejectedFetchProvider = createAnalysisProvider(openAiConfig, {
    fetcher: async () => {
      throw new Error("network unavailable");
    },
  });

  await assert.rejects(
    () => rejectedFetchProvider.analyze({ body: "Synthetic message body." }),
    AiProviderRequestError,
    "fetch failures should return controlled errors",
  );

  console.log("Checked analysis provider configuration.");
}

void main();

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
