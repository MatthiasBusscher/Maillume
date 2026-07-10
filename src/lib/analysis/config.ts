import type { AiProviderName, AnalysisMode } from "../types";

export type HeuristicAnalysisConfig = {
  mode: "heuristic";
  provider: "heuristic";
};

export type AiAnalysisConfig = {
  mode: "ai";
  provider: AiProviderName;
  apiKey: string;
  baseUrl?: string;
  model: string;
  maxOutputTokens: number;
  rateLimit: AiRateLimitConfig;
};

export type AnalysisConfig = HeuristicAnalysisConfig | AiAnalysisConfig;

export type AiRateLimitConfig = {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
};

type AnalysisEnv = Record<string, string | undefined>;

const AI_PROVIDERS = new Set<AiProviderName>(["openai", "anthropic", "openai-compatible"]);
const DEFAULT_MAX_OUTPUT_TOKENS = 800;
const MAX_OUTPUT_TOKEN_LIMIT = 2_000;
const DEFAULT_AI_RATE_LIMIT_MAX_REQUESTS = 10;
const DEFAULT_AI_RATE_LIMIT_WINDOW_SECONDS = 60;
const MAX_AI_RATE_LIMIT_REQUESTS = 1_000;
const MAX_AI_RATE_LIMIT_WINDOW_SECONDS = 86_400;

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
    throw new AnalysisConfigError(
      "AI mode requires AI_PROVIDER to be set to openai, anthropic, or openai-compatible.",
    );
  }

  const keyName = getProviderKeyName(provider);
  const apiKey = getProviderApiKey(provider, env);

  if (!apiKey) {
    throw new AnalysisConfigError(`AI mode with ${provider} requires ${keyName}.`);
  }

  const baseUrl = getAiBaseUrl(provider, env);
  const model = getAiModel(provider, env);

  return {
    mode,
    provider,
    apiKey,
    ...(baseUrl ? { baseUrl } : {}),
    model,
    maxOutputTokens: getMaxOutputTokens(env.AI_MAX_OUTPUT_TOKENS),
    rateLimit: getAiRateLimitConfig(env),
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

function getProviderKeyName(provider: AiProviderName): string {
  if (provider === "openai") {
    return "OPENAI_API_KEY or AI_API_KEY";
  }

  if (provider === "anthropic") {
    return "ANTHROPIC_API_KEY or AI_API_KEY";
  }

  return "AI_API_KEY";
}

function getProviderApiKey(provider: AiProviderName, env: AnalysisEnv): string | undefined {
  if (provider === "openai") {
    return env.OPENAI_API_KEY?.trim() || env.AI_API_KEY?.trim();
  }

  if (provider === "anthropic") {
    return env.ANTHROPIC_API_KEY?.trim() || env.AI_API_KEY?.trim();
  }

  return env.AI_API_KEY?.trim();
}

function getAiModel(provider: AiProviderName, env: AnalysisEnv): string {
  const providerModel =
    provider === "openai"
      ? normalizeModelName(env.OPENAI_MODEL)
      : provider === "anthropic"
        ? normalizeModelName(env.ANTHROPIC_MODEL)
        : undefined;
  const sharedModel = normalizeModelName(env.AI_MODEL);
  const model = providerModel ?? sharedModel;

  if (!model) {
    const providerModelName =
      provider === "openai"
        ? "OPENAI_MODEL or AI_MODEL"
        : provider === "anthropic"
          ? "ANTHROPIC_MODEL or AI_MODEL"
          : "AI_MODEL";

    throw new AnalysisConfigError(`AI mode with ${provider} requires ${providerModelName}.`);
  }

  return model;
}

function normalizeModelName(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function getAiBaseUrl(provider: AiProviderName, env: AnalysisEnv): string | undefined {
  if (provider !== "openai-compatible") {
    return undefined;
  }

  const baseUrl = env.AI_BASE_URL?.trim();

  if (!baseUrl) {
    throw new AnalysisConfigError("AI mode with openai-compatible requires AI_BASE_URL.");
  }

  let parsed: URL;

  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new AnalysisConfigError("AI_BASE_URL must be a valid URL.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new AnalysisConfigError("AI_BASE_URL must use http or https.");
  }

  return baseUrl.replace(/\/+$/, "");
}

function getMaxOutputTokens(value: string | undefined): number {
  if (!value?.trim()) {
    return DEFAULT_MAX_OUTPUT_TOKENS;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 200 || parsed > MAX_OUTPUT_TOKEN_LIMIT) {
    throw new AnalysisConfigError(
      `AI_MAX_OUTPUT_TOKENS must be an integer between 200 and ${MAX_OUTPUT_TOKEN_LIMIT}.`,
    );
  }

  return parsed;
}

function getAiRateLimitConfig(env: AnalysisEnv): AiRateLimitConfig {
  return {
    enabled: getBooleanEnv(env.AI_RATE_LIMIT_ENABLED, true, "AI_RATE_LIMIT_ENABLED"),
    maxRequests: getBoundedIntegerEnv(
      env.AI_RATE_LIMIT_MAX_REQUESTS,
      DEFAULT_AI_RATE_LIMIT_MAX_REQUESTS,
      1,
      MAX_AI_RATE_LIMIT_REQUESTS,
      "AI_RATE_LIMIT_MAX_REQUESTS",
    ),
    windowMs:
      getBoundedIntegerEnv(
        env.AI_RATE_LIMIT_WINDOW_SECONDS,
        DEFAULT_AI_RATE_LIMIT_WINDOW_SECONDS,
        1,
        MAX_AI_RATE_LIMIT_WINDOW_SECONDS,
        "AI_RATE_LIMIT_WINDOW_SECONDS",
      ) * 1_000,
  };
}

function getBooleanEnv(value: string | undefined, fallback: boolean, name: string): boolean {
  const normalized = normalizeEnvValue(value);

  if (!normalized) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new AnalysisConfigError(`${name} must be true or false.`);
}

function getBoundedIntegerEnv(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
  name: string,
): number {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new AnalysisConfigError(`${name} must be an integer between ${min} and ${max}.`);
  }

  return parsed;
}
