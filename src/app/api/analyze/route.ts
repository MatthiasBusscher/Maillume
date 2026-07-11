import { NextResponse } from "next/server";

import { analyzeEmail } from "@/lib/analysis/analyze-email";
import { AnalysisConfigError, getAnalysisConfig } from "@/lib/analysis/config";
import { AiResponseValidationError } from "@/lib/analysis/ai-schema";
import { validateAnalyzeRequest } from "@/lib/analysis/validate-input";
import { AiProviderRequestError } from "@/lib/analysis/providers";
import { AnalysisCapacityError, withAnalysisCapacity } from "@/lib/analysis/concurrency";
import { enforceAiRateLimit, enforceRequestRateLimit, RateLimitError } from "@/lib/analysis/rate-limit";
import {
  ANALYSIS_DISCLAIMERS,
  ANALYSIS_PIPELINE_VERSION,
  type AnalyzeErrorResponse,
  type AnalyzeResponse,
} from "@/lib/types";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

const DEFAULT_MAX_REQUEST_BYTES = 32 * 1024;
const DEFAULT_REQUEST_LIMIT = 20;
const DEFAULT_REQUEST_WINDOW_SECONDS = 60;

export async function POST(request: Request) {
  if (requestBodyIsTooLarge(request)) {
    return jsonError("Request body is too large.", 413);
  }

  try {
    enforceRequestRateLimit(request, {
      maxRequests: readPositiveInteger("ANALYSIS_REQUEST_LIMIT", DEFAULT_REQUEST_LIMIT, 1_000),
      windowMs:
        readPositiveInteger(
          "ANALYSIS_REQUEST_WINDOW_SECONDS",
          DEFAULT_REQUEST_WINDOW_SECONDS,
          86_400,
        ) * 1_000,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonError(error.message, 429, {
        "Retry-After": String(error.retryAfterSeconds),
      });
    }
    throw error;
  }

  let payload: unknown;

  try {
    payload = await readJsonBody(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return jsonError("Request body is too large.", 413);
    }
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
    analysis = await withAnalysisCapacity(config, () =>
      analyzeEmail(validation.input, { config }),
    );
  } catch (error) {
    if (error instanceof AnalysisConfigError) {
      return jsonError(error.message, 500);
    }

    if (error instanceof RateLimitError) {
      return jsonError(error.message, 429, {
        "Retry-After": String(error.retryAfterSeconds),
      });
    }

    if (error instanceof AnalysisCapacityError) {
      return jsonError(error.message, 429, { "Retry-After": "5" });
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
      disclaimer: ANALYSIS_DISCLAIMERS[validation.input.locale],
      privacy: {
        stored: false,
        retention: "not_stored",
        message: validation.input.locale === "nl"
          ? "De scaninhoud wordt alleen voor deze beoordeling verwerkt en niet in de applicatie opgeslagen."
          : "Scan content is processed only for this assessment and is not saved in application storage.",
      },
    },
    {
      headers: NO_STORE_HEADERS,
    },
  );
}

function requestBodyIsTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length"));
  return Number.isFinite(contentLength) && contentLength > getMaxRequestBytes();
}

function getMaxRequestBytes(): number {
  return readPositiveInteger("ANALYSIS_MAX_REQUEST_BYTES", DEFAULT_MAX_REQUEST_BYTES, 256 * 1024);
}

class RequestBodyTooLargeError extends Error {}

async function readJsonBody(request: Request): Promise<unknown> {
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > getMaxRequestBytes()) {
    throw new RequestBodyTooLargeError();
  }
  return JSON.parse(rawBody) as unknown;
}

function readPositiveInteger(name: string, fallback: number, maximum: number): number {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : fallback;
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
