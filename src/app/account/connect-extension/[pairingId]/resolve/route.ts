import { NextResponse } from "next/server";

import { getPublicAppOrigin } from "@/app/auth/callback/origin";
import {
  isExtensionPairingId,
  normalizeExtensionPairingUserCode,
} from "@/lib/extension-pairing";
import { isSiteLocale, localizePath } from "@/lib/i18n/site-locale";
import {
  hasRequestContentType,
  isStrictSameOriginMutation,
  readBoundedRequestBody,
} from "@/lib/security/account-request";
import { verifyAccountMutationToken } from "@/lib/security/account-mutation-token";
import { createSupabaseAdminClient, getSupabaseAdminConfig } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PAIRING_RESOLUTION_MAX_REQUEST_BYTES = 512;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pairingId: string }> },
) {
  const publicOrigin = getPublicAppOrigin({
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("host"),
    requestUrl: request.url,
  });
  if (
    !hasRequestContentType(request, "application/x-www-form-urlencoded")
    || !isStrictSameOriginMutation(request, publicOrigin)
  ) {
    return privateResponse("Invalid browser connection request.", 403);
  }

  const rawBody = await readBoundedRequestBody(request, PAIRING_RESOLUTION_MAX_REQUEST_BYTES);
  if (!rawBody.ok) return privateResponse("Browser connection request is too large.", 413);
  const formData = new URLSearchParams(rawBody.text);
  const { pairingId } = await params;
  const userCode = normalizeExtensionPairingUserCode(formData.get("code"));
  const requestedLocale = formData.get("locale");
  const locale = isSiteLocale(requestedLocale) ? requestedLocale : "en";
  const decision = formData.get("decision");
  if (
    !isExtensionPairingId(pairingId)
    || !userCode
    || (decision !== "approve" && decision !== "deny")
  ) {
    return privateResponse("Invalid browser connection request.", 400);
  }

  const pageUrl = new URL(
    localizePath(`/account/connect-extension/${encodeURIComponent(pairingId)}`, locale),
    publicOrigin,
  );
  pageUrl.searchParams.set("code", userCode);
  const supabase = await createServerSupabaseClient();
  const { data, error: userError } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null }, error: new Error("Authentication unavailable") };
  if (userError || !data.user || !supabase) {
    const signInUrl = new URL(localizePath("/auth/sign-in", locale), publicOrigin);
    signInUrl.searchParams.set("next", `${pageUrl.pathname}${pageUrl.search}`);
    return privateRedirect(signInUrl);
  }
  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (
    !assuranceError
    && assurance?.currentLevel === "aal1"
    && assurance.nextLevel === "aal2"
  ) {
    const mfaUrl = new URL(localizePath("/auth/mfa", locale), publicOrigin);
    mfaUrl.searchParams.set("next", `${pageUrl.pathname}${pageUrl.search}`);
    return privateRedirect(mfaUrl);
  }
  if (assuranceError || assurance?.currentLevel !== "aal2") {
    return privateRedirect(withResult(pageUrl, "mfa_required"));
  }

  const admin = createSupabaseAdminClient();
  const adminConfig = getSupabaseAdminConfig();
  if (
    !admin
    || !adminConfig
    || !verifyAccountMutationToken(
      "extension-pairing",
      formData.get("csrf"),
      { userId: data.user.id, lastSignInAt: data.user.last_sign_in_at },
      adminConfig.secretKey,
    )
  ) {
    return privateResponse("Invalid browser connection request.", 403);
  }

  const { data: resolution, error: resolutionError } = await admin.rpc(
    "resolve_extension_pairing",
    {
      p_approved: decision === "approve",
      p_pairing_id: pairingId,
      p_user_code: userCode,
      p_user_id: data.user.id,
    },
  );
  if (resolutionError) {
    return privateRedirect(withResult(pageUrl, "unavailable"));
  }
  const result = typeof resolution === "string" ? resolution : "unavailable";
  if (result === "approved" || result === "denied") {
    return privateRedirect(withResult(pageUrl, result));
  }
  if (result === "expired" || result === "invalid") {
    return privateRedirect(withResult(pageUrl, result));
  }
  return privateRedirect(withResult(pageUrl, "unavailable"));
}

function withResult(url: URL, result: string) {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("result", result);
  return nextUrl;
}

function privateRedirect(url: URL) {
  const response = NextResponse.redirect(url, 303);
  applyPrivateHeaders(response);
  return response;
}

function privateResponse(message: string, status: number) {
  const response = new NextResponse(message, { status });
  applyPrivateHeaders(response);
  return response;
}

function applyPrivateHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
}
