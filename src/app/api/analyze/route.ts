import { NextResponse } from "next/server";

import { validateAnalyzeRequest } from "@/lib/analysis/validate-input";
import { analyzeEmailMock } from "@/lib/mock-analysis";
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

  const result = analyzeEmailMock(validation.input);

  return NextResponse.json<AnalyzeResponse>(
    {
      result,
      analysis_mode: "heuristic",
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
