import type {
  AnalysisMode,
  AnalysisProviderName,
  EmailAnalysisInput,
  EmailAnalysisResult,
} from "../types";
import type { AiAnalysisConfig, AnalysisConfig } from "./config";
import { analyzeEmailHeuristic } from "./heuristic-analysis";

export type AnalysisProvider = {
  mode: AnalysisMode;
  provider: AnalysisProviderName;
  analyze: (input: EmailAnalysisInput) => Promise<EmailAnalysisResult>;
};

export class AnalysisProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisProviderUnavailableError";
  }
}

export function createAnalysisProvider(config: AnalysisConfig): AnalysisProvider {
  if (config.mode === "heuristic") {
    return heuristicProvider;
  }

  return createSelfHostedAiProvider(config);
}

const heuristicProvider: AnalysisProvider = {
  mode: "heuristic",
  provider: "heuristic",
  analyze: async (input) => analyzeEmailHeuristic(input),
};

function createSelfHostedAiProvider(config: AiAnalysisConfig): AnalysisProvider {
  return {
    mode: "ai",
    provider: config.provider,
    analyze: async () => {
      throw new AnalysisProviderUnavailableError(
        `AI analysis is configured for ${config.provider}, but provider calls are implemented in Issue #8.`,
      );
    },
  };
}
