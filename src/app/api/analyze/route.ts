import { NextResponse } from "next/server";

import { analyzeEmail } from "@/lib/analysis/analyze-email";
import { AnalysisConfigError } from "@/lib/analysis/config";
import { AiResponseValidationError } from "@/lib/analysis/ai-schema";
import { validateAnalyzeRequest } from "@/lib/analysis/validate-input";
import { AiProviderRequestError } from "@/lib/analysis/providers";
import { ANALYSIS_DISCLAIMER, type AnalyzeErrorResponse, type AnalyzeResponse } from "@/lib/types";

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
    analysis = await analyzeEmail(validation.input);
  } catch (error) {
    if (error instanceof AnalysisConfigError) {
      return jsonError(error.message, 500);
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

function jsonError(error: string, status: number) {
  return NextResponse.json<AnalyzeErrorResponse>(
    { error },
    {
      status,
      headers: NO_STORE_HEADERS,
    },
  );
}
