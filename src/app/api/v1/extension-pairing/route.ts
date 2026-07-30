import { NextResponse } from "next/server";

import { getPublicAppOrigin } from "@/app/auth/callback/origin";
import { enforceRequestRateLimit, RateLimitError } from "@/lib/analysis/rate-limit";
import { areAccountsEnabled } from "@/lib/accounts/config";
import {
  createApiKey,
} from "@/lib/api-keys";
import {
  evaluateExtensionCompatibility,
  getExtensionResponseHeaders,
  MINIMUM_PAIRING_EXTENSION_VERSION,
} from "@/lib/extension-compatibility";
import {
  createExtensionPairingCredentials,
  EXTENSION_PAIRING_MAX_REQUEST_BYTES,
  EXTENSION_PAIRING_POLL_SECONDS,
  EXTENSION_PAIRING_TTL_SECONDS,
  getPairingVerificationPath,
  hashExtensionBrowserConnectionId,
  hashExtensionPairingDeviceCode,
  isExtensionPairingDeviceCode,
  isExtensionPairingId,
  normalizeExtensionPairingRequest,
} from "@/lib/extension-pairing";
import {
  hasRequestContentType,
  readBoundedRequestBody,
} from "@/lib/security/account-request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  ...getExtensionResponseHeaders(),
};
const START_LIMIT = 5;
const REDEEM_LIMIT = 40;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;

type CreatePairingRow = {
  expires_at: string | null;
  id: string | null;
  operation_status: string;
  user_code: string | null;
};

type RedeemPairingRow = {
  created_at: string | null;
  credential_kind: string | null;
  expires_at: string | null;
  id: string | null;
  inactive_after: string | null;
  key_prefix: string | null;
  monthly_quota: number | null;
  name: string | null;
  operation_status: string;
  rotated_from_id: string | null;
};

export async function POST(request: Request) {
  if (!areAccountsEnabled()) return notFound();
  const compatibility = evaluateExtensionCompatibility(request.headers, {
    minimumVersion: MINIMUM_PAIRING_EXTENSION_VERSION,
  });
  if (!compatibility.compatible) return upgradeRequired(compatibility.reason);

  try {
    enforceRequestRateLimit(request, {
      bucketName: "extension-pairing-start",
      maxRequests: START_LIMIT,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonError("Too many browser connection attempts. Try again later.", 429, {
        "Retry-After": String(error.retryAfterSeconds),
      });
    }
    throw error;
  }

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) return invalidBodyResponse(bodyResult.reason);
  const pairingRequest = normalizeExtensionPairingRequest(bodyResult.body);
  if (!pairingRequest) return jsonError("Invalid browser connection request.", 400);

  const admin = createSupabaseAdminClient();
  if (!admin) return jsonError("Browser connection is not configured.", 503);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const credentials = createExtensionPairingCredentials();
    const browserConnectionHash = pairingRequest.browserConnectionId
      ? hashExtensionBrowserConnectionId(pairingRequest.browserConnectionId)
      : credentials.deviceCodeHash;
    const { data, error } = await admin.rpc("create_extension_pairing_v2", {
      p_browser_connection_hash: browserConnectionHash,
      p_device_code_hash: credentials.deviceCodeHash,
      p_extension_id: compatibility.client.extensionId,
      p_extension_version: compatibility.client.extensionVersion,
      p_locale: pairingRequest.locale,
      p_requested_lifetime_days: pairingRequest.lifetimeDays,
      p_requested_name: pairingRequest.name,
      p_user_code: credentials.userCode,
    });
    if (error) return jsonError("Browser connection could not be started.", 503);
    const result = (data as CreatePairingRow[] | null)?.[0];
    if (!result) return jsonError("Browser connection could not be started.", 503);
    if (result.operation_status === "conflict") continue;
    if (result.operation_status !== "created" || !result.id || !result.user_code || !result.expires_at) {
      return jsonError("Invalid browser connection request.", 400);
    }

    const publicOrigin = getPublicAppOrigin({
      configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      forwardedHost: request.headers.get("x-forwarded-host"),
      forwardedProto: request.headers.get("x-forwarded-proto"),
      host: request.headers.get("host"),
      requestUrl: request.url,
    });
    const verificationUrl = new URL(
      getPairingVerificationPath(result.id, result.user_code.trim(), pairingRequest.locale),
      publicOrigin,
    );

    return NextResponse.json({
      device_code: credentials.deviceCode,
      expires_at: result.expires_at,
      expires_in: EXTENSION_PAIRING_TTL_SECONDS,
      interval: EXTENSION_PAIRING_POLL_SECONDS,
      pairing_id: result.id,
      user_code: result.user_code.trim(),
      verification_uri_complete: verificationUrl.toString(),
    }, {
      status: 201,
      headers: PRIVATE_HEADERS,
    });
  }

  return jsonError("Browser connection could not be started.", 503);
}

export async function PUT(request: Request) {
  if (!areAccountsEnabled()) return notFound();
  const compatibility = evaluateExtensionCompatibility(request.headers, {
    minimumVersion: MINIMUM_PAIRING_EXTENSION_VERSION,
  });
  if (!compatibility.compatible) return upgradeRequired(compatibility.reason);

  try {
    enforceRequestRateLimit(request, {
      bucketName: "extension-pairing-redeem",
      maxRequests: REDEEM_LIMIT,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonError("Browser connection polling is temporarily limited.", 429, {
        "Retry-After": String(error.retryAfterSeconds),
      });
    }
    throw error;
  }

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) return invalidBodyResponse(bodyResult.reason);
  const body = bodyResult.body;
  const pairingId = typeof body.pairingId === "string" && isExtensionPairingId(body.pairingId)
    ? body.pairingId
    : null;
  const deviceCode = typeof body.deviceCode === "string" && isExtensionPairingDeviceCode(body.deviceCode)
    ? body.deviceCode
    : null;
  if (!pairingId || !deviceCode) return jsonError("Invalid browser connection redemption.", 400);

  const admin = createSupabaseAdminClient();
  if (!admin) return jsonError("Browser connection is not configured.", 503);
  const key = createApiKey();
  const { data, error } = await admin.rpc("redeem_extension_pairing_v2", {
    p_device_code_hash: hashExtensionPairingDeviceCode(deviceCode),
    p_key_prefix: key.prefix,
    p_pairing_id: pairingId,
    p_secret_hash: key.secretHash,
  });
  if (error) return jsonError("Browser connection could not be completed.", 503);

  const result = (data as RedeemPairingRow[] | null)?.[0];
  if (!result) return jsonError("Browser connection could not be completed.", 503);
  if (result.operation_status === "pending") {
    return NextResponse.json({ status: "authorization_pending" }, {
      status: 202,
      headers: { ...PRIVATE_HEADERS, "Retry-After": String(EXTENSION_PAIRING_POLL_SECONDS) },
    });
  }
  if (result.operation_status === "denied") return jsonError("Browser connection was denied.", 403);
  if (result.operation_status === "expired") return jsonError("Browser connection request expired.", 410);
  if (result.operation_status === "redeemed") return jsonError("Browser connection request was already used.", 409);
  if (result.operation_status === "active_limit") {
    return jsonError("The account already has five connected browsers.", 409);
  }
  if (result.operation_status === "throttled") {
    return jsonError("Too many API key changes. Try again later.", 429, { "Retry-After": "86400" });
  }
  if (
    result.operation_status !== "created"
    || !result.id
    || !result.name
    || !result.key_prefix
    || !result.created_at
    || !result.expires_at
    || result.credential_kind !== "browser"
    || !result.inactive_after
  ) {
    return jsonError("Browser connection request is invalid.", 404);
  }

  return NextResponse.json({
    key: {
      created_at: result.created_at,
      credential_kind: result.credential_kind,
      expires_at: result.expires_at,
      id: result.id,
      inactive_after: result.inactive_after,
      key_prefix: result.key_prefix,
      monthly_quota: result.monthly_quota,
      name: result.name,
      rotated_from_id: result.rotated_from_id,
    },
    plaintext: key.plaintext,
    status: "connected",
  }, {
    status: 201,
    headers: PRIVATE_HEADERS,
  });
}

async function readJsonBody(request: Request): Promise<
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; reason: "invalid" | "too_large" }
> {
  if (!hasRequestContentType(request, "application/json")) {
    return { ok: false, reason: "invalid" };
  }
  try {
    const rawBody = await readBoundedRequestBody(request, EXTENSION_PAIRING_MAX_REQUEST_BYTES);
    if (!rawBody.ok) return { ok: false, reason: "too_large" };
    const body = JSON.parse(rawBody.text) as unknown;
    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? { ok: true, body: body as Record<string, unknown> }
      : { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

function upgradeRequired(reason: string) {
  return NextResponse.json({
    error: "Update the official Maillume extension before connecting this browser.",
    code: reason === "upgrade_required" ? "extension_upgrade_required" : "extension_incompatible",
    minimum_extension_version: MINIMUM_PAIRING_EXTENSION_VERSION,
  }, {
    status: 426,
    headers: PRIVATE_HEADERS,
  });
}

function invalidBodyResponse(reason: "invalid" | "too_large") {
  return reason === "too_large"
    ? jsonError("Request body is too large.", 413)
    : jsonError("Invalid JSON request body.", 400);
}

function jsonError(error: string, status: number, headers: HeadersInit = {}) {
  return NextResponse.json({ error }, {
    status,
    headers: { ...PRIVATE_HEADERS, ...headers },
  });
}

function notFound() {
  return new NextResponse("Not found.", {
    status: 404,
    headers: PRIVATE_HEADERS,
  });
}
