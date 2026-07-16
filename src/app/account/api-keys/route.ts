import { NextResponse } from "next/server";

import {
  createApiKey,
  DEFAULT_API_KEY_LIFETIME_DAYS,
  DEFAULT_MONTHLY_API_QUOTA,
  getApiKeyExpiration,
  getApiKeyStatus,
  normalizeApiKeyLifetimeDays,
  normalizeApiKeyName,
  type AccountApiUsage,
  type PublicApiKey,
} from "@/lib/api-keys";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasAal2Session } from "@/lib/auth/mfa";
import {
  ACCOUNT_API_KEY_MAX_REQUEST_BYTES,
  hasRequestContentType,
  isStrictSameOriginMutation,
  readBoundedRequestBody,
} from "@/lib/security/account-request";
import { areAccountsEnabled } from "@/lib/accounts/config";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-cache, no-store, max-age=0" };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RpcKeyRow = {
  created_at: string | null;
  expires_at: string | null;
  id: string | null;
  key_prefix: string | null;
  monthly_quota: number | null;
  name: string | null;
  operation_status: string;
  rotated_from_id: string | null;
};

export async function GET() {
  if (!areAccountsEnabled()) return disabledResponse();
  const context = await getAccountContext();
  if (!context) return errorResponse("Authentication required.", 401);
  if (!(await hasAal2Session(context.client))) return errorResponse("Two-factor verification required.", 403);

  const periodStart = getCurrentPeriodStart();
  const [keysResult, limitResult, usageResult] = await Promise.all([
    context.client
      .from("api_keys")
      .select("id,name,key_prefix,monthly_quota,created_at,last_used_at,revoked_at,expires_at,rotated_from_id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false }),
    context.client
      .from("api_account_limits")
      .select("monthly_quota")
      .eq("user_id", context.userId)
      .maybeSingle(),
    context.client
      .from("api_account_usage_monthly")
      .select("request_count")
      .eq("user_id", context.userId)
      .eq("period_start", periodStart)
      .maybeSingle(),
  ]);

  if (keysResult.error || limitResult.error || usageResult.error) {
    return errorResponse("API keys are temporarily unavailable.", 503);
  }

  const keys: PublicApiKey[] = (keysResult.data ?? []).map((key) => ({
    created_at: key.created_at,
    expires_at: key.expires_at,
    id: key.id,
    key_prefix: key.key_prefix,
    last_used_at: key.last_used_at,
    monthly_quota: key.monthly_quota,
    name: key.name,
    revoked_at: key.revoked_at,
    rotated_from_id: key.rotated_from_id,
    status: getApiKeyStatus(key),
  }));
  const monthlyQuota = limitResult.data?.monthly_quota
    ?? keys[0]?.monthly_quota
    ?? DEFAULT_MONTHLY_API_QUOTA;
  const usage: AccountApiUsage = {
    monthly_quota: monthlyQuota,
    period_start: periodStart,
    request_count: usageResult.data?.request_count ?? 0,
  };

  return NextResponse.json({ keys, usage }, { headers: PRIVATE_HEADERS });
}

export async function POST(request: Request) {
  if (!areAccountsEnabled()) return disabledResponse();
  if (!isStrictSameOriginMutation(request)) {
    return errorResponse("Cross-origin API key creation is not allowed.", 403);
  }
  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) return invalidBodyResponse(bodyResult.reason);
  const body = bodyResult.body;
  const name = normalizeApiKeyName(body.name);
  const lifetimeDays = body.lifetimeDays === undefined
    ? DEFAULT_API_KEY_LIFETIME_DAYS
    : normalizeApiKeyLifetimeDays(body.lifetimeDays);
  if (!name) return errorResponse("Name must be between 1 and 50 characters.", 400);
  if (!lifetimeDays) return errorResponse("Choose a supported API key lifetime.", 400);

  const context = await getAccountContext();
  if (!context) return errorResponse("Authentication required.", 401);
  if (!(await hasAal2Session(context.client))) return errorResponse("Two-factor verification required.", 403);

  const key = createApiKey();
  const { data, error } = await context.admin.rpc("create_hosted_api_key", {
    p_expires_at: getApiKeyExpiration(lifetimeDays),
    p_key_prefix: key.prefix,
    p_name: name,
    p_secret_hash: key.secretHash,
    p_user_id: context.userId,
  });
  if (error) return errorResponse("API key creation failed.", 503);

  const result = (data as RpcKeyRow[] | null)?.[0];
  if (!result) return errorResponse("API key creation failed.", 503);
  if (result.operation_status !== "created") {
    return operationError(result.operation_status, "creation");
  }

  return NextResponse.json(
    { key: toCreatedKey(result), plaintext: key.plaintext },
    { status: 201, headers: PRIVATE_HEADERS },
  );
}

export async function PUT(request: Request) {
  if (!areAccountsEnabled()) return disabledResponse();
  if (!isStrictSameOriginMutation(request)) {
    return errorResponse("Cross-origin API key rotation is not allowed.", 403);
  }
  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) return invalidBodyResponse(bodyResult.reason);
  const body = bodyResult.body;
  const id = normalizeKeyId(body.id);
  const lifetimeDays = normalizeApiKeyLifetimeDays(body.lifetimeDays);
  if (!id) return errorResponse("A valid key id is required.", 400);
  if (!lifetimeDays) return errorResponse("Choose a supported API key lifetime.", 400);

  const context = await getAccountContext();
  if (!context) return errorResponse("Authentication required.", 401);
  if (!(await hasAal2Session(context.client))) return errorResponse("Two-factor verification required.", 403);

  const key = createApiKey();
  const { data, error } = await context.admin.rpc("rotate_hosted_api_key", {
    p_api_key_id: id,
    p_expires_at: getApiKeyExpiration(lifetimeDays),
    p_key_prefix: key.prefix,
    p_secret_hash: key.secretHash,
    p_user_id: context.userId,
  });
  if (error) return errorResponse("API key rotation failed.", 503);

  const result = (data as RpcKeyRow[] | null)?.[0];
  if (!result) return errorResponse("API key rotation failed.", 503);
  if (result.operation_status !== "rotated") {
    return operationError(result.operation_status, "rotation");
  }

  return NextResponse.json(
    { key: toCreatedKey(result), plaintext: key.plaintext },
    { headers: PRIVATE_HEADERS },
  );
}

export async function DELETE(request: Request) {
  if (!areAccountsEnabled()) return disabledResponse();
  if (!isStrictSameOriginMutation(request)) {
    return errorResponse("Cross-origin API key revocation is not allowed.", 403);
  }
  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) return invalidBodyResponse(bodyResult.reason);
  const body = bodyResult.body;
  const id = normalizeKeyId(body.id);
  if (!id) return errorResponse("A valid key id is required.", 400);

  const context = await getAccountContext();
  if (!context) return errorResponse("Authentication required.", 401);
  if (!(await hasAal2Session(context.client))) return errorResponse("Two-factor verification required.", 403);

  const { data, error } = await context.admin.rpc("revoke_hosted_api_key", {
    p_api_key_id: id,
    p_user_id: context.userId,
  });
  if (error) return errorResponse("API key revocation failed.", 503);
  if (data === "not_found") return errorResponse("API key not found.", 404);

  return NextResponse.json({ revoked: true }, { headers: PRIVATE_HEADERS });
}

async function getAccountContext() {
  const supabase = await createServerSupabaseClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { admin, client: supabase, userId: data.user.id };
}

type JsonBodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; reason: "invalid" | "too_large" };

async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  if (!hasRequestContentType(request, "application/json")) {
    return { ok: false, reason: "invalid" };
  }

  try {
    const rawBody = await readBoundedRequestBody(request, ACCOUNT_API_KEY_MAX_REQUEST_BYTES);
    if (!rawBody.ok) return { ok: false, reason: "too_large" };
    const body = JSON.parse(rawBody.text) as unknown;
    return typeof body === "object" && body !== null
      ? { ok: true, body: body as Record<string, unknown> }
      : { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

function normalizeKeyId(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function getCurrentPeriodStart(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function toCreatedKey(row: RpcKeyRow) {
  return {
    created_at: row.created_at,
    expires_at: row.expires_at,
    id: row.id,
    key_prefix: row.key_prefix,
    monthly_quota: row.monthly_quota,
    name: row.name,
    rotated_from_id: row.rotated_from_id,
  };
}

function operationError(status: string, operation: "creation" | "rotation") {
  if (status === "active_limit") {
    return errorResponse("The maximum number of active API keys has been reached.", 409);
  }
  if (status === "throttled") {
    return errorResponse("Too many API key changes. Try again later.", 429, { "Retry-After": "86400" });
  }
  if (status === "not_found") return errorResponse("API key not found.", 404);
  if (["revoked", "expired", "already_rotated"].includes(status)) {
    return errorResponse(`This API key cannot be used for ${operation}.`, 409);
  }
  if (status === "invalid") return errorResponse("Invalid API key request.", 400);
  return errorResponse(`API key ${operation} failed.`, 503);
}

function errorResponse(error: string, status: number, headers: HeadersInit = {}) {
  return NextResponse.json({ error }, { status, headers: { ...PRIVATE_HEADERS, ...headers } });
}

function disabledResponse() {
  return new NextResponse("Not found.", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

function invalidBodyResponse(reason: "invalid" | "too_large") {
  return reason === "too_large"
    ? errorResponse("Request body is too large.", 413)
    : errorResponse("Invalid JSON request body.", 400);
}
