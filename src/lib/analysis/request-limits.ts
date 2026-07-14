import { DEFAULT_ANALYSIS_MAX_REQUEST_BYTES } from "../scan-limits";

const MAX_CONFIGURED_REQUEST_BYTES = 256 * 1024;

export function getAnalysisMaxRequestBytes(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): number {
  const value = env.ANALYSIS_MAX_REQUEST_BYTES?.trim();

  if (!value) {
    return DEFAULT_ANALYSIS_MAX_REQUEST_BYTES;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= MAX_CONFIGURED_REQUEST_BYTES
    ? parsed
    : DEFAULT_ANALYSIS_MAX_REQUEST_BYTES;
}
