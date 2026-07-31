import { NextResponse } from "next/server";

import type { AnalyzeEmailResult } from "./analyze-email";
import { analyzeEmail } from "./analyze-email";
import { AiResponseValidationError } from "./ai-schema";
import { AnalysisCapacityError, withAnalysisCapacity } from "./concurrency";
import {
  AnalysisConfigError,
  getAnalysisConfig,
  type AnalysisConfig,
} from "./config";
import { AiProviderRequestError } from "./providers";
import {
  enforceAiRateLimit,
  enforceRequestRateLimit,
  RateLimitError,
} from "./rate-limit";
import { getAnalysisMaxRequestBytes } from "./request-limits";
import { validateAnalyzeRequest } from "./validate-input";
import { countScan } from "../scan-counters/storage";
import { readBoundedRequestBody } from "../security/account-request";
import {
  ANALYSIS_DISCLAIMERS,
  ANALYSIS_PIPELINE_VERSION,
  type AnalyzeErrorResponse,
  type AnalyzeResponse,
  type NormalizedScanInput,
} from "../types";

export const ANALYSIS_NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

const DEFAULT_REQUEST_LIMIT = 20;
const DEFAULT_REQUEST_WINDOW_SECONDS = 60;

export type AnalysisHttpFailure = {
  error: string;
  fieldErrors?: AnalyzeErrorResponse["fieldErrors"];
  headers?: HeadersInit;
  status: number;
};

type AnalysisHttpResult<T> =
  | { ok: true; value: T }
  | { ok: false; failure: AnalysisHttpFailure };

type ParseDependencies = {
  getMaxRequestBytes?: () => number;
  readBody?: typeof readBoundedRequestBody;
  validate?: typeof validateAnalyzeRequest;
};

type ExecutionDependencies = {
  analyze?: typeof analyzeEmail;
  enforceAiLimit?: typeof enforceAiRateLimit;
  getConfig?: () => AnalysisConfig;
  withCapacity?: typeof withAnalysisCapacity;
};

type RequestLimitDependencies = {
  enforce?: typeof enforceRequestRateLimit;
  env?: {
    ANALYSIS_REQUEST_LIMIT?: string;
    ANALYSIS_REQUEST_WINDOW_SECONDS?: string;
  };
};

export async function parseAnalysisRequest(
  request: Request,
  dependencies: ParseDependencies = {},
): Promise<AnalysisHttpResult<NormalizedScanInput>> {
  const readBody = dependencies.readBody ?? readBoundedRequestBody;
  const getMaxRequestBytes = dependencies.getMaxRequestBytes ?? getAnalysisMaxRequestBytes;
  const validate = dependencies.validate ?? validateAnalyzeRequest;
  let payload: unknown;

  try {
    const body = await readBody(request, getMaxRequestBytes());
    if (!body.ok) {
      return failure("Request body is too large.", 413);
    }
    payload = JSON.parse(body.text) as unknown;
  } catch {
    return failure("Invalid JSON request body.", 400);
  }

  const validation = validate(payload);
  if (!validation.ok) {
    return {
      ok: false,
      failure: {
        error: validation.error,
        fieldErrors: validation.fieldErrors,
        status: 400,
      },
    };
  }

  return { ok: true, value: validation.input };
}

export function enforceAnalysisRequestLimit(
  request: Request,
  dependencies: RequestLimitDependencies = {},
): AnalysisHttpFailure | null {
  const environment = dependencies.env ?? process.env;
  const enforce = dependencies.enforce ?? enforceRequestRateLimit;

  try {
    enforce(request, {
      maxRequests: readPositiveInteger(
        environment.ANALYSIS_REQUEST_LIMIT,
        DEFAULT_REQUEST_LIMIT,
        1_000,
      ),
      windowMs:
        readPositiveInteger(
          environment.ANALYSIS_REQUEST_WINDOW_SECONDS,
          DEFAULT_REQUEST_WINDOW_SECONDS,
          86_400,
        ) * 1_000,
    });
    return null;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return {
        error: error.message,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
        status: 429,
      };
    }
    throw error;
  }
}

export async function executeAnalysisRequest(
  request: Request,
  input: NormalizedScanInput,
  dependencies: ExecutionDependencies = {},
): Promise<AnalysisHttpResult<AnalyzeEmailResult>> {
  const getConfig = dependencies.getConfig ?? getAnalysisConfig;
  const enforceAiLimit = dependencies.enforceAiLimit ?? enforceAiRateLimit;
  const withCapacity = dependencies.withCapacity ?? withAnalysisCapacity;
  const analyze = dependencies.analyze ?? analyzeEmail;

  try {
    const config = getConfig();
    enforceAiLimit(request, config);
    const analysis = await withCapacity(config, () => analyze(input, { config }));
    return { ok: true, value: analysis };
  } catch (error) {
    if (error instanceof AnalysisConfigError) {
      return failure(error.message, 500);
    }
    if (error instanceof RateLimitError) {
      return {
        ok: false,
        failure: {
          error: error.message,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
          status: 429,
        },
      };
    }
    if (error instanceof AnalysisCapacityError) {
      return {
        ok: false,
        failure: {
          error: error.message,
          headers: { "Retry-After": "5" },
          status: 429,
        },
      };
    }
    if (error instanceof AiProviderRequestError || error instanceof AiResponseValidationError) {
      return failure(error.message, 502);
    }
    return failure("Analysis failed unexpectedly.", 500);
  }
}

export function countSuccessfulAnalysis(input: NormalizedScanInput): void {
  countScan(input.source);
}

export function createAnalysisSuccessResponse(
  input: NormalizedScanInput,
  analysis: AnalyzeEmailResult,
  headers: HeadersInit = {},
) {
  return NextResponse.json<AnalyzeResponse>(
    {
      result: analysis.result,
      analysis_mode: analysis.mode,
      analysis_provider: analysis.provider,
      analysis_version: ANALYSIS_PIPELINE_VERSION,
      disclaimer: ANALYSIS_DISCLAIMERS[input.locale],
      privacy: {
        stored: false,
        retention: "not_stored",
        message: input.locale === "nl"
          ? "De scaninhoud wordt alleen voor deze beoordeling verwerkt en niet in de applicatie opgeslagen."
          : "Scan content is processed only for this assessment and is not saved in application storage.",
      },
    },
    {
      headers: mergeHeaders(ANALYSIS_NO_STORE_HEADERS, headers),
    },
  );
}

export function createAnalysisErrorResponse(
  failure: AnalysisHttpFailure,
  headers: HeadersInit = {},
) {
  return NextResponse.json<AnalyzeErrorResponse>(
    {
      error: failure.error,
      ...(failure.fieldErrors ? { fieldErrors: failure.fieldErrors } : {}),
    },
    {
      status: failure.status,
      headers: mergeHeaders(
        ANALYSIS_NO_STORE_HEADERS,
        headers,
        failure.headers ?? {},
      ),
    },
  );
}

export function createAnalysisFailure(
  error: string,
  status: number,
  headers?: HeadersInit,
): AnalysisHttpFailure {
  return { error, status, ...(headers ? { headers } : {}) };
}

function failure(error: string, status: number): AnalysisHttpResult<never> {
  return { ok: false, failure: { error, status } };
}

function readPositiveInteger(
  value: string | undefined,
  fallback: number,
  maximum: number,
): number {
  const normalized = value?.trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : fallback;
}

function mergeHeaders(...sources: HeadersInit[]): Headers {
  const headers = new Headers();
  for (const source of sources) {
    new Headers(source).forEach((value, key) => headers.set(key, value));
  }
  return headers;
}
