import { NextResponse } from "next/server";

import { analyzeEmail } from "@/lib/analysis/analyze-email";
import { AiResponseValidationError } from "@/lib/analysis/ai-schema";
import { AnalysisCapacityError, withAnalysisCapacity } from "@/lib/analysis/concurrency";
import { AnalysisConfigError, getAnalysisConfig } from "@/lib/analysis/config";
import { AiProviderRequestError } from "@/lib/analysis/providers";
import { enforceAiRateLimit, enforceRequestRateLimit, RateLimitError } from "@/lib/analysis/rate-limit";
import { validateAnalyzeRequest } from "@/lib/analysis/validate-input";
import { getAnalysisMaxRequestBytes } from "@/lib/analysis/request-limits";
import { hashApiKey, isApiKeyFormat } from "@/lib/api-keys";
import { areAccountsEnabled } from "@/lib/accounts/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readBoundedRequestBody } from "@/lib/security/account-request";
import {
  ANALYSIS_DISCLAIMERS,
  ANALYSIS_PIPELINE_VERSION,
  type AnalyzeErrorResponse,
  type AnalyzeResponse,
} from "@/lib/types";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const DEFAULT_REQUEST_LIMIT = 20;
const DEFAULT_REQUEST_WINDOW_SECONDS = 60;

type QuotaRow = {
  api_key_id: string | null;
  monthly_quota: number | null;
  operation_status: string;
  owner_id: string | null;
  request_count: number | null;
  reservation_id: string | null;
};

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

class QuotaFinalizationError extends Error {}

export async function POST(request: Request) {
  if (!areAccountsEnabled()) return jsonError("Not found.", 404);
  const token = getBearerToken(request);
  if (!token || !isApiKeyFormat(token)) return jsonError("A valid Maillume API key is required.", 401);

  try {
    enforceRequestRateLimit(request, {
      maxRequests: readPositiveInteger("ANALYSIS_REQUEST_LIMIT", DEFAULT_REQUEST_LIMIT, 1_000),
      windowMs: readPositiveInteger("ANALYSIS_REQUEST_WINDOW_SECONDS", DEFAULT_REQUEST_WINDOW_SECONDS, 86_400) * 1_000,
    });
  } catch (error) {
    if (error instanceof RateLimitError) return jsonError(error.message, 429, { "Retry-After": String(error.retryAfterSeconds) });
    throw error;
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return jsonError("Hosted API access is not configured.", 503);

  let payload: unknown;
  try {
    const body = await readBoundedRequestBody(request, getAnalysisMaxRequestBytes());
    if (!body.ok) return jsonError("Request body is too large.", 413);
    payload = JSON.parse(body.text) as unknown;
  } catch {
    return jsonError("Invalid JSON request body.", 400);
  }

  const validation = validateAnalyzeRequest(payload);
  if (!validation.ok) return NextResponse.json<AnalyzeErrorResponse>({ error: validation.error, fieldErrors: validation.fieldErrors }, { status: 400, headers: NO_STORE_HEADERS });

  const secretHash = hashApiKey(token);
  let quota: QuotaRow | undefined;
  let reservationId: string | undefined;
  try {
    const config = getAnalysisConfig();
    enforceAiRateLimit(request, config);
    const { data: quotaData, error: quotaError } = await admin.rpc("reserve_account_api_quota", {
      p_secret_hash: secretHash,
    });
    if (quotaError) return jsonError("API quota validation is temporarily unavailable.", 503);

    quota = (quotaData as QuotaRow[] | null)?.[0];
    if (!quota) return jsonError("API key validation is temporarily unavailable.", 503);
    if (quota.operation_status !== "reserved" || !quota.reservation_id) {
      return apiKeyStatusError(quota.operation_status);
    }
    reservationId = quota.reservation_id;
    const analysis = await withAnalysisCapacity(config, () => analyzeEmail(validation.input, { config }));
    const finalized = await applyReservationOperation(
      admin,
      "finalize_account_api_quota",
      reservationId,
    );
    if (!finalized) throw new QuotaFinalizationError("API quota finalization failed.");
    reservationId = undefined;

    return NextResponse.json<AnalyzeResponse>({
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
    }, {
      headers: {
        ...NO_STORE_HEADERS,
        "X-RateLimit-Limit": String(quota.monthly_quota ?? 0),
        "X-RateLimit-Remaining": String(Math.max(0, (quota.monthly_quota ?? 0) - (quota.request_count ?? 0))),
      },
    });
  } catch (error) {
    if (reservationId && !await applyReservationOperation(
      admin,
      "refund_account_api_quota",
      reservationId,
    )) {
      return jsonError("Analysis failed and API quota could not be restored automatically.", 503);
    }
    if (error instanceof QuotaFinalizationError) {
      return jsonError("Analysis could not be finalized. API quota was restored.", 503);
    }
    if (error instanceof RateLimitError) return jsonError(error.message, 429, { "Retry-After": String(error.retryAfterSeconds) });
    if (error instanceof AnalysisCapacityError) return jsonError(error.message, 429, { "Retry-After": "5" });
    if (error instanceof AnalysisConfigError) return jsonError(error.message, 500);
    if (error instanceof AiProviderRequestError || error instanceof AiResponseValidationError) return jsonError(error.message, 502);
    return jsonError("Analysis failed unexpectedly. API quota was restored.", 500);
  }
}

async function applyReservationOperation(
  admin: AdminClient,
  operation: "finalize_account_api_quota" | "refund_account_api_quota",
  reservationId: string,
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await admin.rpc(operation, { p_reservation_id: reservationId });
    if (!error && data === true) return true;
  }
  return false;
}

function readPositiveInteger(name: string, fallback: number, maximum: number) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : fallback;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice(7).trim();
}

function secondsUntilNextMonth() {
  const now = new Date();
  const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return String(Math.max(1, Math.ceil((nextMonth - now.getTime()) / 1000)));
}

function apiKeyStatusError(status: string) {
  if (status === "exhausted") {
    return jsonError("Monthly account API quota exhausted.", 429, {
      "Retry-After": secondsUntilNextMonth(),
    });
  }
  if (status === "expired") return jsonError("API key has expired.", 401);
  if (status === "revoked") return jsonError("API key has been revoked.", 401);
  return jsonError("API key is invalid.", 401);
}

function jsonError(error: string, status: number, headers: HeadersInit = {}) {
  return NextResponse.json<AnalyzeErrorResponse>({ error }, { status, headers: { ...NO_STORE_HEADERS, ...headers } });
}
