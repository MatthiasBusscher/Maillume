import type {
  AnalysisMode,
  AnalysisProviderName,
  EmailAnalysisInput,
  EmailAnalysisResult,
} from "../types";
import type { AiAnalysisConfig, AnalysisConfig } from "./config";
import { AI_ANALYSIS_SYSTEM_PROMPT, buildAiAnalysisUserPrompt } from "./ai-prompt";
import { AI_ANALYSIS_SCHEMA, AiResponseValidationError, parseAiAnalysisJson } from "./ai-schema";
import { analyzeEmailHeuristic } from "./heuristic-analysis";

type Fetcher = typeof fetch;

export type AnalysisProvider = {
  mode: AnalysisMode;
  provider: AnalysisProviderName;
  analyze: (input: EmailAnalysisInput) => Promise<EmailAnalysisResult>;
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
  analyze: async (input) => analyzeEmailHeuristic(input),
};

function createSelfHostedAiProvider(config: AiAnalysisConfig, fetcher: Fetcher): AnalysisProvider {
  return {
    mode: "ai",
    provider: config.provider,
    analyze: async (input) =>
      config.provider === "openai"
        ? analyzeWithOpenAi(config, input, fetcher)
        : analyzeWithAnthropic(config, input, fetcher),
  };
}

async function analyzeWithOpenAi(
  config: AiAnalysisConfig,
  input: EmailAnalysisInput,
  fetcher: Fetcher,
): Promise<EmailAnalysisResult> {
  const response = await fetchProvider("OpenAI", () =>
    fetcher("https://api.openai.com/v1/responses", {
      method: "POST",
      cache: "no-store",
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
    }),
  );

  if (!response.ok) {
    throw new AiProviderRequestError(`OpenAI request failed with status ${response.status}.`);
  }

  const payload = await readProviderJson(response);
  const content = extractOpenAiText(payload);

  return parseAiAnalysisJson(content);
}

async function analyzeWithAnthropic(
  config: AiAnalysisConfig,
  input: EmailAnalysisInput,
  fetcher: Fetcher,
): Promise<EmailAnalysisResult> {
  const response = await fetchProvider("Anthropic", () =>
    fetcher("https://api.anthropic.com/v1/messages", {
      method: "POST",
      cache: "no-store",
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
    }),
  );

  if (!response.ok) {
    throw new AiProviderRequestError(`Anthropic request failed with status ${response.status}.`);
  }

  const payload = await readProviderJson(response);
  const content = extractAnthropicText(payload);

  return parseAiAnalysisJson(content);
}

async function fetchProvider(provider: string, request: () => Promise<Response>): Promise<Response> {
  try {
    return await request();
  } catch {
    throw new AiProviderRequestError(`${provider} request failed.`);
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
