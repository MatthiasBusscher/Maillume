import type { AnalysisProviderName, EmailAnalysisInput, EmailAnalysisResult } from "../types";
import { getAnalysisConfig } from "./config";
import { createAnalysisProvider } from "./providers";

export type AnalyzeEmailResult = {
  result: EmailAnalysisResult;
  mode: "heuristic" | "ai";
  provider: AnalysisProviderName;
};

export async function analyzeEmail(input: EmailAnalysisInput): Promise<AnalyzeEmailResult> {
  const provider = createAnalysisProvider(getAnalysisConfig());
  const result = await provider.analyze(input);

  return {
    result,
    mode: provider.mode,
    provider: provider.provider,
  };
}
