import type { AnalysisProviderName, EmailAnalysisInput, EmailAnalysisResult } from "../types";
import { type AnalysisConfig, getAnalysisConfig } from "./config";
import { createAnalysisProvider } from "./providers";

export type AnalyzeEmailResult = {
  result: EmailAnalysisResult;
  mode: "heuristic" | "ai";
  provider: AnalysisProviderName;
};

type AnalyzeEmailOptions = {
  config?: AnalysisConfig;
};

export async function analyzeEmail(
  input: EmailAnalysisInput,
  options: AnalyzeEmailOptions = {},
): Promise<AnalyzeEmailResult> {
  const provider = createAnalysisProvider(options.config ?? getAnalysisConfig());
  const result = await provider.analyze(input);

  return {
    result,
    mode: provider.mode,
    provider: provider.provider,
  };
}
