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
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  api_key_id: string;
  monthly_quota: number;
  owner_id: string;
  request_count: number;
};

export async function POST(request: Request) {
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

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > getAnalysisMaxRequestBytes()) return jsonError("Request body is too large.", 413);

  let payload: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > getAnalysisMaxRequestBytes()) return jsonError("Request body is too large.", 413);
    payload = JSON.parse(raw) as unknown;
  } catch {
    return jsonError("Invalid JSON request body.", 400);
  }

  const validation = validateAnalyzeRequest(payload);
  if (!validation.ok) return NextResponse.json<AnalyzeErrorResponse>({ error: validation.error, fieldErrors: validation.fieldErrors }, { status: 400, headers: NO_STORE_HEADERS });

  const secretHash = hashApiKey(token);
  let quota: QuotaRow | undefined;
  let reservedApiKeyId: string | undefined;
  try {
    const config = getAnalysisConfig();
    enforceAiRateLimit(request, config);
    const { data: quotaData, error: quotaError } = await admin.rpc("consume_api_quota", { p_secret_hash: secretHash });
    if (quotaError) return jsonError("API quota validation is temporarily unavailable.", 503);

    quota = (quotaData as QuotaRow[] | null)?.[0];
    if (!quota) {
      const { data: existing } = await admin.from("api_keys").select("id").eq("secret_hash", secretHash).is("revoked_at", null).maybeSingle();
      return existing ? jsonError("Monthly API quota exhausted.", 429, { "Retry-After": secondsUntilNextMonth() }) : jsonError("API key is invalid or revoked.", 401);
    }
    reservedApiKeyId = quota.api_key_id;
    const analysis = await withAnalysisCapacity(config, () => analyzeEmail(validation.input, { config }));

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
        "X-RateLimit-Limit": String(quota.monthly_quota),
        "X-RateLimit-Remaining": String(Math.max(0, quota.monthly_quota - quota.request_count)),
      },
    });
  } catch (error) {
    if (reservedApiKeyId) await admin.rpc("refund_api_quota", { p_api_key_id: reservedApiKeyId });
    if (error instanceof RateLimitError) return jsonError(error.message, 429, { "Retry-After": String(error.retryAfterSeconds) });
    if (error instanceof AnalysisCapacityError) return jsonError(error.message, 429, { "Retry-After": "5" });
    if (error instanceof AnalysisConfigError) return jsonError(error.message, 500);
    if (error instanceof AiProviderRequestError || error instanceof AiResponseValidationError) return jsonError(error.message, 502);
    throw error;
  }
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

function jsonError(error: string, status: number, headers: HeadersInit = {}) {
  return NextResponse.json<AnalyzeErrorResponse>({ error }, { status, headers: { ...NO_STORE_HEADERS, ...headers } });
}
