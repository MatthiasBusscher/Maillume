import type {
  AnalysisMode,
  AnalysisEnvelope,
  AnalysisProviderName,
  EmailAnalysisInput,
  EmailAnalysisResult,
} from "../types";
import { ensureAnalysisEnvelope } from "./analysis-envelope";
import {
  DEFAULT_AI_PROVIDER_TIMEOUT_MS,
  type AiAnalysisConfig,
  type AnalysisConfig,
} from "./config";
import { AI_ANALYSIS_SYSTEM_PROMPT, buildAiAnalysisUserPrompt } from "./ai-prompt";
import { AI_ANALYSIS_SCHEMA, AiResponseValidationError, parseAiAnalysisJson } from "./ai-schema";
import { buildAnalysisResult, type EvidenceId } from "./evidence";
import { analyzeEmailHeuristic, collectHeuristicEvidence } from "./heuristic-analysis";

type Fetcher = typeof fetch;

export type AnalysisProvider = {
  mode: AnalysisMode;
  provider: AnalysisProviderName;
  analyze: (input: EmailAnalysisInput | AnalysisEnvelope) => Promise<EmailAnalysisResult>;
};

export class AiProviderRequestError extends Error {
  constructor(message = "AI provider request failed.") {
    super(message);
    this.name = "AiProviderRequestError";
  }
}

export function createAnalysisProvider(
  config: AnalysisConfig,
  options: { fetcher?: Fetcher } = {},
): AnalysisProvider {
  if (config.mode === "heuristic") {
    return heuristicProvider;
  }

  return createSelfHostedAiProvider(config, options.fetcher ?? fetch);
}

const heuristicProvider: AnalysisProvider = {
  mode: "heuristic",
  provider: "heuristic",
  analyze: async (input) => analyzeEmailHeuristic(ensureAnalysisEnvelope(input)),
};

function createSelfHostedAiProvider(config: AiAnalysisConfig, fetcher: Fetcher): AnalysisProvider {
  return {
    mode: "ai",
    provider: config.provider,
    analyze: async (rawInput) => {
      const input = ensureAnalysisEnvelope(rawInput);
      if (config.provider === "openai") {
        return analyzeWithOpenAi(config, input, fetcher);
      }

      if (config.provider === "anthropic") {
        return analyzeWithAnthropic(config, input, fetcher);
      }

      return analyzeWithOpenAiCompatible(config, input, fetcher);
    },
  };
}

async function analyzeWithOpenAi(
  config: AiAnalysisConfig,
  input: AnalysisEnvelope,
  fetcher: Fetcher,
): Promise<EmailAnalysisResult> {
  return fetchProvider(
    "OpenAI",
    config.requestTimeoutMs ?? DEFAULT_AI_PROVIDER_TIMEOUT_MS,
    async (signal) => {
      const response = await fetcher("https://api.openai.com/v1/responses", {
        method: "POST",
        cache: "no-store",
        signal,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          input: [
            {
              role: "system",
              content: AI_ANALYSIS_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: buildAiAnalysisUserPrompt(input),
            },
          ],
          max_output_tokens: config.maxOutputTokens,
          text: {
            format: {
              type: "json_schema",
              name: "email_risk_assessment",
              strict: true,
              schema: AI_ANALYSIS_SCHEMA,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new AiProviderRequestError(`OpenAI request failed with status ${response.status}.`);
      }

      const payload = await readProviderJson(response);
      const content = extractOpenAiText(payload);

      return finalizeAiAnalysis(parseAiAnalysisJson(content), input);
    },
  );
}

async function analyzeWithAnthropic(
  config: AiAnalysisConfig,
  input: AnalysisEnvelope,
  fetcher: Fetcher,
): Promise<EmailAnalysisResult> {
  return fetchProvider(
    "Anthropic",
    config.requestTimeoutMs ?? DEFAULT_AI_PROVIDER_TIMEOUT_MS,
    async (signal) => {
      const response = await fetcher("https://api.anthropic.com/v1/messages", {
        method: "POST",
        cache: "no-store",
        signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.maxOutputTokens,
          system: AI_ANALYSIS_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: buildAiAnalysisUserPrompt(input),
            },
          ],
          output_config: {
            format: {
              type: "json_schema",
              schema: AI_ANALYSIS_SCHEMA,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new AiProviderRequestError(
          `Anthropic request failed with status ${response.status}.`,
        );
      }

      const payload = await readProviderJson(response);
      const content = extractAnthropicText(payload);

      return finalizeAiAnalysis(parseAiAnalysisJson(content), input);
    },
  );
}

async function analyzeWithOpenAiCompatible(
  config: AiAnalysisConfig,
  input: AnalysisEnvelope,
  fetcher: Fetcher,
): Promise<EmailAnalysisResult> {
  return fetchProvider(
    "OpenAI-compatible provider",
    config.requestTimeoutMs ?? DEFAULT_AI_PROVIDER_TIMEOUT_MS,
    async (signal) => {
      const response = await fetcher(`${getOpenAiCompatibleBaseUrl(config)}/chat/completions`, {
        method: "POST",
        cache: "no-store",
        signal,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: "system",
              content: [
                AI_ANALYSIS_SYSTEM_PROMPT,
                "Return only valid JSON matching this schema:",
                JSON.stringify(AI_ANALYSIS_SCHEMA),
              ].join("\n"),
            },
            {
              role: "user",
              content: buildAiAnalysisUserPrompt(input),
            },
          ],
          max_tokens: config.maxOutputTokens,
          response_format: {
            type: "json_object",
          },
          stream: false,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        throw new AiProviderRequestError(
          `OpenAI-compatible provider request failed with status ${response.status}.`,
        );
      }

      const payload = await readProviderJson(response);
      const content = extractChatCompletionText(payload);

      return finalizeAiAnalysis(parseAiAnalysisJson(content), input);
    },
  );
}

function finalizeAiAnalysis(aiEvidence: EvidenceId[], input: AnalysisEnvelope): EmailAnalysisResult {
  const deterministic = collectHeuristicEvidence(input);
  const evidence = [...deterministic.evidence, ...aiEvidence];

  return buildAnalysisResult(evidence, deterministic.links, input.locale, {
    incompleteEvidence: !input.availability.sender || !input.availability.linkDestinations,
  });
}

async function fetchProvider<T>(
  provider: string,
  timeoutMs: number,
  request: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await request(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AiProviderRequestError(`${provider} request timed out.`);
    }

    if (error instanceof AiProviderRequestError || error instanceof AiResponseValidationError) {
      throw error;
    }

    throw new AiProviderRequestError(`${provider} request failed.`);
  } finally {
    clearTimeout(timeout);
  }
}

async function readProviderJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new AiResponseValidationError("AI provider response was not valid JSON.");
  }
}

function extractOpenAiText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new AiResponseValidationError();
  }

  const outputText = (payload as { output_text?: unknown }).output_text;

  if (typeof outputText === "string" && outputText.trim()) {
    return outputText;
  }

  const output = (payload as { output?: unknown }).output;

  if (!Array.isArray(output)) {
    throw new AiResponseValidationError();
  }

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = (item as { content?: unknown }).content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const block of content) {
      if (!block || typeof block !== "object") {
        continue;
      }

      const text = (block as { text?: unknown }).text;

      if (typeof text === "string" && text.trim()) {
        return text;
      }
    }
  }

  throw new AiResponseValidationError();
}

function extractChatCompletionText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new AiResponseValidationError();
  }

  const choices = (payload as { choices?: unknown }).choices;

  if (!Array.isArray(choices)) {
    throw new AiResponseValidationError();
  }

  for (const choice of choices) {
    if (!choice || typeof choice !== "object") {
      continue;
    }

    const message = (choice as { message?: unknown }).message;

    if (!message || typeof message !== "object") {
      continue;
    }

    const content = (message as { content?: unknown }).content;

    if (typeof content === "string" && content.trim()) {
      return content;
    }
  }

  throw new AiResponseValidationError();
}

function extractAnthropicText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new AiResponseValidationError();
  }

  const content = (payload as { content?: unknown }).content;

  if (!Array.isArray(content)) {
    throw new AiResponseValidationError();
  }

  const textBlock = content.find((block) => {
    if (!block || typeof block !== "object") {
      return false;
    }

    const candidate = block as { text?: unknown; type?: unknown };

    return candidate.type === "text" && typeof candidate.text === "string";
  });

  if (!textBlock) {
    throw new AiResponseValidationError();
  }

  return (textBlock as { text: string }).text;
}

function getOpenAiCompatibleBaseUrl(config: AiAnalysisConfig): string {
  if (!config.baseUrl) {
    throw new AiProviderRequestError("OpenAI-compatible provider requires AI_BASE_URL.");
  }

  return config.baseUrl;
}
