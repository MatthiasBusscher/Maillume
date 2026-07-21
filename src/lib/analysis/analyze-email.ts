import type {
  AnalysisProviderName,
  EmailAnalysisInput,
  EmailAnalysisResult,
  ScanSource,
} from "../types";
import { createAnalysisEnvelope } from "./analysis-envelope";
import { type AnalysisConfig, getAnalysisConfig } from "./config";
import { createAnalysisProvider } from "./providers";

export type AnalyzeEmailResult = {
  result: EmailAnalysisResult;
  mode: "heuristic" | "ai";
  provider: AnalysisProviderName;
};

type AnalyzeEmailOptions = {
  config?: AnalysisConfig;
  source?: ScanSource;
};

export async function analyzeEmail(
  input: EmailAnalysisInput,
  options: AnalyzeEmailOptions = {},
): Promise<AnalyzeEmailResult> {
  const provider = createAnalysisProvider(options.config ?? getAnalysisConfig());
  const source = options.source
    ?? ("source" in input && isScanSource(input.source) ? input.source : "paste");
  const result = await provider.analyze(createAnalysisEnvelope(input, source));

  return {
    result,
    mode: provider.mode,
    provider: provider.provider,
  };
}

function isScanSource(value: unknown): value is ScanSource {
  return value === "paste" || value === "screenshot" || value === "eml" || value === "chrome";
}
