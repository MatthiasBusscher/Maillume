import { NextResponse } from "next/server";

import { analyzeEmail } from "@/lib/analysis/analyze-email";
import { AnalysisConfigError, getAnalysisConfig } from "@/lib/analysis/config";
import { AiResponseValidationError } from "@/lib/analysis/ai-schema";
import { validateAnalyzeRequest } from "@/lib/analysis/validate-input";
import { AiProviderRequestError } from "@/lib/analysis/providers";
import { enforceAiRateLimit, RateLimitError } from "@/lib/analysis/rate-limit";
import {
  ANALYSIS_DISCLAIMER,
  ANALYSIS_PIPELINE_VERSION,
  type AnalyzeErrorResponse,
  type AnalyzeResponse,
} from "@/lib/types";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid JSON request body.", 400);
  }

  const validation = validateAnalyzeRequest(payload);

  if (!validation.ok) {
    return NextResponse.json<AnalyzeErrorResponse>(
      {
        error: validation.error,
        fieldErrors: validation.fieldErrors,
      },
      {
        status: 400,
        headers: NO_STORE_HEADERS,
      },
    );
  }

  let analysis;

  try {
    const config = getAnalysisConfig();

    enforceAiRateLimit(request, config);
    analysis = await analyzeEmail(validation.input, { config });
  } catch (error) {
    if (error instanceof AnalysisConfigError) {
      return jsonError(error.message, 500);
    }

    if (error instanceof RateLimitError) {
      return jsonError(error.message, 429, {
        "Retry-After": String(error.retryAfterSeconds),
      });
    }

    if (error instanceof AiProviderRequestError || error instanceof AiResponseValidationError) {
      return jsonError(error.message, 502);
    }

    throw error;
  }

  return NextResponse.json<AnalyzeResponse>(
    {
      result: analysis.result,
      analysis_mode: analysis.mode,
      analysis_provider: analysis.provider,
      analysis_version: ANALYSIS_PIPELINE_VERSION,
      disclaimer: ANALYSIS_DISCLAIMER,
      privacy: {
        stored: false,
        retention: "not_stored",
        message: "Scan content is processed for this assessment only and is not stored.",
      },
    },
    {
      headers: NO_STORE_HEADERS,
    },
  );
}

function jsonError(error: string, status: number, headers: HeadersInit = {}) {
  return NextResponse.json<AnalyzeErrorResponse>(
    { error },
    {
      status,
      headers: {
        ...NO_STORE_HEADERS,
        ...headers,
      },
    },
  );
}
