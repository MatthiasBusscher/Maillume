import { NextResponse } from "next/server";

import {
  ACCOUNT_DELETE_MAX_REQUEST_BYTES,
  hasRecentAuthentication,
  hasRequestContentType,
  readBoundedRequestBody,
} from "@/lib/security/account-request";
import { createSupabaseAdminClient, getSupabaseAdminConfig } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requiresMfaChallenge } from "@/lib/auth/mfa";
import { getPublicAppOrigin } from "@/app/auth/callback/origin";
import { areAccountsEnabled } from "@/lib/accounts/config";
import { verifyAccountDeletionToken } from "@/lib/security/account-deletion-token";

export async function POST(request: Request) {
  if (!areAccountsEnabled()) {
    return privateResponse("Not found.", 404);
  }
  const publicOrigin = getPublicAppOrigin({
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("host"),
    requestUrl: request.url,
  });

  if (!hasRequestContentType(request, "application/x-www-form-urlencoded")) {
    return privateResponse("Invalid account deletion request.", 415);
  }

  const rawBody = await readBoundedRequestBody(request, ACCOUNT_DELETE_MAX_REQUEST_BYTES);
  if (!rawBody.ok) {
    return privateResponse("Account deletion request body is too large.", 413);
  }

  const formData = new URLSearchParams(rawBody.text);

  if (formData.get("confirm") !== "delete") {
    return privateRedirect(new URL("/account?error=confirmation_required", publicOrigin));
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return privateRedirect(new URL("/auth/sign-in", publicOrigin));
  }

  const { data, error: userError } = await supabase.auth.getUser();

  if (userError || !data.user) {
    return privateRedirect(new URL("/auth/sign-in", publicOrigin));
  }

  const adminConfig = getSupabaseAdminConfig();
  if (!adminConfig) {
    return privateRedirect(new URL("/account?error=deletion_unavailable", publicOrigin));
  }

  if (!verifyAccountDeletionToken(
    formData.get("csrf"),
    { userId: data.user.id, lastSignInAt: data.user.last_sign_in_at },
    adminConfig.secretKey,
  )) {
    return privateResponse("Invalid account deletion request.", 403);
  }

  if (await requiresMfaChallenge(supabase)) {
    const challengeUrl = new URL("/auth/mfa", publicOrigin);
    challengeUrl.searchParams.set("next", "/account");
    return privateRedirect(challengeUrl);
  }

  if (!hasRecentAuthentication(data.user.last_sign_in_at)) {
    return privateRedirect(new URL("/account?error=recent_auth_required", publicOrigin));
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return privateRedirect(new URL("/account?error=deletion_unavailable", publicOrigin));

  const { error: deletionError } = await admin.auth.admin.deleteUser(data.user.id);

  if (deletionError) {
    return privateRedirect(new URL("/account?error=deletion_failed", publicOrigin));
  }

  await supabase.auth.signOut({ scope: "local" });
  return privateRedirect(new URL("/auth/sign-in?deleted=1", publicOrigin));
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
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
}
