import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPublicAppOrigin } from "@/app/auth/callback/origin";
import {
  hasRequestContentType,
  isStrictSameOriginMutation,
  readBoundedRequestBody,
} from "@/lib/security/account-request";
import { areAccountsEnabled } from "@/lib/accounts/config";
import {
  isAuthorizedAccountMutation,
  isAccountMutationTokenCandidate,
} from "@/lib/security/account-mutation-token";
import { getSupabaseAdminConfig } from "@/lib/supabase/admin";

const SIGN_OUT_MAX_REQUEST_BYTES = 128;

export async function POST(request: Request) {
  const publicOrigin = getPublicAppOrigin({
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("host"),
    requestUrl: request.url,
  });

  if (!hasRequestContentType(request, "application/x-www-form-urlencoded")) {
    return privateResponse("Invalid sign-out request.", 415);
  }
  const body = await readBoundedRequestBody(request, SIGN_OUT_MAX_REQUEST_BYTES);
  if (!body.ok) {
    return privateResponse("Sign-out request body is too large.", 413);
  }
  const formData = new URLSearchParams(body.text);
  const originIsValid = isStrictSameOriginMutation(request, publicOrigin);
  if (!originIsValid && !isAccountMutationTokenCandidate(formData.get("csrf"))) {
    return privateResponse("Cross-origin sign-out is not allowed.", 403);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return privateResponse("Sign-out is temporarily unavailable.", 503);
  }

  const { data, error: userError } = await supabase.auth.getUser();
  const adminConfig = getSupabaseAdminConfig();
  const mutationIsAuthorized = Boolean(data.user && isAuthorizedAccountMutation({
    action: "sign-out",
    input: { userId: data.user.id, lastSignInAt: data.user.last_sign_in_at },
    sameOrigin: originIsValid,
    secret: adminConfig?.secretKey,
    token: formData.get("csrf"),
  }));

  if (!mutationIsAuthorized) {
    return privateResponse("Cross-origin sign-out is not allowed.", 403);
  }

  if (userError || !data.user) {
    return privateRedirect(new URL("/auth/sign-in", publicOrigin));
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
  if (signOutError) {
    return privateResponse("Sign-out could not be completed.", 503);
  }

  const response = NextResponse.redirect(
    new URL(areAccountsEnabled() ? "/auth/sign-in" : "/app", publicOrigin),
    303,
  );
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function privateResponse(message: string, status: number) {
  const response = new NextResponse(message, { status });
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function privateRedirect(url: URL) {
  const response = NextResponse.redirect(url, 303);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}
