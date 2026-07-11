import { NextResponse } from "next/server";

import {
  createApiKey,
  DEFAULT_MONTHLY_API_QUOTA,
  MAX_API_KEYS_PER_USER,
  normalizeApiKeyName,
  type PublicApiKey,
} from "@/lib/api-keys";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-cache, no-store, max-age=0" };

export async function GET() {
  const context = await getAccountContext();
  if (!context) return errorResponse("Authentication required.", 401);

  const { data, error } = await context.admin
    .from("api_keys")
    .select("id,name,key_prefix,monthly_quota,created_at,last_used_at,revoked_at,api_usage_monthly(request_count,period_start)")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false });

  if (error) return errorResponse("API keys are temporarily unavailable.", 503);

  const periodStart = new Date().toISOString().slice(0, 7);
  const keys: PublicApiKey[] = (data ?? []).map((key) => ({
    created_at: key.created_at,
    id: key.id,
    key_prefix: key.key_prefix,
    last_used_at: key.last_used_at,
    monthly_quota: key.monthly_quota,
    name: key.name,
    revoked_at: key.revoked_at,
    usage: (key.api_usage_monthly ?? []).find((row) => row.period_start.startsWith(periodStart))?.request_count ?? 0,
  }));

  return NextResponse.json({ keys }, { headers: PRIVATE_HEADERS });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return errorResponse("Cross-origin API key creation is not allowed.", 403);
  const context = await getAccountContext();
  if (!context) return errorResponse("Authentication required.", 401);

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON request body.", 400); }
  const name = normalizeApiKeyName((body as { name?: unknown } | null)?.name);
  if (!name) return errorResponse("Name must be between 1 and 50 characters.", 400);

  const { count, error: countError } = await context.admin
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.userId)
    .is("revoked_at", null);
  if (countError) return errorResponse("API key creation is temporarily unavailable.", 503);
  if ((count ?? 0) >= MAX_API_KEYS_PER_USER) return errorResponse(`A maximum of ${MAX_API_KEYS_PER_USER} active keys is allowed.`, 409);

  const key = createApiKey();
  const { data, error } = await context.admin.from("api_keys").insert({
    key_prefix: key.prefix,
    monthly_quota: DEFAULT_MONTHLY_API_QUOTA,
    name,
    secret_hash: key.secretHash,
    user_id: context.userId,
  }).select("id,name,key_prefix,monthly_quota,created_at").single();

  if (error) return errorResponse("API key creation failed.", 503);
  return NextResponse.json({ key: data, plaintext: key.plaintext }, { status: 201, headers: PRIVATE_HEADERS });
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return errorResponse("Cross-origin API key revocation is not allowed.", 403);
  const context = await getAccountContext();
  if (!context) return errorResponse("Authentication required.", 401);

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON request body.", 400); }
  const id = (body as { id?: unknown } | null)?.id;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return errorResponse("A valid key id is required.", 400);

  const { error } = await context.admin.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("user_id", context.userId).is("revoked_at", null);
  if (error) return errorResponse("API key revocation failed.", 503);
  return NextResponse.json({ revoked: true }, { headers: PRIVATE_HEADERS });
}

async function getAccountContext() {
  const supabase = await createServerSupabaseClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { admin, userId: data.user.id };
}

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: PRIVATE_HEADERS });
}
