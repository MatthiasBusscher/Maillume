import {
  countSuccessfulAnalysis,
  createAnalysisErrorResponse,
  createAnalysisSuccessResponse,
  enforceAnalysisRequestLimit,
  executeAnalysisRequest,
  parseAnalysisRequest,
} from "@/lib/analysis/http";

export async function POST(request: Request) {
  const rateLimitFailure = enforceAnalysisRequestLimit(request);
  if (rateLimitFailure) return createAnalysisErrorResponse(rateLimitFailure);

  const parsed = await parseAnalysisRequest(request);
  if (!parsed.ok) return createAnalysisErrorResponse(parsed.failure);

  const executed = await executeAnalysisRequest(request, parsed.value);
  if (!executed.ok) return createAnalysisErrorResponse(executed.failure);

  countSuccessfulAnalysis(parsed.value);
  return createAnalysisSuccessResponse(parsed.value, executed.value);
}
