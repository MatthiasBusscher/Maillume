import { PUBLIC_CONTRACT } from "../contracts/public-contract";
import { DEFAULT_ANALYSIS_MAX_REQUEST_BYTES } from "../scan-limits";

export function getAnalysisMaxRequestBytes(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): number {
  const value = env.ANALYSIS_MAX_REQUEST_BYTES?.trim();

  if (!value) {
    return DEFAULT_ANALYSIS_MAX_REQUEST_BYTES;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= PUBLIC_CONTRACT.limits.maxConfiguredAnalysisRequestBytes
    ? parsed
    : DEFAULT_ANALYSIS_MAX_REQUEST_BYTES;
}
