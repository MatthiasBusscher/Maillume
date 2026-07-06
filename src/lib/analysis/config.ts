import type { AiProviderName, AnalysisMode } from "../types";

export type HeuristicAnalysisConfig = {
  mode: "heuristic";
  provider: "heuristic";
};

export type AiAnalysisConfig = {
  mode: "ai";
  provider: AiProviderName;
  apiKey: string;
};

export type AnalysisConfig = HeuristicAnalysisConfig | AiAnalysisConfig;

type AnalysisEnv = Record<string, string | undefined>;

const AI_PROVIDERS = new Set<AiProviderName>(["openai", "anthropic"]);

export class AnalysisConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisConfigError";
  }
}

export function getAnalysisConfig(env: AnalysisEnv = process.env): AnalysisConfig {
  const mode = normalizeEnvValue(env.ANALYSIS_MODE) ?? "heuristic";

  if (!isAnalysisMode(mode)) {
    throw new AnalysisConfigError("ANALYSIS_MODE must be set to heuristic or ai.");
  }

  if (mode === "heuristic") {
    return {
      mode: "heuristic",
      provider: "heuristic",
    };
  }

  const provider = normalizeEnvValue(env.AI_PROVIDER);

  if (!provider || !isAiProvider(provider)) {
    throw new AnalysisConfigError("AI mode requires AI_PROVIDER to be set to openai or anthropic.");
  }

  const keyName = provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
  const apiKey = env[keyName]?.trim();

  if (!apiKey) {
    throw new AnalysisConfigError(`AI mode with ${provider} requires ${keyName}.`);
  }

  return {
    mode,
    provider,
    apiKey,
  };
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

function isAnalysisMode(value: string): value is AnalysisMode {
  return value === "heuristic" || value === "ai";
}

function isAiProvider(value: string): value is AiProviderName {
  return AI_PROVIDERS.has(value as AiProviderName);
}
